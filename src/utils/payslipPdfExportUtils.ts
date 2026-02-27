import html2pdf from 'html2pdf.js';
import { Employee, PayrollRecord, BrandSettings } from '../types';

export const exportPayslipToPDF = async (
  employee: Employee,
  record: PayrollRecord,
  brand: BrandSettings
) => {
  try {
    if (!employee || !record || !brand) {
      throw new Error('Missing required data for export');
    }

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

    const grossSalary = record.grossSalary || record.grossPay || 0;
    const netSalary = record.netSalary || record.netPay || 0;
    const totalDeductions = grossSalary - netSalary;

    // Create HTML content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0; font-size: 28px; color: #1a1a1a;">PAYSLIP</h1>
            <p style="margin: 5px 0; color: #666; font-size: 14px;">${monthName}, ${yearValue}</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; color: #1a1a1a;">${brand.entityName || 'Company'}</h3>
            <p style="margin: 5px 0; font-size: 12px; color: #666;">${brand.address || ''}</p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px;">
          <div>
            <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd;">
              <strong style="color: #666;">Payroll No:</strong> <span style="float: right;">${employee.payrollNumber || 'N/A'}</span>
            </div>
            <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd;">
              <strong style="color: #666;">Employee:</strong> <span style="float: right;">${employee.firstName || ''} ${employee.lastName || ''}</span>
            </div>
            <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd;">
              <strong style="color: #666;">Employee PIN:</strong> <span style="float: right;">${employee.kraPin || 'N/A'}</span>
            </div>
          </div>
          <div>
            <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd;">
              <strong style="color: #666;">NSSF Number:</strong> <span style="float: right;">${employee.nssfNumber || ''}</span>
            </div>
            <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd;">
              <strong style="color: #666;">SHA Number:</strong> <span style="float: right;">${employee.nhifNumber || ''}</span>
            </div>
            <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd;">
              <strong style="color: #666;">Period Ref:</strong> <span style="float: right;">${record.id?.slice(0, 8).toUpperCase() || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div>
            <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 1px;">Earnings</h3>
            <div style="font-size: 13px; line-height: 1.8;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                <span>Basic Salary</span>
                <span>${(employee.basicSalary || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                <span>Benefits / Allowances</span>
                <span>${(record.benefits || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; font-weight: bold; color: #1a1a1a;">
                <span>Gross Salary</span>
                <span>${grossSalary.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #c41e3a; text-transform: uppercase; letter-spacing: 1px;">Deductions</h3>
            <div style="font-size: 13px; line-height: 1.8;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #555;">
                <span>PAYE Tax</span>
                <span>${(record.paye || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #555;">
                <span>NSSF Tier I & II</span>
                <span>${(record.nssf || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #555;">
                <span>Social Health Authority (SHA)</span>
                <span>${(record.sha || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 4px; color: #555;">
                <span>Affordable Housing Levy</span>
                <span>${(record.housingLevy || 0).toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 8px; margin-top: 8px; font-weight: bold; color: #c41e3a;">
                <span>Total Deductions</span>
                <span>${totalDeductions.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="background-color: #1e5a96; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Net Salary Payable</div>
            <div style="font-size: 32px; font-weight: bold;">KES ${netSalary.toLocaleString()}</div>
          </div>
          <div style="text-align: right; font-size: 11px; opacity: 0.7;">
            <div>Run ID: ${record.id?.slice(0, 8).toUpperCase() || 'N/A'}</div>
            <div>Processed: ${record.processedAt ? new Date(record.processedAt).toLocaleDateString() : (record.createdAt ? new Date(record.createdAt).toLocaleDateString() : new Date().toLocaleDateString())}</div>
          </div>
        </div>

        <div style="text-align: center; font-size: 11px; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px;">
          <p style="margin: 5px 0;">This is a computer-generated document for ${brand.entityName || 'Company'}.</p>
          <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${brand.entityName || 'Company'}. Powered by PayrollPro Systems.</p>
        </div>
      </div>
    `;

    // PDF options – fixed orientation type
    const options = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: `payslip_${employee.id}.pdf`,
      image: { type: 'png' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        orientation: 'portrait' as const,  // ← this fixes the TS2345 error
        unit: 'mm',
        format: 'a4'
      },
    };

    // Generate PDF
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    
    await html2pdf().set(options).from(element).save();
    console.log('Payslip PDF exported successfully');
  } catch (error) {
    console.error('Error exporting payslip to PDF:', error);
    throw error;
  }
};