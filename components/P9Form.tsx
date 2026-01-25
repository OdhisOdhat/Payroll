
import React from 'react';
import { Employee, PayrollRecord, BrandSettings } from '../types';

interface Props {
  employee: Employee;
  records: PayrollRecord[];
  brand: BrandSettings;
}

const P9Form: React.FC<Props> = ({ employee, records, brand }) => {
  const currentYear = new Date().getFullYear();
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Create full year data with historical benefits and NITA
  const yearlyData = months.map((monthName, idx) => {
    const record = records.find(r => r.month === idx && r.year === currentYear);
    return {
      month: monthName,
      gross: record?.grossSalary || 0,
      benefits: record?.benefits || 0,
      nssf: record?.nssf || 0,
      taxable: record?.taxableIncome || 0,
      paye: record?.paye || 0,
      relief: record?.personalRelief || 0,
      nita: record?.nita || 0,
    };
  });

  const totals = yearlyData.reduce((acc, curr) => ({
    gross: acc.gross + curr.gross,
    benefits: acc.benefits + curr.benefits,
    nssf: acc.nssf + curr.nssf,
    taxable: acc.taxable + curr.taxable,
    paye: acc.paye + curr.paye,
    relief: acc.relief + curr.relief,
    nita: acc.nita + curr.nita,
  }), { gross: 0, benefits: 0, nssf: 0, taxable: 0, paye: 0, relief: 0, nita: 0 });

  return (
    <div className="bg-white p-6 text-[10px] font-mono leading-tight max-w-5xl mx-auto border shadow-sm">
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        {brand.logoUrl && <img src={brand.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />}
        <div className="text-center flex-1">
          <h1 className="text-lg font-bold">KENYA REVENUE AUTHORITY</h1>
          <h2 className="text-sm font-bold">INCOME TAX DEPARTMENT</h2>
          <h3 className="text-xs">P.9A - TAX DEDUCTION CARD - YEAR {currentYear}</h3>
        </div>
        <div className="w-12"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 border p-4">
        <div>
          <div>Employer's Name: <span className="font-bold underline uppercase">{brand.entityName}</span></div>
          <div>Employer's PIN: <span className="font-bold underline">P012345678X</span></div>
        </div>
        <div>
          <div>Employee's Name: <span className="font-bold underline">{employee.lastName}, {employee.firstName}</span></div>
          <div>Employee's PIN: <span className="font-bold underline">{employee.kraPin}</span></div>
        </div>
      </div>

      <table className="w-full border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-50 border border-slate-300 text-center font-bold">
            <th className="border border-slate-300 p-1">MONTH</th>
            <th className="border border-slate-300 p-1">BASIC</th>
            <th className="border border-slate-300 p-1">BENEFITS</th>
            <th className="border border-slate-300 p-1">GROSS (A)</th>
            <th className="border border-slate-300 p-1">NSSF (B)</th>
            <th className="border border-slate-300 p-1">NITA (C)</th>
            <th className="border border-slate-300 p-1">TAXABLE (A-B)</th>
            <th className="border border-slate-300 p-1">TAX PAYABLE</th>
            <th className="border border-slate-300 p-1">RELIEF</th>
            <th className="border border-slate-300 p-1">PAYE (NET)</th>
          </tr>
        </thead>
        <tbody>
          {yearlyData.map((row, i) => (
            <tr key={i} className="border border-slate-300">
              <td className="border border-slate-300 p-1 font-bold">{row.month}</td>
              <td className="border border-slate-300 p-1 text-right">{row.gross > 0 ? (row.gross - row.benefits).toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right">{row.benefits > 0 ? row.benefits.toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right font-semibold">{row.gross > 0 ? row.gross.toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right">{row.nssf > 0 ? row.nssf.toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right">{row.nita > 0 ? row.nita.toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right">{row.taxable > 0 ? row.taxable.toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right">{row.paye > 0 ? (row.paye + row.relief).toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right">{row.relief > 0 ? row.relief.toLocaleString() : '-'}</td>
              <td className="border border-slate-300 p-1 text-right font-bold">{row.paye > 0 ? row.paye.toLocaleString() : '-'}</td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-bold">
            <td className="border border-slate-300 p-1">TOTALS</td>
            <td className="border border-slate-300 p-1 text-right">{(totals.gross - totals.benefits).toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right">{totals.benefits.toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right">{totals.gross.toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right">{totals.nssf.toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right">{totals.nita.toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right">{totals.taxable.toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right">{(totals.paye + totals.relief).toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right">{totals.relief.toLocaleString()}</td>
            <td className="border border-slate-300 p-1 text-right font-bold">{totals.paye.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-2 gap-8 border p-4">
        <div>
          <h4 className="font-bold underline mb-2">EMPLOYER CERTIFICATION</h4>
          <p>We certify that the above information is correct according to the records maintained by <span className="font-bold">{brand.entityName}</span>.</p>
          <div className="mt-8 border-t border-dotted w-48">Authorized Signature</div>
        </div>
        <div>
          <h4 className="font-bold underline mb-2">IMPORTANT NOTES</h4>
          <ul className="list-disc pl-4 space-y-1">
            <li>NSSF is tax-deductible up to Tier limits.</li>
            <li>NITA is a mandatory industrial training levy.</li>
            <li>Personal Relief is currently KES 2,400 per month.</li>
            <li>SHA (replaces NHIF) is at 2.75% of Gross.</li>
            <li>AHL (Housing Levy) is at 1.5% of Gross.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default P9Form;
