// src/components/payroll/PayrollFilters.tsx
import React from 'react';
import { 
  Filter, 
  Calendar, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X 
} from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import type { PayrollStatus } from '../../types';

interface PayrollFiltersProps {
  selectedMonth: number | null;
  selectedYear: number | null;
  selectedEmployee: string | null;
  selectedStatus: PayrollStatus | null;
  searchTerm: string;
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number | null) => void;
  onEmployeeChange: (employeeId: string | null) => void;
  onStatusChange: (status: PayrollStatus | null) => void;
  onSearchChange: (term: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const PayrollFilters: React.FC<PayrollFiltersProps> = ({
  selectedMonth,
  selectedYear,
  selectedEmployee,
  selectedStatus,
  searchTerm,
  onMonthChange,
  onYearChange,
  onEmployeeChange,
  onStatusChange,
  onSearchChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  const { employees } = useEmployees();
  
  // Month names for display
  const monthNames = Array.from({ length: 12 }, (_, i) => 
    new Date(0, i).toLocaleString('default', { month: 'short' })
  );

  const statusOptions = [
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-emerald-600' },
    { value: 'processing', label: 'Processing', icon: Clock, color: 'text-amber-600' },
    { value: 'failed', label: 'Failed', icon: AlertTriangle, color: 'text-rose-600' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="text-blue-600" size={20} />
          <h3 className="text-lg font-bold text-slate-800">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <X size={14} />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Month Filter */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            <Calendar size={12} className="inline mr-1 mb-0.5" /> Month
          </label>
          <select
            value={selectedMonth ?? ''}
            onChange={(e) => onMonthChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
          >
            <option value="">All Months</option>
            {monthNames.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            <Calendar size={12} className="inline mr-1 mb-0.5" /> Year
          </label>
          <select
            value={selectedYear ?? ''}
            onChange={(e) => onYearChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
          >
            <option value="">All Years</option>
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Employee Filter */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            <Search size={12} className="inline mr-1 mb-0.5" /> Employee
          </label>
          <select
            value={selectedEmployee ?? ''}
            onChange={(e) => onEmployeeChange(e.target.value || null)}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
          >
            <option value="">All Employees</option>
            {employees
              .filter(emp => emp.isActive !== false)
              .map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.payrollNumber})
                </option>
              ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Status
          </label>
          <select
            value={selectedStatus ?? ''}
            onChange={(e) => onStatusChange(e.target.value as PayrollStatus || null)}
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
          >
            <option value="">All Statuses</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            <Search size={12} className="inline mr-1 mb-0.5" /> Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Payroll #, Employee..."
            className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Active Filters Badges */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          {selectedMonth !== null && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center">
              Month: {monthNames[selectedMonth]}
              <button onClick={() => onMonthChange(null)} className="ml-1 hover:text-blue-900">
                <X size={12} />
              </button>
            </span>
          )}
          {selectedYear !== null && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center">
              Year: {selectedYear}
              <button onClick={() => onYearChange(null)} className="ml-1 hover:text-blue-900">
                <X size={12} />
              </button>
            </span>
          )}
          {selectedEmployee !== null && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center">
              Employee: {employees.find(e => e.id === selectedEmployee)?.firstName || 'Unknown'}
              <button onClick={() => onEmployeeChange(null)} className="ml-1 hover:text-blue-900">
                <X size={12} />
              </button>
            </span>
          )}
          {selectedStatus !== null && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center">
              Status: {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
              <button onClick={() => onStatusChange(null)} className="ml-1 hover:text-blue-900">
                <X size={12} />
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold flex items-center">
              Search: "{searchTerm}"
              <button onClick={() => onSearchChange('')} className="ml-1 hover:text-blue-900">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PayrollFilters;