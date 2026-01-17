import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, FileSpreadsheet, Download, Check, X } from "lucide-react";

export default function CSVUpload({ employees = [], setEmployees, company }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fileName, setFileName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columnAnalysis, setColumnAnalysis] = useState({});
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [previewData, setPreviewData] = useState([]);

  // Clean and validate CSV data
  const cleanCSVData = (data) => {
    return data.filter(row => {
      // Remove rows that are comments/instructions
      if (!row || typeof row !== 'object') return false;
      
      // Get the first column value
      const firstCol = Object.values(row)[0];
      
      // Skip comment rows (starting with #)
      if (firstCol && typeof firstCol === 'string' && firstCol.trim().startsWith('#')) {
        return false;
      }
      
      // Skip instruction/header rows
      const rowStr = JSON.stringify(row).toLowerCase();
      if (rowStr.includes('instruction') || 
          rowStr.includes('template') || 
          rowStr.includes('required columns')) {
        return false;
      }
      
      // Check if this row has any actual data (not just empty or placeholder)
      const hasData = Object.values(row).some(value => {
        if (!value) return false;
        const strVal = value.toString().trim();
        // Skip placeholder values like "Not Provided"
        if (strVal === '' || 
            strVal === 'Not Provided' || 
            strVal === 'N/A' || 
            strVal === '-' ||
            strVal.includes('INSTRUCTION') ||
            strVal.includes('TEMPLATE')) {
          return false;
        }
        return true;
      });
      
      return hasData;
    });
  };

  // Clean headers - split concatenated headers
  const cleanHeaders = (headers) => {
    if (!headers || headers.length === 0) return [];
    
    return headers.map(header => {
      if (!header) return '';
      
      // Fix concatenated headers like "Basic Salary HRA" or "special al Gross Earn Income Tₑ"
      const commonSeparators = ['|', ';', '\\', '/', '&'];
      
      // Try to split by common separators
      for (const sep of commonSeparators) {
        if (header.includes(sep)) {
          return header.split(sep)[0].trim();
        }
      }
      
      // If header contains multiple words without separators, take first meaningful part
      const headerLower = header.toLowerCase();
      const knownPatterns = [
        'name', 'employee', 'id', 'period', 'date', 'day', 'basic', 'salary',
        'hra', 'gross', 'earnings', 'income', 'tax', 'provident', 'fund',
        'professional', 'total', 'deductions', 'net', 'pay', 'special',
        'allowance', 'conveyance', 'medical', 'bonus', 'overtime'
      ];
      
      for (const pattern of knownPatterns) {
        if (headerLower.includes(pattern)) {
          // Extract from start of header to the pattern + some buffer
          const patternIndex = headerLower.indexOf(pattern);
          if (patternIndex > 0) {
            // Check if there's another pattern before this one
            const beforePattern = headerLower.substring(0, patternIndex);
            const hasOtherPattern = knownPatterns.some(p => 
              p !== pattern && beforePattern.includes(p)
            );
            
            if (!hasOtherPattern) {
              // Take everything up to and including this pattern
              const endIndex = Math.min(
                patternIndex + pattern.length + 10, // Include some buffer
                header.length
              );
              return header.substring(0, endIndex).trim();
            }
          }
        }
      }
      
      return header.trim();
    });
  };

  // Enhanced patterns for Indian payroll
  const earningsPatterns = [
    'basic', 'salary', 'hra', 'house', 'rent', 'allowance', 'special', 'conveyance',
    'medical', 'education', 'lta', 'leave', 'travel', 'bonus', 'incentive',
    'overtime', 'shift', 'night', 'arrears', 'commission', 'performance',
    'allowences', 'children', 'gratuity', 'reimbursement', 'other', 'miscellaneous',
    'dearness', 'city', 'project', 'food', 'uniform', 'telephone', 'internet',
    'transport', 'car', 'driver', 'petrol', 'entertainment', 'newspaper', 'gift'
  ];

  const deductionsPatterns = [
    'tax', 'income', 'tds', 'pf', 'provident', 'fund', 'professional', 'pt',
    'esi', 'insurance', 'health', 'loan', 'advance', 'recovery',
    'deduction', 'other', 'labour', 'welfare', 'pension', 'gratuity', 'lic',
    'security', 'canteen', 'club', 'union', 'donation', 'contribution'
  ];

  // Special total fields
  const totalFields = [
    'gross', 'total', 'earnings', 'deductions', 'net', 'payable', 'earn'
  ];

  // Info fields (not part of calculations)
  const infoFields = [
    'name', 'employee', 'id', 'code', 'period', 'date', 'day', 'days', 
    'month', 'year', 'pay', 'department', 'designation', 'location',
    'account', 'bank', 'ifsc', 'pan', 'uan', 'esi number'
  ];

  const detectColumnType = (columnName) => {
    if (!columnName) return 'other';
    
    const col = columnName.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check if it's a total field FIRST (before other checks)
    if (totalFields.some(pattern => col.includes(pattern))) {
      return 'total';
    }
    
    // Check if it's a known deduction pattern BEFORE info fields
    if (deductionsPatterns.some(pattern => col.includes(pattern))) {
      // Check if it's actually a total field in disguise
      if (col.includes('total') || col.includes('net')) {
        return 'total';
      }
      return 'deduction';
    }
    
    // Check if it's an info field
    if (infoFields.some(pattern => col.includes(pattern))) {
      return 'info';
    }
    
    // Check for LOP and paid days
    if (col.includes('lop') || col.includes('loss') || 
        (col.includes('paid') && col.includes('day'))) {
      return 'info';
    }
    
    // Check if it's a known earnings pattern
    if (earningsPatterns.some(pattern => col.includes(pattern))) {
      // Special handling for "Basic Salary" which should always be earning
      if (col.includes('basic') || col.includes('salary')) {
        return 'earning';
      }
      // Check if it's actually a total field in disguise
      if (col.includes('total') || col.includes('gross')) {
        return 'total';
      }
      return 'earning';
    }
    
    // Default to other for unknown columns
    return 'other';
  };

  const analyzeHeaders = (csvHeaders) => {
    const analysis = {};
    const warnings = [];
    
    csvHeaders.forEach(header => {
      analysis[header] = detectColumnType(header);
    });
    
    // Check for required fields
    const hasName = csvHeaders.some(h => {
      const type = detectColumnType(h);
      return type === 'info' && h.toLowerCase().includes('name');
    });
    
    const hasEarnings = csvHeaders.some(h => detectColumnType(h) === 'earning');
    
    if (!hasName) {
      warnings.push("No 'Name' column found. Using placeholder names.");
    }
    
    if (!hasEarnings) {
      warnings.push("No earnings columns found. Check if Basic Salary column exists.");
    }
    
    setColumnAnalysis(analysis);
    setValidationWarnings(warnings);
    return analysis;
  };

  const extractLabelFromHeader = (header) => {
    if (!header) return '';
    
    // Clean the header first
    const cleanHeader = header
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single
      .trim();
    
    // Convert to proper label format
    const words = cleanHeader.split(/\s+/);
    return words.map(word => {
      if (word.length <= 2) return word.toUpperCase(); // Keep ID, PF, etc uppercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  };

  const parseNumber = (val) => {
    if (!val || val === '' || val === undefined || val === null) return 0;
    
    // Clean the value
    const cleaned = val.toString()
      .replace(/[₹,$,]/g, '') // Remove currency symbols and commas
      .replace(/\s+/g, '')
      .replace(/[^\d.-]/g, '') // Keep only numbers, dots, and minus
      .trim();
    
    // Handle empty result
    if (cleaned === '' || cleaned === '-') return 0;
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const processCSVColumns = (headers, row) => {
    const categories = {
      info: {},
      earnings: [],
      deductions: [],
      totals: {}
    };
    
    headers.forEach(header => {
      if (!header) return;
      
      const colType = detectColumnType(header);
      const value = row[header] || '';
      
      // Skip if value is clearly not data (instructions, etc)
      const strValue = value.toString().toLowerCase();
      if (strValue.includes('instruction') || 
          strValue.includes('template') || 
          strValue === 'not provided' ||
          strValue === 'n/a' ||
          strValue === '-') {
        return;
      }
      
      const amount = parseNumber(value);
      const label = extractLabelFromHeader(header);
      
      switch(colType) {
        case 'info':
          if (value && value.toString().trim() !== '') {
            categories.info[header.toLowerCase()] = value.toString().trim();
          }
          break;
          
        case 'earning':
          if (amount > 0 || label.toLowerCase().includes('basic')) {
            categories.earnings.push({
              label: label,
              amount: amount,
              originalHeader: header
            });
          }
          break;
          
        case 'deduction':
          if (amount > 0) {
            categories.deductions.push({
              label: label,
              amount: amount,
              originalHeader: header
            });
          }
          break;
          
        case 'total':
          if (amount > 0) {
            categories.totals[header.toLowerCase()] = amount;
          }
          break;
          
        default:
          // For unknown columns with positive amounts, assume they're earnings
          if (amount > 0) {
            categories.earnings.push({
              label: label,
              amount: amount,
              originalHeader: header,
              isUnknown: true
            });
          }
      }
    });
    
    return categories;
  };

  const calculatePayrollTotals = (categories) => {
    // Calculate from individual items
    const calculatedGross = categories.earnings.reduce((sum, e) => sum + e.amount, 0);
    const calculatedDeductions = categories.deductions.reduce((sum, d) => sum + d.amount, 0);
    const calculatedNet = calculatedGross - calculatedDeductions;
    
    // Get provided totals from CSV
    const providedGross = categories.totals['gross'] || 
                         categories.totals['gross earnings'] || 
                         categories.totals['total earnings'] || 0;
    
    const providedDeductions = categories.totals['total deductions'] || 
                             categories.totals['deductions'] || 
                             categories.totals['total deduction'] || 0;
    
    const providedNet = categories.totals['net'] || 
                       categories.totals['net pay'] || 
                       categories.totals['take home'] || 0;
    
    // Validate calculations (allow 1 rupee difference for rounding)
    const validation = {
      gross: {
        calculated: calculatedGross,
        provided: providedGross,
        difference: Math.abs(calculatedGross - providedGross),
        isValid: providedGross === 0 || Math.abs(calculatedGross - providedGross) < 1
      },
      deductions: {
        calculated: calculatedDeductions,
        provided: providedDeductions,
        difference: Math.abs(calculatedDeductions - providedDeductions),
        isValid: providedDeductions === 0 || Math.abs(calculatedDeductions - providedDeductions) < 1
      },
      net: {
        calculated: calculatedNet,
        provided: providedNet,
        difference: Math.abs(calculatedNet - providedNet),
        isValid: providedNet === 0 || Math.abs(calculatedNet - providedNet) < 1
      }
    };
    
    // Use provided totals if available and close to calculated, otherwise use calculated
    const finalGross = validation.gross.isValid && providedGross > 0 ? providedGross : calculatedGross;
    const finalDeductions = validation.deductions.isValid && providedDeductions > 0 ? providedDeductions : calculatedDeductions;
    const finalNet = validation.net.isValid && providedNet > 0 ? providedNet : calculatedNet;
    
    return {
      gross: finalGross,
      totalDeductions: finalDeductions,
      net: finalNet,
      validation: validation
    };
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date().toISOString().slice(0, 10);
    
    // Clean the date string
    const cleanDate = dateStr.toString().trim();
    
    // Try common Indian date formats
    const formats = [
      { regex: /(\d{2})[-/](\d{2})[-/](\d{4})/, handler: (match) => `${match[3]}-${match[2]}-${match[1]}` }, // DD-MM-YYYY
      { regex: /(\d{4})[-/](\d{2})[-/](\d{2})/, handler: (match) => `${match[1]}-${match[2]}-${match[3]}` }, // YYYY-MM-DD
      { regex: /(\d{1,2})\s+(\w+)\s+(\d{4})/, handler: (match) => {
        const months = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        const month = months[match[2].toLowerCase().slice(0, 3)];
        return month ? `${match[3]}-${month}-${match[1].padStart(2, '0')}` : null;
      }}
    ];
    
    for (const format of formats) {
      const match = cleanDate.match(format.regex);
      if (match) {
        const result = format.handler(match);
        if (result) {
          const date = new Date(result);
          if (!isNaN(date.getTime())) {
            return date.toISOString().slice(0, 10);
          }
        }
      }
    }
    
    return new Date().toISOString().slice(0, 10);
  };

  const parsePayPeriod = (periodStr) => {
    if (!periodStr) return new Date().toISOString().slice(0, 7);
    
    const cleanPeriod = periodStr.toString().trim();
    
    const months = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'june': '06', 'july': '07', 'august': '08', 'september': '09',
      'october': '10', 'november': '11', 'december': '12'
    };
    
    // Try to extract month and year
    const match = cleanPeriod.toLowerCase().match(/([a-z]+)[-\/\s]?(\d{4})/);
    if (match) {
      const monthKey = match[1].toLowerCase();
      const month = months[monthKey];
      const year = match[2];
      if (month && year) {
        return `${year}-${month}`;
      }
    }
    
    // Try MM-YYYY format
    const mmYYYY = cleanPeriod.match(/(\d{2})[-/](\d{4})/);
    if (mmYYYY) {
      return `${mmYYYY[2]}-${mmYYYY[1]}`;
    }
    
    // Try YYYY-MM format
    const yyyyMM = cleanPeriod.match(/(\d{4})[-/](\d{2})/);
    if (yyyyMM) {
      return `${yyyyMM[1]}-${yyyyMM[2]}`;
    }
    
    return new Date().toISOString().slice(0, 7);
  };

  const createEmployeeFromCSV = (row, headers, index) => {
    // Process columns
    const categories = processCSVColumns(headers, row);
    
    // Calculate totals
    const totals = calculatePayrollTotals(categories);
    
    // Extract employee info
    const employeeName = categories.info['name'] || 
                        categories.info['employee name'] || 
                        `Employee ${index + 1}`;
    
    const employeeId = categories.info['employee'] || 
                      categories.info['id'] || 
                      categories.info['code'] || 
                      categories.info['employeeid'] ||
                      categories.info['employee id'] ||
                      `EMP${String(employees.length + index + 1).padStart(4, '0')}`;
    
    // Get UAN (Universal Account Number)
    const uan = categories.info['uan'] || 
               categories.info['uancertificate'] || 
               categories.info['universal account number'] || 
               "";
    
    // Get paid days and LOP days
    const paidDays = parseFloat(categories.info['paid days'] || 
                               categories.info['paid'] || 
                               categories.info['days'] || 0);
    
    const lossOfPayDays = parseFloat(categories.info['lop days'] || 
                                    categories.info['lop'] || 
                                    categories.info['loss'] || 0);
    
    // Get pay date
    const payDate = parseDate(categories.info['pay date'] || 
                             categories.info['date'] || 
                             categories.info['paydate']);
    
    // Get pay period
    const payPeriod = parsePayPeriod(categories.info['pay period'] || 
                                    categories.info['period'] || 
                                    categories.info['month']);
    
    return {
      id: `EMP-${Date.now()}-${index}`,
      employeeId: employeeId,
      name: employeeName,
      uan: uan,
      
      // Salary details
      payPeriod: payPeriod,
      paidDays: paidDays || 0,
      lossOfPayDays: lossOfPayDays || 0,
      payDate: payDate,
      
      // Dynamic earnings and deductions
      earnings: categories.earnings,
      deductions: categories.deductions,
      
      // Calculated totals
      gross: totals.gross,
      totalDeductions: totals.totalDeductions,
      net: totals.net,
      
      // Additional info
      department: categories.info['department'] || "General",
      designation: categories.info['designation'] || "Employee",
      email: categories.info['email'] || "",
      phone: categories.info['phone'] || categories.info['mobile'] || "",
      
      // Bank details
      bankName: categories.info['bank'] || categories.info['bank name'] || "",
      bankAccount: categories.info['account'] || categories.info['account number'] || "",
      bankIfsc: categories.info['ifsc'] || categories.info['ifsc code'] || "",
      panNumber: categories.info['pan'] || "",
      
      // Company details
      company: {
        name: company?.companyName || "Company",
        address: company?.address || "",
        cityPincode: company?.cityPincode || "",
        country: company?.country || "India",
        logoDataUrl: company?.logoDataUrl || "",
        panNumber: company?.panNumber || "",
        tanNumber: company?.tanNumber || ""
      },
      
      // Store validation info for debugging
      _validation: totals.validation
    };
  };

  const handleFile = (file) => {
    setError("");
    setSuccess("");
    setFileName(file.name);
    setProcessing(true);
    setParsedData([]);
    setHeaders([]);
    setValidationWarnings([]);
    setPreviewData([]);
    
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (isExcel) {
      // Handle Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(worksheet);
          
          // Parse the CSV data
          Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
              processFileData(results, file.name);
            },
            error: (err) => {
              setProcessing(false);
              setError(`Error parsing Excel file: ${err.message}`);
            }
          });
        } catch (err) {
          setProcessing(false);
          setError(`Error reading Excel file: ${err.message}`);
        }
      };
      reader.onerror = () => {
        setProcessing(false);
        setError("Error reading file");
      };
      reader.readAsBinaryString(file);
    } else {
      // Handle CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          processFileData(results, file.name);
        },
        error: (err) => {
          setProcessing(false);
          setError(`Error parsing CSV file: ${err.message}`);
        }
      });
    }
  };

  const processFileData = (results, fileName) => {
    setProcessing(false);
    
    if (results.errors.length > 0) {
      console.warn('File parse warnings:', results.errors);
    }

    if (!results.data || results.data.length === 0) {
      setError("File is empty or no data found");
      return;
    }

    // Clean the data first
    const cleanData = cleanCSVData(results.data);
    
    if (cleanData.length === 0) {
      setError("No valid employee data found after cleaning. Check if file contains actual data rows.");
      return;
    }

    // Get all headers and clean them
    const rawHeaders = results.meta.fields || 
                      (cleanData.length > 0 ? Object.keys(cleanData[0]) : []);
    
    const cleanedHeaders = cleanHeaders(rawHeaders);
    
    if (cleanedHeaders.length === 0) {
      setError("No valid headers found in file");
      return;
    }
    
    setHeaders(cleanedHeaders);
    
    // Analyze column types
    analyzeHeaders(cleanedHeaders);
    

    
    // Store parsed data for preview
    setParsedData(cleanData);

    // Create preview data
    const previewEmployees = cleanData.slice(0, 5).map((row, index) => {
      return createEmployeeFromCSV(row, cleanedHeaders, index);
    });
    
    setPreviewData(previewEmployees);

    // Log validation results for debugging
    const warnings = [];
    previewEmployees.forEach((emp, idx) => {
      if (emp._validation) {
        if (!emp._validation.gross.isValid && emp._validation.gross.provided > 0) {
          warnings.push(`Row ${idx + 1}: Gross mismatch (Provided: ${emp._validation.gross.provided}, Calculated: ${emp._validation.gross.calculated})`);
        }
        if (!emp._validation.deductions.isValid && emp._validation.deductions.provided > 0) {
          warnings.push(`Row ${idx + 1}: Deductions mismatch (Provided: ${emp._validation.deductions.provided}, Calculated: ${emp._validation.deductions.calculated})`);
        }
      }
    });
    
    if (warnings.length > 0) {
      setValidationWarnings(warnings);
    }

    // Show success message
    setSuccess(`Found ${cleanData.length} valid employee records after cleaning. Ready to import.`);
  };

  const downloadTemplate = () => {
    // SIMPLE TEMPLATE - Only actual data columns
    const headers = [
      'UAN',
      'Name',
      'Employee ID',
      'Pay Period',
      'Pay Date',
      'Paid Days',
      'LOP Days',
      'Basic Salary',
      'HRA',
      'Special Allowance',
      'Gift',
      'Gross Earnings',
      'Income Tax',
      'Provident Fund',
      'Professional Tax',
      'Total Deductions',
      'Net Pay'
    ];
    
    const sampleData = [
      '101411733970',
      'NAVEEN',
      'G20',
      'Jan-26',
      '31-01-2026',
      '22',
      '0',
      '50000',
      '20000',
      '3000',
      '7000',
      '80000',
      '5000',
      '1800',
      '200',
      '7000',
      '73000'
    ];
    
    const csvContent = [
      headers.join(','),
      sampleData.join(','),
      '',
      '# SIMPLE PAYROLL TEMPLATE',
      '# Just fill in the data rows, no instructions in data columns',
      '# Delete any columns you don\'t need',
      '# Save as CSV and upload'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simple_payroll_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (parsedData.length === 0) {
      setError("Please upload a CSV file first");
      return;
    }
    
    const processedEmployees = parsedData.map((row, index) => {
      return createEmployeeFromCSV(row, headers, index);
    });
    
    const validEmployees = processedEmployees.filter(emp => 
      emp.name && emp.earnings.length > 0
    );
    
    if (validEmployees.length > 0) {
      setEmployees(prev => [...prev, ...validEmployees]);
      setSuccess(`Successfully imported ${validEmployees.length} employees`);
      setParsedData([]);
      setFileName("");
      setHeaders([]);
      setValidationWarnings([]);
      setPreviewData([]);
    } else {
      setError("No valid employees found to import");
    }
  };

  const handleClear = () => {
    setFileName("");
    setParsedData([]);
    setHeaders([]);
    setValidationWarnings([]);
    setPreviewData([]);
    setError("");
    setSuccess("");
  };

  return (
    <div className="csv-upload-page">
      <div className="page-header">
        <div>
          <h1>Simple CSV Import</h1>
          <p>Upload clean CSV with only data rows</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={downloadTemplate}
        >
          <Download size={16} />
          Download Simple Template
        </button>
      </div>

      <div className="upload-section">
        <div className="upload-card">
          <div className="upload-header">
            <FileSpreadsheet size={48} />
            <h3>Simple CSV Import</h3>
            <p>Upload CSV with ONLY data rows (no instructions in data columns)</p>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button 
                onClick={handleClear}
                className="close-btn"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="success-message">
              <Check size={16} />
              <span>{success}</span>
            </div>
          )}

          {validationWarnings.length > 0 && (
            <div className="warning-message">
              <AlertCircle size={16} />
              <div>
                <strong>Validation Notes:</strong>
                <ul className="validation-list">
                  {validationWarnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="upload-area">
            <div className="file-upload-container">
              {fileName ? (
                <div className="file-selected">
                  <FileSpreadsheet size={24} />
                  <div>
                    <p><strong>Selected file:</strong> {fileName}</p>
                    <p><strong>Valid records:</strong> {parsedData.length}</p>
                    {headers.length > 0 && (
                      <p><strong>Columns detected:</strong> {headers.length}</p>
                    )}
                    <div className="action-buttons">
                      <button 
                        className="btn-text"
                        onClick={handleClear}
                      >
                        Clear & Upload New
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={handleImport}
                        disabled={processing}
                        style={{ marginLeft: '12px' }}
                      >
                        {processing ? 'Processing...' : `Import ${parsedData.length} Employees`}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="upload-zone">
                  <Upload size={32} />
                  <span className="upload-title">Upload CSV or Excel File</span>
                  <span className="file-hint">Only include data rows, no instructions</span>
                  
                  <div className="upload-button-wrapper">
                    <span className="btn btn-primary">
                      <Upload size={16} />
                      Choose File
                    </span>
                    <input
                      type="file"
                      id="csv-upload-input"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0];
                        if (!f) return;
                        
                        if (f.size > 10 * 1024 * 1024) {
                          setError("File size should be less than 10MB");
                          return;
                        }
                        
                        handleFile(f);
                      }}
                      style={{ display: 'none' }}
                    />
                  </div>
                </label>
              )}
            </div>
          </div>

          {headers.length > 0 && (
            <div className="template-section">
              <h4>Detected Columns ({headers.length})</h4>
              <div className="format-info">
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                  gap: '8px', 
                  marginTop: '10px' 
                }}>
                  {headers.map((header, idx) => {
                    const colType = detectColumnType(header);
                    let bgColor = '#f3f4f6';
                    let typeText = 'Other';
                    let color = '#666';
                    let icon = '📄';
                    
                    if (colType === 'earning') {
                      bgColor = '#d1fae5';
                      typeText = 'Earning';
                      color = '#065f46';
                      icon = '💰';
                    } else if (colType === 'deduction') {
                      bgColor = '#fee2e2';
                      typeText = 'Deduction';
                      color = '#991b1b';
                      icon = '📉';
                    } else if (colType === 'total') {
                      bgColor = '#dbeafe';
                      typeText = 'Total';
                      color = '#1e40af';
                      icon = '🧮';
                    } else if (colType === 'info') {
                      bgColor = '#fef3c7';
                      typeText = 'Info';
                      color = '#92400e';
                      icon = '👤';
                    }
                    
                    return (
                      <div key={idx} style={{ 
                        padding: '10px', 
                        background: bgColor,
                        borderRadius: '8px',
                        fontSize: '13px',
                        border: `1px solid ${color}20`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>{icon}</span>
                          <div>
                            <strong style={{ color: color }}>{header}</strong>
                            <div style={{ fontSize: '11px', color: color, fontWeight: 'bold' }}>
                              {typeText}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div className="data-preview">
              <h4>Preview (First {Math.min(previewData.length, 3)} records)</h4>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>ID</th>
                      <th>Paid Days</th>
                      <th>LOP Days</th>
                      <th>Earnings</th>
                      <th>Deductions</th>
                      <th>Gross</th>
                      <th>Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 3).map((emp, index) => {
                      const earningsTotal = emp.earnings.reduce((sum, e) => sum + e.amount, 0);
                      const deductionsTotal = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
                      
                      return (
                        <tr key={index}>
                          <td><strong>{emp.name}</strong></td>
                          <td>{emp.employeeId}</td>
                          <td>{emp.paidDays}</td>
                          <td>{emp.lossOfPayDays}</td>
                          <td>
                            <div style={{ fontSize: '12px', color: '#065f46' }}>
                              {emp.earnings.length} items
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                Basic: ₹{emp.earnings.find(e => e.label.toLowerCase().includes('basic'))?.amount || 0}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', color: '#991b1b' }}>
                              {emp.deductions.length} items
                            </div>
                          </td>
                          <td>₹{emp.gross.toLocaleString()}</td>
                          <td><strong>₹{emp.net.toLocaleString()}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="instructions">
            <h4>📋 IMPORTANT: How to Prepare Your CSV</h4>
            <div className="instructions-card">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '15px' 
              }}>
                <div>
                  <strong style={{ color: '#0369a1' }}>✅ DO THIS:</strong>
                  <ul style={{ margin: '8px 0 8px 20px', color: '#0369a1' }}>
                    <li>Download the simple template</li>
                    <li>Fill ONLY the data rows</li>
                    <li>Delete columns you don't need</li>
                    <li>Save as CSV (UTF-8 encoding)</li>
                    <li>Upload the clean file</li>
                  </ul>
                </div>
                
                <div>
                  <strong style={{ color: '#dc2626' }}>❌ DON'T DO THIS:</strong>
                  <ul style={{ margin: '8px 0 8px 20px', color: '#dc2626' }}>
                    <li>Don't put instructions in data columns</li>
                    <li>Don't mix template text with data</li>
                    <li>Don't leave empty rows with placeholders</li>
                    <li>Don't use merged cells</li>
                    <li>Don't add extra header rows</li>
                  </ul>
                </div>
              </div>
              
              <div style={{ 
                marginTop: '15px', 
                padding: '12px', 
                background: '#fef3c7', 
                borderRadius: '6px',
                borderLeft: '4px solid #f59e0b'
              }}>
                <strong>🛠️ Fixing Your Current CSV:</strong>
                <ol style={{ margin: '8px 0 0 20px' }}>
                  <li>Open your CSV in Excel/Google Sheets</li>
                  <li>Delete ALL rows that contain instructions like "# ===== TEMPLATE ====="</li>
                  <li>Delete ALL rows with placeholder data like "Not Provided" or "N/A"</li>
                  <li>Keep ONLY rows with actual employee data</li>
                  <li>Save as a new CSV file and upload again</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 