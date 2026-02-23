import * as XLSX from 'xlsx';
import { Employee, PayrollRecord, BrandSettings } from '../types';

export const exportP9ToExcel = (
  employee: Employee,
  records: PayrollRecord[],
  brand: BrandSettings,
  month?: number,
  year?: number
) => {
  try {
    if (!employee || !records || !brand) {
      throw new Error('Missing required data for export');
    }

    const currentYear = year || new Date().getFullYear();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Prepare data for worksheet
  const data: any[] = [];

  // Header
  data.push([
    { t: 's', v: 'KENYA REVENUE AUTHORITY' },
  ]);
  data.push([
    { t: 's', v: 'INCOME TAX DEPARTMENT' },
  ]);
  data.push([
    { t: 's', v: `P.9A - TAX DEDUCTION CARD - YEAR ${currentYear}` },
  ]);
  data.push([]); // Empty row

  // Employee Information
  data.push([
    { t: 's', v: `Employer's Name:` },
    { t: 's', v: brand.entityName || 'N/A' },
  ]);
  data.push([
    { t: 's', v: `Employee's Name:` },
    { t: 's', v: `${employee.lastName || 'Unknown'}, ${employee.firstName || 'User'}` },
  ]);
  data.push([
    { t: 's', v: `Employee's PIN:` },
    { t: 's', v: employee.kraPin || 'N/A' },
  ]);
  data.push([
    { t: 's', v: `Payroll Number:` },
    { t: 's', v: employee.payrollNumber || 'N/A' },
  ]);
  data.push([]); // Empty row

  // Monthly breakdown header
  data.push([
    { t: 's', v: 'Month' },
    { t: 's', v: 'Gross Salary' },
    { t: 's', v: 'Benefits' },
    { t: 's', v: 'NSSF' },
    { t: 's', v: 'Taxable Income' },
    { t: 's', v: 'PAYE Tax' },
    { t: 's', v: 'Personal Relief' },
    { t: 's', v: 'NITA' },
  ]);

  // Monthly data
  let totalGross = 0;
  let totalBenefits = 0;
  let totalNssf = 0;
  let totalTaxable = 0;
  let totalPaye = 0;
  let totalRelief = 0;
  let totalNita = 0;

  months.forEach((monthName, idx) => {
    const record = records.find(r => {
      if (r.payPeriodStart) {
        const date = new Date(r.payPeriodStart);
        return date.getMonth() === idx && date.getFullYear() === currentYear;
      }
      return r.month === idx && r.year === currentYear;
    });

    const gross = record?.grossSalary || record?.grossPay || 0;
    const benefits = record?.benefits || 0;
    const nssf = record?.nssf || 0;
    const taxable = record?.taxableIncome || 0;
    const paye = record?.paye || 0;
    const relief = record?.personalRelief || 0;
    const nita = record?.nita || 0;

    totalGross += gross;
    totalBenefits += benefits;
    totalNssf += nssf;
    totalTaxable += taxable;
    totalPaye += paye;
    totalRelief += relief;
    totalNita += nita;

    data.push([
      { t: 's', v: monthName },
      { t: 'n', v: gross },
      { t: 'n', v: benefits },
      { t: 'n', v: nssf },
      { t: 'n', v: taxable },
      { t: 'n', v: paye },
      { t: 'n', v: relief },
      { t: 'n', v: nita },
    ]);
  });

  // Totals row
  data.push([
    { t: 's', v: 'TOTALS' },
    { t: 'n', v: totalGross },
    { t: 'n', v: totalBenefits },
    { t: 'n', v: totalNssf },
    { t: 'n', v: totalTaxable },
    { t: 'n', v: totalPaye },
    { t: 'n', v: totalRelief },
    { t: 'n', v: totalNita },
  ]);

  // Convert to worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Format columns
  ws['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 10 },
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'P9 Form');

  // Generate filename
  const fileName = `P9_${employee.lastName || 'Unknown'}_${employee.firstName || 'User'}_${currentYear}.xlsx`;

  // Write file
  XLSX.writeFile(wb, fileName);
  console.log('P9 Form exported successfully:', fileName);
  } catch (error) {
    console.error('Error exporting P9 form:', error);
    throw error;
  }
};
