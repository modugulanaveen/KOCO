import { PF_CONSTANTS, ECR_COLUMNS } from "../constants/pfConstants";
import { formatECRNumber } from "./pfCalculator";
import * as XLSX from 'xlsx';

/**
 * Format PF data to ECR text line (14 fields for EPFO compliance)
 * Format: UAN#~#NAME#~#GROSS_WAGES#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#EDLI#~#ADMIN_CHARGE#~#EDLI_ADMIN#~#NCP_DAYS#~#REFUND_ADVANCES
 * @param {Object} pfRecord - PF record object
 * @returns {string} ECR formatted line
 */
export function formatToECRLine(pfRecord) {
  const {
    uan = "",
    name = "",
    grossWages = 0,
    epfWages = 0,
    epsWages = 0,
    edliWages = 0,
    epfEe = 0,
    eps = 0,
    epfEr = 0,
    edli = 0,
    adminCharge = 0,
    edliAdminCharge = 0,
    ncpDays = 0,
    refundAdvances = 0,
  } = pfRecord;

  return [
    uan.toString().trim(),
    name.toString().trim().toUpperCase(),
    formatECRNumber(grossWages),
    formatECRNumber(epfWages),
    formatECRNumber(epsWages),
    formatECRNumber(edliWages),
    formatECRNumber(epfEe),
    formatECRNumber(eps),
    formatECRNumber(epfEr),
    formatECRNumber(edli),
    formatECRNumber(adminCharge),
    formatECRNumber(edliAdminCharge),
    formatECRNumber(ncpDays),
    formatECRNumber(refundAdvances),
  ].join(PF_CONSTANTS.ECR_SEPARATOR);
}

/**
 * Generate ECR text file content
 * @param {Array} pfDataArray - Array of PF records
 * @param {Object} companyInfo - Company information (optional)
 * @returns {string} ECR file content
 */
export function generateECRFileContent(pfDataArray, companyInfo = {}) {
  if (!Array.isArray(pfDataArray) || pfDataArray.length === 0) {
    return "# No PF data to export\n";
  }

  const lines = [];

  // Add company header if provided
  if (companyInfo && companyInfo.companyName) {
    lines.push(`# Company: ${companyInfo.companyName}`);
    if (companyInfo.address) {
      lines.push(`# Address: ${companyInfo.address}`);
    }
    if (companyInfo.panNumber) {
      lines.push(`# PAN: ${companyInfo.panNumber}`);
    }
    lines.push("# " + "=".repeat(80));
    lines.push(""); // blank line
  }

  // Add header with column names (commented)
  lines.push("# " + ECR_COLUMNS.join(" | "));
  lines.push("# " + "=".repeat(80));
  lines.push(""); // blank line

  // Add each record as ECR line
  pfDataArray.forEach((record, index) => {
    const slNo = (index + 1).toString();
    const recordWithSlNo = { ...record, slNo };
    lines.push(formatToECRLine(recordWithSlNo));
  });

  return lines.join("\n");
}

/**
 * Parse ECR line to PF record
 * @param {string} ecrLine - ECR formatted line
 * @returns {Object} PF record object
 */
export function parseECRLine(ecrLine) {
  const parts = ecrLine.split(PF_CONSTANTS.ECR_SEPARATOR);

  if (parts.length < 11) {
    throw new Error("Invalid ECR format. Expected at least 11 fields.");
  }

  return {
    uan: parts[0].trim(),
    name: parts[1].trim(),
    grossWages: parseFloat(parts[2]) || 0,
    epfWages: parseFloat(parts[3]) || 0,
    epsWages: parseFloat(parts[4]) || 0,
    edliWages: parseFloat(parts[5]) || 0,
    epfEE: parseFloat(parts[6]) || 0,
    eps: parseFloat(parts[7]) || 0,
    epfER: parseFloat(parts[8]) || 0,
    ncpDays: parseFloat(parts[9]) || 0,
    refundAdvances: parseFloat(parts[10]) || 0,
  };
}

/**
 * Create CSV content for Excel export
 * @param {Array} pfDataArray - Array of PF records
 * @param {Object} companyInfo - Company information
 * @returns {string} CSV content
 */
export function generateCSVContent(pfDataArray, companyInfo = {}) {
  const lines = [];

  // Add company header
  if (companyInfo && companyInfo.companyName) {
    lines.push(`Company,${companyInfo.companyName}`);
    if (companyInfo.address) {
      lines.push(`Address,${companyInfo.address}`);
    }
    if (companyInfo.panNumber) {
      lines.push(`PAN,${companyInfo.panNumber}`);
    }
    lines.push(""); // blank line
  }

  // Add header row (14 fields for EPFO compliance)
  const headers = ["Sl.No", "UAN", "Name", "Gross Wages", "EPF Wages", "EPS Wages", "EDLI Wages", "EPF EE", "EPS", "EPF ER", "EDLI", "Admin Charge", "EDLI Admin", "NCP Days", "Refund Advances"];
  lines.push(headers.map((h) => `"${h}"`).join(","));

  // Add data rows
  if (Array.isArray(pfDataArray)) {
    pfDataArray.forEach((record, index) => {
      const row = [
        index + 1,
        record.uan || "",
        record.name || "",
        record.grossWages || 0,
        record.epfWages || 0,
        record.epsWages || 0,
        record.edliWages || 0,
        record.epfEe || 0,
        record.eps || 0,
        record.epfEr || 0,
        record.edli || 0,
        record.adminCharge || 0,
        record.edliAdminCharge || 0,
        record.ncpDays || 0,
        record.refundAdvances || 0,
      ];
      lines.push(row.map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v)).join(","));
    });
  }

  return lines.join("\n");
}

/**
 * Parse CSV content to PF records
 * @param {string} csvContent - CSV file content
 * @returns {Array} Array of PF records
 */
export function parseCSVContent(csvContent) {
  const lines = csvContent.split("\n");
  const records = [];
  let dataStartIndex = 0;

  // Find where actual data starts (skip company headers)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Sl.No") || lines[i].includes("Sl No")) {
      dataStartIndex = i + 1;
      break;
    }
  }

  // Parse data rows (support both 12-field and 15-field formats)
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());

    if (cells.length >= 12) {
      // 15-field format (new)
      if (cells.length >= 15) {
        records.push({
          uan: cells[1],
          name: cells[2],
          grossWages: parseFloat(cells[3]) || 0,
          epfWages: parseFloat(cells[4]) || 0,
          epsWages: parseFloat(cells[5]) || 0,
          edliWages: parseFloat(cells[6]) || 0,
          epfEe: parseFloat(cells[7]) || 0,
          eps: parseFloat(cells[8]) || 0,
          epfEr: parseFloat(cells[9]) || 0,
          edli: parseFloat(cells[10]) || 0,
          adminCharge: parseFloat(cells[11]) || 0,
          edliAdminCharge: parseFloat(cells[12]) || 0,
          ncpDays: parseFloat(cells[13]) || 0,
          refundAdvances: parseFloat(cells[14]) || 0,
        });
      } else {
        // 12-field format (old) - backward compatibility
        records.push({
          uan: cells[1],
          name: cells[2],
          grossWages: parseFloat(cells[3]) || 0,
          epfWages: parseFloat(cells[4]) || 0,
          epsWages: parseFloat(cells[5]) || 0,
          edliWages: parseFloat(cells[6]) || 0,
          epfEe: parseFloat(cells[7]) || 0,
          eps: parseFloat(cells[8]) || 0,
          epfEr: parseFloat(cells[9]) || 0,
          edli: 0,  // Default to 0 for old format
          adminCharge: 0,  // Default to 0 for old format
          edliAdminCharge: 0,  // Default to 0 for old format
          ncpDays: parseFloat(cells[10]) || 0,
          refundAdvances: parseFloat(cells[11]) || 0,
        });
      }
    }
  }

  return records;
}

/**
 * Parse ECR content to PF records
 * @param {string} ecrContent - ECR file content
 * @returns {Array} Array of PF records
 */
