import React, { useState } from 'react';
import { Upload, Download, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useEmployees } from '../hooks/useEmployees';
import { useBrandSettings } from '../hooks/useBrandSettings';
import EmployeeSearch from './EmployeeSearch';
import EmployeeTable from './EmployeeTable';
import EmployeeFormModal from './EmployeeFormModal';
import EmployeeDetailModal from './EmployeeDetailModal';
import EmployeeImportModal from './EmployeeImportModal';
import { downloadCSV } from '../../utils/exportUtils';
import { parseEmployeeCSV } from '../../utils/importUtils';
import { apiService } from '../../services/apiService';
import { Employee } from '../../types';

const EmployeeList: React.FC = () => {
  const { user } = useAuth();
  const { employees, isLoading: employeesLoading, refetch } = useEmployees();
  const { brandSettings } = useBrandSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  // Filter employees based on role and search
  const accessibleEmployees = employees.filter(e => 
    (user?.role === 'admin' || user?.role === 'manager' || e.id === user?.employeeId) && 
    e.isActive !== false
  );

  const filteredEmployees = accessibleEmployees.filter(emp => {
    if (!searchQuery) return true;
    const term = searchQuery.toLowerCase();
    return (
      (emp.firstName || '').toLowerCase().includes(term) ||
      (emp.lastName || '').toLowerCase().includes(term) ||
      (emp.email || '').toLowerCase().includes(term) ||
      (emp.kraPin || '').toLowerCase().includes(term) ||
      (emp.payrollNumber || '').toLowerCase().includes(term) ||
      ((emp.designation || '').toLowerCase().includes(term))
    );
  });

  const handleExport = () => {
    downloadCSV(accessibleEmployees, `Employees_${new Date().toISOString()}.csv`);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedEmployeeIds.length === filteredEmployees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(filteredEmployees.map(e => e.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployeeIds.length === 0) return;

    if (!window.confirm(`Delete ${selectedEmployeeIds.length} selected employees? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteEmployeesBulk(selectedEmployeeIds);
      setSelectedEmployeeIds([]);
      await refetch();
      alert('Selected employees deleted successfully.');
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      alert(err?.message || 'Failed to delete selected employees.');
    }
  };

  const handleImportCSV = async (file: File) => {
    setImportLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result;
        const importedData = parseEmployeeCSV(typeof result === 'string' ? result : String(result));
        if (importedData.length === 0) {
          alert('No valid data found in CSV file.');
          return;
        }

        for (const entry of importedData) {
          try {
            await apiService.saveEmployee(entry);
          } catch (err) {
            console.warn('Failed to import employee:', err);
          }
        }

        await refetch();
        alert(`Successfully imported ${importedData.length} employees.`);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('CSV Import Error:', error);
      alert('Failed to import employees. Please check the file format.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleBulkImport = async (employees: Partial<Employee>[]) => {
    let successCount = 0;
    let failCount = 0;

    for (const employee of employees) {
      try {
        await apiService.saveEmployee(employee);
        successCount++;
      } catch (err) {
        console.error('Failed to import employee:', err);
        failCount++;
      }
    }

    // Refresh the employee list
    await refetch();

    if (failCount > 0) {
      throw new Error(`Imported ${successCount} employees, but ${failCount} failed.`);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800">Personnel Roster</h2>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-4">
          <button 
            onClick={() => setShowImportModal(true)} 
            className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-blue-50 transition-colors"
          >
            <Upload size={16} /> Import Excel
          </button>
          <button 
            onClick={() => document.getElementById('csv-import')?.click()} 
            className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button 
            onClick={handleExport} 
            className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Download size={16} /> Export
          </button>
          {(user.role === 'admin' || user.role === 'manager') && (
            <button 
              onClick={() => { setEditingEmployee(null); setShowAddEmployee(true); }} 
              className="custom-theme-bg text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl font-bold col-span-2 text-xs"
            >
              <Plus size={18} /> Onboard Personnel
            </button>
          )}
          {(user.role === 'admin') && selectedEmployeeIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl font-bold col-span-2 text-xs"
            >
              Delete Selected ({selectedEmployeeIds.length})
            </button>
          )}
        </div>
        <input
          id="csv-import"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportCSV(file);
          }}
        />
      </div>

      <EmployeeSearch value={searchQuery} onChange={setSearchQuery} />
      
      <EmployeeTable
        employees={filteredEmployees}
        onSelectEmployee={(emp) => {
          setSelectedEmployee(emp);
          setShowDetailModal(true);
        }}
        onTerminateEmployee={async (id) => {
          if (window.confirm('Terminate this employee? This will deactivate their record but preserve history.')) {
            const reason = window.prompt('Enter termination reason (optional):') || null;
            try {
              const token = localStorage.getItem('payroll_token');
              const response = await fetch(`http://127.0.0.1:4000/api/employees/${id}/terminate`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token && { 'Authorization': `Bearer ${token}` }),
                },
                body: JSON.stringify({ reason }),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to terminate employee');
              }

              await refetch();
              alert('Employee terminated successfully');
            } catch (error) {
              console.error('Terminate employee error:', error);
              alert(`Failed to terminate employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }}
        userRole={user.role}
        selectedIds={selectedEmployeeIds}
        onToggleSelect={user.role === 'admin' ? handleToggleSelect : undefined}
        onToggleSelectAll={user.role === 'admin' ? handleToggleSelectAll : undefined}
      />

      {showAddEmployee && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => {
            setShowAddEmployee(false);
            setEditingEmployee(null);
          }}
          onSuccess={refetch}
        />
      )}

      {showDetailModal && selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => {
            setEditingEmployee(selectedEmployee);
            setShowAddEmployee(true);
            setShowDetailModal(false);
          }}
          onTerminate={async () => {
            if (window.confirm('Terminate this employee? This will deactivate their record but preserve history.')) {
              const reason = window.prompt('Enter termination reason (optional):') || null;
              try {
                const token = localStorage.getItem('payroll_token');
                const response = await fetch(`http://127.0.0.1:4000/api/employees/${selectedEmployee.id}/terminate`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                  },
                  body: JSON.stringify({ reason }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to terminate employee');
                }

                setShowDetailModal(false);
                await refetch();
                alert('Employee terminated successfully');
              } catch (error) {
                console.error('Terminate employee error:', error);
                alert(`Failed to terminate employee: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          }}
          userRole={user.role}
        />
      )}

      <EmployeeImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
};

export default EmployeeList;