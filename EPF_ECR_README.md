# EPF/ECR Generator Documentation

## Overview

The EPF/ECR (Employee Provident Fund - Electronic Challan cum Return) Generator is a **completely separate module** from the payroll system. It allows you to:

- Import PF data from CSV, TXT, and Excel files
- Manage Employee UAN numbers and contribution amounts
- Calculate PF contributions using the PF calculator tool
- Generate EPFO-compliant ECR text files
- Export data to CSV/Excel format
- Preview and validate all PF records

**Important:** This module does NOT modify employee payroll data or affect payslip generation.

---

## Features

### 1. **Import Data**
- Upload CSV, TXT, or Excel files with existing PF data
- Supports multiple file formats
- Auto-validation of UAN numbers and amounts
- Shows import summary and statistics

### 2. **PF Calculator**
- Calculate PF contributions from gross salary
- Automatically applies EPFO wage ceiling (₹15,000)
- Calculates:
  - Employee PF (12%)
  - EPS (8.33%)
  - Employer PF (3.67%)
  - EDLI deductions
- Add calculated records directly to PF data

### 3. **Data Preview**
- View all imported/added PF records
- See detailed breakdown of contributions
- Delete individual records
- View totals and statistics

### 4. **Export**
- **ECR Text Format**: EPFO upload-ready format
  - File format: `UAN#~#NAME#~#GROSS#~#EPF_WAGES#~#EPS_WAGES#~#EDLI_WAGES#~#EPF_EE#~#EPS#~#EPF_ER#~#NCP#~#REFUND`
  - Includes company header information
  - Download as `.txt` file

- **CSV Format**: For Excel/Google Sheets
  - Includes company details header
  - All PF data columns
  - Download as `.csv` file

---

## Input Data Format

### CSV Format
```csv
Company,Your Company Name
Address,123 Business Street, City
PAN,ABCDE1234F

Sl.No,UAN,Name,Gross Wages,EPF Wages,EPS Wages,EDLI Wages,EPF EE,EPS,EPF ER,NCP Days,Refund Advances
1,101411733970,John Doe,50000,15000,15000,15000,1800,1250,550,0,0
2,101411733971,Jane Smith,45000,15000,15000,15000,1800,1250,550,0,0
```

### Text Format (ECR)
```
101411733970#~#JOHN DOE#~#50000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0
101411733971#~#JANE SMITH#~#45000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0
```

### Excel Format
- Column A: Sl.No
- Column B: UAN (12 digits)
- Column C: Name
- Column D: Gross Wages
- Column E: EPF Wages
- Column F: EPS Wages
- Column G: EDLI Wages
- Column H: EPF EE (Employee PF)
- Column I: EPS
- Column J: EPF ER (Employer PF)
- Column K: NCP Days (No-Credit Period)
- Column L: Refund Advances

---

## PF Calculation Rules

### Wage Ceiling
- Maximum wage considered: **₹15,000** per month
- Any salary above this is capped at ₹15,000 for PF calculation

### Employee Contribution
- **EPF**: 12% of EPF wages (capped)
- Deducted from employee salary

### Employer Contribution
- **EPS** (Pension): 8.33% of EPF wages
- **EPF** (Provident): 3.67% of EPF wages
- **EDLI**: 0.43% of EDLI wages (if applicable)
- Total employer contribution: 12% (EPS + EPF)

### Example Calculation
For an employee with gross salary of **₹50,000**:
- EPF Wages (capped): ₹15,000
- Employee PF (12%): ₹1,800
- EPS (8.33%): ₹1,250
- Employer PF (3.67%): ₹550
- **Total Employer: ₹1,800**

---

## How to Use

### Step 1: Import Data
1. Go to **EPF/ECR** menu
2. Click **Import Data** tab
3. Click the upload area or drag-and-drop a file
4. System validates and imports data
5. View import summary

### Step 2: Use Calculator (Optional)
1. Click **PF Calculator** tab
2. Enter UAN, Employee Name, Gross Salary
3. Click **Calculate**
4. Review calculated contributions
5. Click **Add to PF Data** to include in records

### Step 3: Preview Data
1. Click **Preview** tab
2. View all employees and contributions
3. Check totals and statistics
4. Delete records if needed

### Step 4: Export
1. Click **Export** tab
2. Choose export format:
   - **ECR**: For EPFO submission
   - **CSV**: For spreadsheet applications
3. Click **Download** button
4. File will download with timestamp

---

## Technical Details

