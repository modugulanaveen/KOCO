import React, { useRef } from "react";
import '../payslip.css';
import { computeSalary } from "../utils/salary";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { saveAs } from "file-saver";

/*
  WYSIWYG PDF export using html2canvas -> jsPDF
  - Captures each on-screen payslip element to a high-res image
  - Inserts that image into an A4 PDF page
  - Supports single PDF download and bulk ZIP of PDFs
*/

function formatINR(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return "₹0.00";
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/* Create a jsPDF doc from a DOM element (returns blob)
   options: { format: 'a4'|'a3'|'letter', orientation: 'portrait'|'landscape', scale: number }
*/
async function elementToPdfBlob(element, options = {}) {
  const { format = 'a4', orientation = 'portrait', scale = 2 } = options;

  // Clone the element so we can strip UI controls before capturing
  const cloned = element.cloneNode(true);

  // Remove/hide elements not intended for export
  if (cloned.querySelectorAll) {
    cloned.querySelectorAll('.no-export').forEach((el) => {
      el.style.display = 'none';
    });
  }

  // Place clone offscreen so computed styles still apply when html2canvas renders it
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  // make the wrapper wide enough for high-res capture
  wrapper.style.width = element.offsetWidth + 'px';
  wrapper.style.height = element.offsetHeight + 'px';
  wrapper.appendChild(cloned);
  document.body.appendChild(wrapper);

  try {
    // use requested scale for better quality/size
    const canvas = await html2canvas(cloned, { scale: Math.max(2, scale), useCORS: true, backgroundColor: null });
    const imgData = canvas.toDataURL("image/png");

    // Create PDF with requested page format and orientation
    const pdf = new jsPDF({ unit: "pt", format, orientation });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Image dimensions (scale to fit within page margins)
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth - 80; // leave margins
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    // If content height is taller than page, scale to fit height instead
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    if (imgHeight > (pageHeight - 80)) {
      finalHeight = pageHeight - 80;
      finalWidth = (imgProps.width * finalHeight) / imgProps.height;
    }

    const x = (pageWidth - finalWidth) / 2;
    const y = 40;

    pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight, undefined, "FAST");

    // return blob for zipping or further processing
    return pdf.output("blob");
  } finally {
    // always remove helper wrapper
    document.body.removeChild(wrapper);
  }
}

export default function PayslipPreview({
  // Backwards-compatible props: pass `employees` (array) OR a single `employee` + explicit `earnings`, `deductions`, `payPeriod`
  employees = [],
  employee = null,
  earnings: propEarnings = [],
  deductions: propDeductions = [],
  payPeriod: propPayPeriod = null,
  company = {},

  // PDF export options (defaults increased to produce larger PDF pages)
  pdfFormat = 'a3',
  pdfOrientation = 'portrait',
  pdfScale = 3,
}) {
  // decide the list of items to render. Prefer explicit `employee` when provided, otherwise render `employees` array
  const items = employee
    ? [{ ...employee, earnings: propEarnings.length ? propEarnings : employee.earnings || [], deductions: propDeductions.length ? propDeductions : employee.deductions || [], payPeriod: propPayPeriod || employee.payPeriod || employee.payDate || employee.month }]
    : employees;

  // refs for each payslip element so we can capture them
  const refs = useRef([]);

  // ensure refs array length matches items
  refs.current = items.map((_, i) => refs.current[i] ?? React.createRef());

  const downloadSingle = async (index) => {
    const el = refs.current[index]?.current;
    if (!el) return alert("Payslip element not found");
    try {
      const blob = await elementToPdfBlob(el, { format: pdfFormat, orientation: pdfOrientation, scale: pdfScale });
      const name = (items[index].name || items[index].employeeName || "payslip").toString();
      saveAs(blob, `${name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF: " + err.message);
    }
  };

  const downloadAllZip = async () => {
    if (!items.length) return alert("No employees to export");
    const zip = new JSZip();

    // generate sequentially to avoid heavy parallel memory use
    for (let i = 0; i < items.length; i++) {
      const el = refs.current[i]?.current;
      if (!el) continue;
      try {
        const blob = await elementToPdfBlob(el, { format: pdfFormat, orientation: pdfOrientation, scale: pdfScale });
        const name = (items[i].name || items[i].employeeName || "payslip").toString();
        const fileName = `${name.replace(/\s+/g, "_")}.pdf`;
        zip.file(fileName, blob);
      } catch (err) {
        console.error("Error generating for", items[i], err);
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "payslips.zip");
  };

  return (
    <div>
      <div className="header">
        <div className="h-title">Payslip Preview</div>
        <div className="h-actions">
          <button className="btn btn-ghost" onClick={downloadAllZip}>Download All (ZIP)</button>
        </div>
      </div>

      {items.length === 0 && <div className="card">No employees found</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((raw, i) => {
          // merge provided earnings/deductions into the object so downstream code can treat it consistently
          const normalized = {
            ...raw,
            earnings: raw.earnings || [],
            deductions: raw.deductions || [],
            payPeriod: raw.payPeriod || raw.month || raw.payDate || raw.payPeriod
          };

          const e = computeSalary(normalized);

          // Prefer employee-specific company info, but fall back to global company for empty values (so updates like Settings logo propagate)
          const headerCompany = (() => {
            const emp = normalized.company || {};
            const merged = { ...company };
            Object.keys(emp).forEach((k) => {
              const v = emp[k];
              if (v !== undefined && v !== null && v !== '') merged[k] = v;
            });
            return merged;
          })();

          // compute friendly month display from multiple possible sources
          const monthDisplay = normalized.month || (normalized.payPeriod || e.payPeriod ? new Date((normalized.payPeriod || e.payPeriod) + '-01').toLocaleString('default', { month: 'long', year: 'numeric' }) : (normalized.payDate || e.payDate ? new Date(normalized.payDate || e.payDate).toLocaleString('default', { month: 'long', year: 'numeric' }) : 'Month not set'));

          // tiny helper to convert net to words
          function numberToWords(amount) {
            const n = Number(amount);
            if (Number.isNaN(n)) return '-';

            const abs = Math.abs(Math.floor(n));
            if (abs === 0) return 'Indian Rupee Zero Only';

            const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
            const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

            function inWords(num) {
              if (num < 20) return units[num];
              if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + units[num % 10] : "");
              if (num < 1000) return inWords(Math.floor(num / 100)) + " Hundred" + (num % 100 ? " " + inWords(num % 100) : "");
              if (num < 100000) return inWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + inWords(num % 1000) : "");
              if (num < 10000000) return inWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + inWords(num % 100000) : "");
              return inWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + inWords(num % 10000000) : "");
            }

            const words = inWords(abs);
            const paise = Math.round((Math.abs(n) - Math.floor(Math.abs(n))) * 100);
            const paiseText = paise ? ` and ${paise}/100 Paise` : '';
            const prefix = n < 0 ? 'Minus ' : '';
            return `${prefix}Indian Rupee ${words}${paiseText} Only`;
          }

          // helper to render amounts and visually mute zeros
          const renderAmount = (amt) => {
            if (amt === 0 || Number(amt) === 0) {
              return <span className="muted-zero">{formatINR(amt)}</span>;
            }
            return formatINR(amt);
          }

          // render the on-screen payslip — this is what html2canvas will capture
          return (
            <div
              key={i}
              ref={(el) => (refs.current[i].current = el)}
              className="payslip"
              role="region"
              aria-labelledby={`payslip-${i}`}

            >
              <div className="payslip-header">
                <div className="brand-left">
                  {headerCompany?.logoDataUrl ? (
                    <img src={headerCompany.logoDataUrl} alt="logo" className="logo-square" />
                  ) : null}

                  <div className="company-info">
                    <div className="company-name">{headerCompany?.companyName || headerCompany?.name || "Company Name"}</div>
                    <div className="company-address">{[headerCompany?.address, headerCompany?.cityPincode || headerCompany?.city, headerCompany?.country].filter(Boolean).join(', ')}</div>
                  </div>
                </div>

                <div className="month-block">
                  <div className="month-label">Payslip For the Month</div>
                  <div className="month">{monthDisplay}</div>
                </div>
              </div>

              <div className="header-hr" />

              <div className="summary-title">EMPLOYEE SUMMARY</div>

              <div className="summary-row">
                <div className="summary-left">
                  <div className="summary-item"><div className="label">Employee Name</div><div className="value">{e.name || '-'}</div></div>
                  <div className="summary-item"><div className="label">Employee ID</div><div className="value">{e.employeeId || e.id || '-'}</div></div>
                  {
                (() => {
                  const periodRaw = e.payPeriod || normalized.payPeriod || normalized.month || '';
                  let periodDisplay = '-';
                  if (periodRaw) {
                    if (/^\d{4}-\d{2}/.test(periodRaw)) {
                      const d = new Date(periodRaw + '-01');
                      periodDisplay = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                    } else {
                      periodDisplay = formatDate(periodRaw);
                    }
                  }
                  return (<div className="summary-item"><div className="label">Pay Period</div><div className="value">{periodDisplay}</div></div>);
                })()
              }
                  <div className="summary-item"><div className="label">Pay Date</div><div className="value">{formatDate(e.payDate || normalized.payDate || '')}</div></div>
                </div>

                <div className="summary-right">
                  <div className="small">Total Net Pay</div>
                  <div className="net-amount">{formatINR(e.net || raw.net)}</div>
                  <div className="meta-group">
                    <div className="meta-row"><div>Paid Days&nbsp;:</div><div>{normalized.paidDays ?? e.paidDays ?? '-'}</div></div>
                    <div className="meta-row"><div>LOP Days&nbsp;:</div><div>{normalized.lossOfPayDays ?? e.lossOfPayDays ?? 0}</div></div>
                  </div>
                </div>
              </div>

              <div className="earnings-deductions">
                <div className="ed-header">
                  <div>EARNINGS</div>
                  <div>AMOUNT</div>
                  <div>DEDUCTIONS</div>
                  <div>AMOUNT</div>
                </div>

                <div className="ed-body">
                  {Array.from({ length: Math.max((normalized.earnings||[]).length, (normalized.deductions||[]).length) }).map((_, idx) => {
                    const earn = (normalized.earnings||[])[idx];
                    const ded = (normalized.deductions||[])[idx];
                    return (
                      <div className="ed-row" key={idx}>
                        <div>{earn ? earn.label : ''}</div>
                        <div className="ed-amt">{earn ? renderAmount(earn.amount) : ''}</div>
                        <div>{ded ? ded.label : ''}</div>
                        <div className="ed-amt">{ded ? renderAmount(ded.amount) : ''}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="ed-foot ed-foot-grid">
                  <div className="gross-label">Gross Earnings</div>
                  <div className="gross-amount">{renderAmount(normalized.gross ?? e.gross)}</div>
                  <div className="deductions-label">Total Deductions</div>
                  <div className="deductions-amount">{renderAmount(normalized.totalDeductions ?? e.deductions)}</div>
                </div>
              </div>

              <div className="net-bar">
                <div className="desc">Total Net Payable<br/><small className="muted">Gross Earnings - Total Deductions</small></div>
                <div className="payable">{formatINR(e.net ?? normalized.net)}</div>
              </div>

              <div className="amount-words">Amount In Words : {numberToWords(e.net ?? normalized.net)}</div>

              <div className="footer-note">-- This is a system-generated document. --</div>

              <div className="payslip-actions no-export">
                <button className="btn btn-primary no-export" onClick={() => downloadSingle(i)}>Download PDF</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
