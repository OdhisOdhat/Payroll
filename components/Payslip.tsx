
import React from 'react';
import { Employee, PayrollRecord } from '../types';

interface Props {
  employee: Employee;
  record: PayrollRecord;
}

const Payslip: React.FC<Props> = ({ employee, record }) => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-white p-8 max-w-2xl mx-auto border shadow-sm print:shadow-none print:border-none">
      <div className="flex justify-between items-start border-b pb-6 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">PAYSLIP</h1>
          <p className="text-slate-500 text-sm">{currentMonth}, {currentYear}</p>
        </div>
        <div className="text-right">
          <div className="font-bold text-slate-700">PayrollPro Services Ltd</div>
          <p className="text-xs text-slate-400">123 Nairobi, Kenya</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400">Employee Name:</span> <span className="font-semibold">{employee.firstName} {employee.lastName}</span></div>
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400">Employee PIN:</span> <span className="font-semibold">{employee.kraPin}</span></div>
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400">Employee ID:</span> <span className="font-semibold">#{employee.id}</span></div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400">NSSF Number:</span> <span className="font-semibold">{employee.nssfNumber}</span></div>
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400">SHA Number:</span> <span className="font-semibold">{employee.nhifNumber}</span></div>
          <div className="flex justify-between border-b pb-1"><span className="text-slate-400">Status:</span> <span className="font-semibold text-green-600">PROCESSED</span></div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Earnings</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Basic Salary</span> <span>{employee.basicSalary.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span>Benefits / Allowances</span> <span>{(employee.benefits || 0).toLocaleString()}</span></div>
            <div className="flex justify-between font-bold border-t pt-2 text-slate-800"><span>Gross Salary</span> <span>{record.grossSalary.toLocaleString()}</span></div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 mb-3">Deductions</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600"><span>PAYE Tax</span> <span>{record.paye.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm text-slate-600"><span>NSSF Tier I & II</span> <span>{record.nssf.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm text-slate-600"><span>Social Health Authority (SHA)</span> <span>{record.sha.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm text-slate-600"><span>Affordable Housing Levy</span> <span>{record.housingLevy.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold border-t pt-2 text-red-600"><span>Total Deductions</span> <span>{(record.grossSalary - record.netSalary).toLocaleString()}</span></div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center">
          <div>
            <div className="text-xs text-slate-400 uppercase font-bold tracking-widest">Net Salary Payable</div>
            <div className="text-3xl font-bold">KES {record.netSalary.toLocaleString()}</div>
          </div>
          <div className="text-right text-xs opacity-50">
            Payment Method: Bank Transfer<br/>
            Ref: PAY-{record.id}
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-[10px] text-slate-400 italic">
        This is a computer-generated document. No signature is required. <br/>
        &copy; {new Date().getFullYear()} PayrollPro Systems. Generated via AI-Insight Platform.
      </div>
    </div>
  );
};

export default Payslip;
