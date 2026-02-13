// src/components/employees/EmployeeActions.tsx
import React from 'react';
import { Plus, Upload, Download } from 'lucide-react';

interface EmployeeActionsProps {
  onImportCSV: () => void;
  onImportExcel: () => void;
  onExport: () => void;
  onAddEmployee: () => void;
  userRole: string;
  importLoading?: boolean;
}

const EmployeeActions: React.FC<EmployeeActionsProps> = ({
  onImportCSV,
  onImportExcel,
  onExport,
  onAddEmployee,
  userRole,
  importLoading = false,
}) => {
  const canManageEmployees = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-4">
      <button
        onClick={onImportCSV}
        disabled={importLoading}
        className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Import employees from CSV file"
      >
        <Upload size={16} />
        Import CSV
      </button>
      
      <button
        onClick={onImportExcel}
        disabled={importLoading}
        className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Import employees from Excel file"
      >
        <Upload size={16} />
        Import Excel
      </button>
      
      <button
        onClick={onExport}
        className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-slate-50 transition-colors"
        title="Export employee list"
      >
        <Download size={16} />
        Export
      </button>
      
      {canManageEmployees && (
        <button
          onClick={onAddEmployee}
          className="text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl font-bold col-span-2 text-xs hover:opacity-90 transition-opacity"
          style={{
            background: 'linear-gradient(135deg, var(--primary-color), var(--primary-color-dark))',
          }}
        >
          <Plus size={18} />
          Onboard Personnel
        </button>
      )}
    </div>
  );
};

export default EmployeeActions;