# Multi-Year Payroll Support Implementation

## Overview
The PayslipGenerator component has been enhanced to support generating payslips for multiple years (2020-2025) instead of being limited to the current year only.

## What Changed

### 1. **New State Variables**
- `selectedYear`: Tracks the currently selected year (default: current year)
- `selectedMonth`: Now stores only the month name (e.g., "January") without year
- `minYearLimit` / `maxYearLimit`: The stepper enforces bounds (default: 2000 - current year + 5; configurable via `settings.maxPayrollYear`)

### 2. **Year & Month Generation Logic**
```jsx
const currentYear = new Date().getFullYear();
const yearOptions = useMemo(() => 
  Array.from({ length: 6 }, (_, i) => currentYear - i).sort((a, b) => a - b),
  [currentYear]
);

const getMonthsForYear = (year) => {
  const currentDate = new Date();
  const isCurrentYear = year === currentYear;
  const monthsToShow = isCurrentYear ? currentDate.getMonth() + 1 : 12;
  
  const monthsList = [];
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const date = new Date(year, i);
    monthsList.push(date.toLocaleString('default', { month: 'long' }));
  }
  return monthsList;
};

const months = useMemo(() => getMonthsForYear(selectedYear), [selectedYear, currentYear]);
```

### 3. **UI Updates**
Added controls in the header:
- **Year Selector**: Stepper buttons to increment/decrement the selected year (bounds enforced: 2000 - current year)
- **Month Selector**: Shows months based on selected year
  - Current year: Shows only months up to current month
  - Previous years: Shows all 12 months

### 4. **Filename Updates**
PDF and ZIP file downloads now include the year:
- Single payslip: `{EmployeeName}_{Month}_{Year}.pdf`
  - Example: `John_Doe_January_2024.pdf`
- Bulk download: `Payslips_{Month}_{Year}.zip`
  - Example: `Payslips_January_2024.zip`

### 5. **Payslip Display**
The payslip template now shows the year alongside the month:
- **Before**: "For the month of January"
- **After**: "For the month of January 2024"

## Features

✅ **Multi-Year Support**: Access payslips from 2020 to current year
✅ **Smart Month Filtering**: 
- Current year shows only months up to present
- Past years show all 12 months
✅ **Smart Defaults**: Automatically selects current year and current month on page load
✅ **Year Switching**: Changing year automatically resets to the first available month
✅ **Consistent Naming**: Year is included in all downloaded PDF and ZIP files
✅ **Performance**: Uses `useMemo` for year options and month list to prevent unnecessary recalculations

## User Experience

### Generating Payslips for Previous Years
1. Open "Generate Payslips" page
2. Use the **Year** stepper buttons to change the year
3. Select desired month from **Month** dropdown
4. Select employees to include
5. Click "Download Selected" or download individual payslips

### Example Scenarios
- **January 2024**: Select 2024, January, choose employees
- **December 2020**: Select 2020, December, choose employees
- **Current Month**: Automatically defaults to current year and month

## Technical Details

### Backward Compatibility
- All existing payslip data and employee information remains unchanged
- Only the UI and file generation were updated
- No changes to salary calculation logic

### Performance Optimizations
- `yearOptions` is memoized to prevent recalculation
- `months` array is memoized based on selected year and current year
- Image preloading remains optimized with separate state tracking

### File Structure
- Modified: `src/components/PayslipGenerator.jsx`
- No new files required
- Compatible with all existing components and utilities

## Testing Checklist

- [ ] Year stepper updates year correctly and respects bounds (2000 to current year + 5 by default or `settings.maxPayrollYear`)
- [ ] Month dropdown updates when year is changed
- [ ] Current year only shows months up to current month
- [ ] Previous years show all 12 months
- [ ] Payslip displays correct month and year
- [ ] PDF downloads include year in filename
- [ ] ZIP downloads include year in filename
- [ ] Employee selection still works
- [ ] Logo and signature display correctly
- [ ] Bulk download functions correctly

## Future Enhancements

- Custom year range configuration in Settings
- Payroll period comparison (year-over-year analysis)
- Historical payslip search and retrieval
- Payroll archiving system
