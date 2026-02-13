// src/components/employees/EmployeeSearch.tsx
import React from 'react';
import { Search } from 'lucide-react';

interface EmployeeSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EmployeeSearch: React.FC<EmployeeSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, designation, PIN or Payroll No...',
  className = '',
}) => {
  return (
    <div className={`flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200 ${className}`}>
      <div className="p-2">
        <Search className="text-slate-400" size={18} />
      </div>
      <input
        type="text"
        placeholder={placeholder}
        className="bg-transparent border-none focus:outline-none w-full text-sm font-medium"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search employees"
      />
    </div>
  );
};

export default EmployeeSearch;