### File Structure
```
src/
├── components/
│   └── EPFECRGenerator.jsx          # Main component
├── constants/
│   └── pfConstants.js                # PF rates and constants
├── hooks/
│   └── usePFData.js                  # PF data management hook
├── utils/
│   ├── pfCalculator.js               # Calculation logic
│   └── ecrFormatter.js               # File formatting utilities
└── styles/
    └── epf-ecr.css                   # Component styles
```

### Key Functions

#### pfCalculator.js
- `calculatePF(grossSalary)` - Calculate all PF components
- `validatePFEntry(pfEntry)` - Validate record
- `calculatePFTotals(pfDataArray)` - Get totals

#### ecrFormatter.js
- `formatToECRLine(pfRecord)` - Format to ECR line
- `generateECRFileContent(pfDataArray, companyInfo)` - Create ECR file
- `generateCSVContent(pfDataArray, companyInfo)` - Create CSV file
- `parseCSVContent(csvContent)` - Parse CSV input

#### usePFData.js
- `addPFRecord(record)` - Add/update record
- `deletePFRecord(uan)` - Delete record
- `importPFData(fileContent, fileName)` - Import from file
- `clearPFData()` - Clear all data
- `getTotals()` - Get statistics

---

## Constants (pfConstants.js)

```javascript
WAGE_CEILING: 15000              // Max wage for PF
EPF_RATE_EMPLOYEE: 0.12          // Employee 12%
EPF_RATE_EMPLOYER: 0.12          // Employer 12%
EPS_RATE_EMPLOYER: 0.0833        // Pension 8.33%
EDLI_RATE_EMPLOYER: 0.0043       // EDLI 0.43%
NCP_DAYS: 0                       // No-Credit Period
ECR_SEPARATOR: "#~#"             // Field separator
```

---

## Data Isolation

The EPF/ECR module:
- ✅ Stores data in localStorage (browser storage)
- ✅ Does NOT modify employee records
- ✅ Does NOT affect payslip calculations
- ✅ Can be used independently
- ✅ Separate data storage from payroll module

---

## Export File Specifications

### ECR Text File Format

**File Extension:** `.txt`

**Sample Content:**
```
# Company: ABC Corporation
# Address: 123 Business Street
# PAN: ABCDE1234F
# ================================================================================

# Sl.No | Employee No | Name | UAN | Gross Wages | EPF Wages | EPS Wages | EDLI Wages | EPF EE | EPS | EPF ER | NCP Days | Refund Advances
# ================================================================================

101411733970#~#JOHN DOE#~#50000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0
101411733971#~#JANE SMITH#~#45000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0
```

### CSV File Format

**File Extension:** `.csv`

**Sample Content:**
```csv
Company,ABC Corporation
Address,123 Business Street
PAN,ABCDE1234F

Sl.No,UAN,Name,Gross Wages,EPF Wages,EPS Wages,EDLI Wages,EPF EE,EPS,EPF ER,NCP Days,Refund Advances
1,101411733970,John Doe,50000,15000,15000,15000,1800,1250,550,0,0
2,101411733971,Jane Smith,45000,15000,15000,15000,1800,1250,550,0,0
```

---

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

---

## Limitations & Notes

1. **Data Storage**: Data is stored in browser localStorage. Clearing browser data will clear PF data.
2. **File Size**: For very large files (1000+ records), import may take a few seconds.
3. **UAN Validation**: System validates 12-digit UAN format.
4. **Wage Ceiling**: Automatically applies EPFO wage ceiling (₹15,000).
5. **Rounding**: All monetary values are rounded to nearest rupee.

---

## Support & Troubleshooting

### Issue: File not importing
- **Check**: Ensure file format matches CSV/TXT specifications
- **Check**: All required columns are present
- **Check**: No empty rows in data section

### Issue: Calculation seems wrong
- **Check**: Verify gross salary is within expected range
- **Check**: Wage ceiling is capped at ₹15,000
- **Check**: All percentages follow EPFO guidelines

### Issue: Data disappears
- **Check**: Browser localStorage is enabled
- **Check**: Sufficient storage space available
- **Note**: Private/Incognito mode may not persist data

---

## Version
- **EPF/ECR Module Version**: 1.0.0
- **Last Updated**: January 2026
- **Compatible with**: Payroll Pro v2.0.0+

---

## Changelog

### v1.0.0 (Initial Release)
- ✅ PF data import (CSV, TXT, Excel)
- ✅ PF calculator tool
- ✅ ECR text file generation
- ✅ CSV export
- ✅ Data preview and management
- ✅ Validation and error handling
- ✅ Responsive mobile design