export function parseECRContent(ecrContent) {
  const records = [];
  const lines = ecrContent.split("\n");

  for (let line of lines) {
    line = line.trim();
    
    // Skip empty lines and comment lines
    if (!line || line.startsWith("#")) continue;

    const parts = line.split(PF_CONSTANTS.ECR_SEPARATOR);
    
    // Support both 11-field (old) and 14-field (new) formats
    if (parts.length < 11) continue;

    try {
      // 14-field format (new)
      if (parts.length >= 14) {
        records.push({
          uan: parts[0].trim(),
          name: parts[1].trim(),
          grossWages: parseFloat(parts[2]) || 0,
          epfWages: parseFloat(parts[3]) || 0,
          epsWages: parseFloat(parts[4]) || 0,
          edliWages: parseFloat(parts[5]) || 0,
          epfEe: parseFloat(parts[6]) || 0,
          eps: parseFloat(parts[7]) || 0,
          epfEr: parseFloat(parts[8]) || 0,
          edli: parseFloat(parts[9]) || 0,
          adminCharge: parseFloat(parts[10]) || 0,
          edliAdminCharge: parseFloat(parts[11]) || 0,
          ncpDays: parseInt(parts[12]) || 0,
          refundAdvances: parseFloat(parts[13]) || 0,
          id: Date.now() + Math.random(),
        });
      } else {
        // 11-field format (old) - backward compatibility
        records.push({
          uan: parts[0].trim(),
          name: parts[1].trim(),
          grossWages: parseFloat(parts[2]) || 0,
          epfWages: parseFloat(parts[3]) || 0,
          epsWages: parseFloat(parts[4]) || 0,
          edliWages: parseFloat(parts[5]) || 0,
          epfEe: parseFloat(parts[6]) || 0,
          eps: parseFloat(parts[7]) || 0,
          epfEr: parseFloat(parts[8]) || 0,
          edli: 0,  // Default to 0 for old format
          adminCharge: 0,  // Default to 0 for old format
          edliAdminCharge: 0,  // Default to 0 for old format
          ncpDays: parseInt(parts[9]) || 0,
          refundAdvances: parseFloat(parts[10]) || 0,
          id: Date.now() + Math.random(),
        });
      }
    } catch (error) {
      console.warn("Failed to parse ECR line:", line, error);
    }
  }

  return records;
}

/**
 * Download ECR file
 * @param {string} content - File content
 * @param {string} filename - Filename for download
 */
export function downloadECRFile(content, filename = "ECR.txt") {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Download CSV file
 * @param {string} content - CSV content
 * @param {string} filename - Filename for download
 */
export function downloadCSVFile(content, filename = "PF_Data.csv") {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(content));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Parse Excel file (XLSX/XLS) to PF records
 * Supports both 12-field and 15-field formats
 * @param {ArrayBuffer} arrayBuffer - Excel file as array buffer
 * @returns {Array} Array of PF records
 */
export function parseExcelContent(arrayBuffer) {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const records = [];

    rows.forEach((row, index) => {
      // Skip header rows and empty rows
      if (!row.UAN && !row.uan && !row['Employee No'] && !row['Emp No']) {
        return;
      }

      try {
        // Handle different possible column names
        const uan = row.UAN || row.uan || row['Employee No'] || row['Emp No'] || '';
        const name = row.Name || row.name || row['Employee Name'] || row['Emp Name'] || '';
        
        // Skip if both UAN and name are empty
        if (!uan || !name) return;

        const record = {
          uan: uan.toString().trim(),
          name: name.toString().trim(),
          grossWages: parseFloat(row['Gross Wages'] || row['Gross'] || row.grossWages || 0) || 0,
          epfWages: parseFloat(row['EPF Wages'] || row['EPF'] || row.epfWages || 0) || 0,
          epsWages: parseFloat(row['EPS Wages'] || row['EPS'] || row.epsWages || 0) || 0,
          edliWages: parseFloat(row['EDLI Wages'] || row['EDLI'] || row.edliWages || 0) || 0,
          epfEe: parseFloat(row['EPF EE'] || row['Employee PF'] || row.epfEe || 0) || 0,
          eps: parseFloat(row.EPS || row.eps || 0) || 0,
          epfEr: parseFloat(row['EPF ER'] || row['Employer EPF'] || row.epfEr || 0) || 0,
          edli: parseFloat(row.EDLI || row.edli || 0) || 0,
          adminCharge: parseFloat(row['Admin Charge'] || row['Admin'] || row.adminCharge || 0) || 0,
          edliAdminCharge: parseFloat(row['EDLI Admin'] || row['EDLI Admin Charge'] || row.edliAdminCharge || 0) || 0,
          ncpDays: parseInt(row['NCP Days'] || row['NCP'] || row.ncpDays || 0) || 0,
          refundAdvances: parseFloat(row['Refund Advances'] || row['Refund'] || row.refundAdvances || 0) || 0,
          id: Date.now() + Math.random(),
        };

        records.push(record);
      } catch (error) {
        console.warn("Failed to parse Excel row:", row, error);
      }
    });

    return records;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}
