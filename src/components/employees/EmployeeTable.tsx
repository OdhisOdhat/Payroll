// src/components/employees/EmployeeTable.tsx
import React from 'react';
import { Eye, Trash2 } from 'lucide-react';
import type { Employee } from '../../types';
import { useBrandSettings } from '../hooks/useBrandSettings';

interface EmployeeTableProps {
  employees: Employee[];
  onSelectEmployee: (employee: Employee) => void;
  onTerminateEmployee: (employeeId: string) => void;
  userRole: string;
  isLoading?: boolean;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onSelectEmployee,
  onTerminateEmployee,
  userRole,
  isLoading = false,
}) => {
  const { brandSettings } = useBrandSettings();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black">
              <th className="py-4 px-6">Payroll No.</th>
              <th className="py-4 px-6">Personnel</th>
              <th className="py-4 px-6">Company</th> {/* ← Added */}
              <th className="py-4 px-6">Designation</th>
              <th className="py-4 px-6">Identity (KRA)</th>
              <th className="py-4 px-6">Gross Pay</th>
              <th className="py-4 px-6">Leave</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6"></th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-all cursor-pointer"
                  onClick={() => onSelectEmployee(emp)}
                >
                  <td className="py-4 px-6 text-xs font-black" style={{ color: brandSettings.primaryColor }}>
                    {emp.payrollNumber}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: brandSettings.primaryColor }}
                      >
                        {emp.firstName?.[0] ?? ''}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate">
                          {(emp.firstName || '')} {(emp.lastName || '')}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{emp.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-xs font-bold text-slate-600">
                    {emp.companyName || 'N/A'} {/* ← Fixed: removed invalid emp.company_name */}
                  </td>
                  <td className="py-4 px-6 text-xs font-bold text-slate-600">
                    {emp.designation || emp.position || 'Staff'}
                  </td>
                  <td className="py-4 px-6 text-xs font-bold text-slate-600">{emp.kraPin}</td>
                  <td className="py-4 px-6 text-xs font-bold text-slate-800">
                    KES {(emp.basicSalary + (emp.benefits || 0)).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                        emp.remainingLeaveDays < 5
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {emp.remainingLeaveDays} Days
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        emp.isActive !== false
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {emp.isActive !== false ? 'Active' : 'Terminated'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Eye size={16} className="text-slate-300" />
                      {(userRole === 'admin' || userRole === 'manager') && emp.isActive !== false && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTerminateEmployee(emp.id);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-700 transition-colors"
                          title="Terminate employee"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-20 text-center text-slate-400 italic">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeTable;