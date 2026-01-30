import React from 'react';
import { Employee, PayrollRecord, BrandSettings } from '../types';

interface Props {
  employee: Employee;
  record: PayrollRecord;
  brand: BrandSettings;
}

const Payslip: React.FC<Props> = ({ employee, record, brand }) => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = monthNames[record.month];
  const currentYear = record.year;

  return (
    <div className="bg-white p-8 max-w-2xl mx-auto border shadow-sm print:shadow-none print:border-none">
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PAYSLIP</h1>
          <p className="text-slate-500 text-sm">{currentMonth}, {currentYear}</p>
        </div>
        <div className="text-right flex items-center gap-3">
          <div className="text-right">
            <div className="font-bold text-slate-700">{brand.entityName}</div>
            <p className="text-[10px] text-slate-400 max-w-[150px]">{brand.address}</p>
          </div>
          {brand.logoUrl && <img src={brand.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between border-b pb-1">
            <span className="text-slate-400 text-xs">Payroll No:</span> 
            <span className="font-black text-xs custom-theme-text">{employee.payrollNumber}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-slate-400 text-xs">Employee:</span> 
            <span className="font-semibold text-xs">
              {employee.firstName} {employee.lastName} 
            </span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="text-slate-400 text-xs">Employee PIN:</span> 
            <span className="font-semibold text-xs">{employee.kraPin}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400 text-xs">NSSF Number:</span> <span className="font-semibold text-xs">{employee.nssfNumber}</span></div>
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400 text-xs">SHA Number:</span> <span className="font-semibold text-xs">{employee.nhifNumber}</span></div>
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400 text-xs">Period Ref:</span> <span className="font-bold text-[9px] uppercase">{record.payrollRef}</span></div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Earnings</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span>Basic Salary</span> <span>{employee.basicSalary.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs"><span>Benefits / Allowances</span> <span>{(record.benefits || 0).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold border-t pt-2 text-slate-800 text-sm"><span>Gross Salary</span> <span>{record.grossSalary.toLocaleString()}</span></div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-3">Deductions</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600"><span>PAYE Tax</span> <span>{record.paye.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs text-slate-600"><span>NSSF Tier I & II</span> <span>{record.nssf.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs text-slate-600"><span>Social Health Authority (SHA)</span> <span>{record.sha.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs text-slate-600"><span>Affordable Housing Levy</span> <span>{record.housingLevy.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold border-t pt-2 text-red-600 text-sm"><span>Total Deductions</span> <span>{(record.grossSalary - record.netSalary).toLocaleString()}</span></div>
          </div>
        </div>

        <div className="p-6 rounded-2xl flex justify-between items-center" style={{ backgroundColor: brand.primaryColor, color: 'white' }}>
          <div>
            <div className="text-[10px] opacity-70 uppercase font-black tracking-widest">Net Salary Payable</div>
            <div className="text-2xl font-black">KES {record.netSalary.toLocaleString()}</div>
          </div>
          <div className="text-right text-[10px] opacity-60 font-bold">
            Run ID: {record.id.slice(0, 8).toUpperCase()}<br/>
            Processed: {new Date(record.processedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-[9px] text-slate-400 italic">
        This is a computer-generated document for {brand.entityName}. <br/>
        &copy; {new Date().getFullYear()} {brand.entityName}. Powered by PayrollPro Systems.
      </div>
    </div>
  );
};

export default Payslip;