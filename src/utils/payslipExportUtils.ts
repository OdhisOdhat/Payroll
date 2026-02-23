import * as XLSX from 'xlsx';
import { Employee, PayrollRecord, BrandSettings } from '../types';

export const exportPayslipToExcel = (
  employee: Employee,
  record: PayrollRecord,
  brand: BrandSettings
) => {
  try {
    if (!employee || !record || !brand) {
      throw new Error('Missing required data for export');
    }

    const wb = XLSX.utils.book_new();

    // Extract date info
    let monthName: string;
    let yearValue: number;

    if (record.payPeriodStart) {
      const date = new Date(record.payPeriodStart);
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      monthName = months[date.getMonth()];
      yearValue = date.getFullYear();
    } else {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      monthName = months[record.month || 0];
      yearValue = record.year || new Date().getFullYear();
    }

    const data: any[] = [];

    // Header
    data.push([{ t: 's', v: 'PAYSLIP' }]);
    data.push([{ t: 's', v: `${monthName}, ${yearValue}` }]);
    data.push([]); // Empty row

    // Company info
    data.push([{ t: 's', v: 'Company:' }, { t: 's', v: brand.entityName || 'N/A' }]);
    data.push([{ t: 's', v: 'Address:' }, { t: 's', v: brand.address || '' }]);
    data.push([]); // Empty row

    // Employee info
    data.push([{ t: 's', v: 'Employee Details' }]);
    data.push([{ t: 's', v: 'Payroll No:' }, { t: 's', v: employee.payrollNumber || 'N/A' }]);
    data.push([{ t: 's', v: 'Employee Name:' }, { t: 's', v: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() }]);
    data.push([{ t: 's', v: 'Employee PIN:' }, { t: 's', v: employee.kraPin || 'N/A' }]);
    data.push([{ t: 's', v: 'NSSF Number:' }, { t: 's', v: employee.nssfNumber || '' }]);
    data.push([{ t: 's', v: 'SHA Number:' }, { t: 's', v: employee.nhifNumber || '' }]);
    data.push([]); // Empty row

    // Earnings
    data.push([{ t: 's', v: 'EARNINGS' }]);
    data.push([{ t: 's', v: 'Basic Salary' }, { t: 'n', v: employee.basicSalary || 0 }]);
    data.push([{ t: 's', v: 'Benefits / Allowances' }, { t: 'n', v: record.benefits || 0 }]);
    data.push([
      { t: 's', v: 'GROSS SALARY' },
      { t: 'n', v: record.grossSalary || record.grossPay || 0 }
    ]);
    data.push([]); // Empty row

    // Deductions
    data.push([{ t: 's', v: 'DEDUCTIONS' }]);
    data.push([{ t: 's', v: 'PAYE Tax' }, { t: 'n', v: record.paye || 0 }]);
    data.push([{ t: 's', v: 'NSSF Tier I & II' }, { t: 'n', v: record.nssf || 0 }]);
    data.push([{ t: 's', v: 'Social Health Authority (SHA)' }, { t: 'n', v: record.sha || 0 }]);
    data.push([{ t: 's', v: 'Affordable Housing Levy' }, { t: 'n', v: record.housingLevy || 0 }]);
    data.push([
      { t: 's', v: 'TOTAL DEDUCTIONS' },
      { t: 'n', v: (record.grossSalary || record.grossPay || 0) - (record.netSalary || record.netPay || 0) }
    ]);
    data.push([]); // Empty row

    // Net salary
    data.push([
      { t: 's', v: 'NET SALARY PAYABLE' },
      { t: 'n', v: record.netSalary || record.netPay || 0 }
    ]);
    data.push([]); // Empty row

    // Footer
    data.push([
      { t: 's', v: 'Run ID:' },
      { t: 's', v: record.id?.slice(0, 8).toUpperCase() || 'N/A' }
    ]);
    data.push([
      { t: 's', v: 'Processed:' },
      { t: 's', v: record.processedAt ? new Date(record.processedAt).toLocaleDateString() : (record.createdAt ? new Date(record.createdAt).toLocaleDateString() : new Date().toLocaleDateString()) }
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Format columns
    ws['!cols'] = [
      { wch: 25 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Payslip');

    const fileName = `Payslip_${employee.lastName || 'Unknown'}_${employee.firstName || 'User'}_${monthName}_${yearValue}.xlsx`;
    XLSX.writeFile(wb, fileName);
    console.log('Payslip exported successfully:', fileName);
  } catch (error) {
    console.error('Error exporting payslip:', error);
    throw error;
  }
};
