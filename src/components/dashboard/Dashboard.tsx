import React, { useMemo, useState } from 'react';
import { ShieldCheck, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePayroll } from '../hooks/usePayroll';
import { useEmployees } from '../hooks/useEmployees';
import { useBrandSettings } from '../hooks/useBrandSettings';
import { useLeaveRequests } from '../hooks/useLeaveRequests';
import StatsOverview from './StatsOverview';
import AuditLedger from './AuditLedger';
import EmployeeImportModal from '../employees/EmployeeImportModal';
import { Employee } from '../../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { payrollHistory, stats } = usePayroll();
  const { employees, refetch } = useEmployees();
  const { brandSettings } = useBrandSettings();
  const { leaveRequests, isLoading: leaveLoading, error: leaveError } = useLeaveRequests();
  const [showImportModal, setShowImportModal] = useState(false);

  // Safety check to prevent crash if user isn't loaded yet
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-slate-400 font-medium">Loading Organization Pulse...</div>
      </div>
    );
  }

  const accessiblePayroll = useMemo(() => {
    if (user?.role === 'admin' || user?.role === 'tax' || user?.role === 'manager') 
      return payrollHistory;
    return payrollHistory.filter(p => p.employeeId === user?.employeeId);
  }, [payrollHistory, user]);

  const leaveStats = useMemo(() => {
    if (!leaveRequests) return { pending: 0, approvedThisMonth: 0 };
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const pending = leaveRequests.filter(r => r.status === 'pending').length;
    const approvedThisMonth = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      const start = new Date(r.start_date);
      return start.getMonth() === thisMonth && start.getFullYear() === thisYear;
    }).length;

    return { pending, approvedThisMonth };
  }, [leaveRequests]);

  const handleBulkImport = async (employeesToImport: Partial<Employee>[]) => {
    const { apiService } = await import('../../services/apiService');
    let successCount = 0;
    let failCount = 0;

    for (const employee of employeesToImport) {
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
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            {user.role !== 'staff' ? 'Organization Pulse' : `Hello, ${user.firstName}`}
          </h2>
          <p className="text-slate-500 text-sm md:text-lg mt-1">
            {user.role !== 'staff' ? 'Payroll and compliance monitoring.' : 'Personal earnings summary.'}
          </p>
        </div>
        
        {user.role !== 'staff' && (
          <div className="bg-white px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="bg-blue-50 p-2 md:p-3 rounded-xl font-black text-blue-600 text-xs md:text-base">KES</div>
            <div>
              <div className="text-[8px] md:text-[10px] text-slate-400 uppercase font-black">Gross Liability</div>
              <div className="text-lg md:text-2xl font-black text-slate-800">
                {stats.totalGross.toLocaleString()}
              </div>
            </div>
          </div>
        )}
        </div>

          {/* Stats Overview Grid */}
          <StatsOverview />

      {/* Leave Overview Card – Admin/Manager Only */}
      {user.role !== 'staff' && (
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4">Leave Overview</h3>
          
          {leaveLoading ? (
            <p className="text-slate-500">Loading leave data...</p>
          ) : leaveError ? (
            <p className="text-red-600">Failed to load leave requests</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-5 rounded-xl text-center">
                <div className="text-3xl md:text-4xl font-black text-blue-700">
                  {leaveStats.pending}
                </div>
                <div className="text-sm md:text-base text-slate-600 mt-1">Pending Requests</div>
              </div>
              
              <div className="bg-green-50 p-5 rounded-xl text-center">
                <div className="text-3xl md:text-4xl font-black text-green-700">
                  {leaveStats.approvedThisMonth}
                </div>
                <div className="text-sm md:text-base text-slate-600 mt-1">Approved This Month</div>
              </div>

              <div className="bg-amber-50 p-5 rounded-xl text-center col-span-2 md:col-span-1">
                <div className="text-3xl md:text-4xl font-black text-amber-700">
                  {employees?.length || 0}
                </div>
                <div className="text-sm md:text-base text-slate-600 mt-1">Total Employees</div>
              </div>

              <div className="bg-purple-50 p-5 rounded-xl text-center col-span-2 md:col-span-1">
                <div className="text-3xl md:text-4xl font-black text-purple-700">
                  {stats.totalEmployees || employees?.length || 0}
                </div>
                <div className="text-sm md:text-base text-slate-600 mt-1">Active Staff</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Management Actions – Admin/Manager Only */}
      {user.role !== 'staff' && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Employee Management</h3>
              <p className="text-sm text-slate-600">Bulk import employees from Excel files to populate the roster.</p>
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
            >
              <Upload size={20} />
              Import Employees
            </button>
          </div>
        </div>
      )}

      {/* Audit and Security Section */}
      {user.role !== 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
          <div className="lg:col-span-2">
            <AuditLedger />
          </div>
          
          <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl hidden md:block">
            <div className="absolute top-0 right-0 p-10 opacity-10 text-blue-400">
              <ShieldCheck size={180} />
            </div>
            <h3 className="text-xl font-bold mb-4 relative">Security</h3>
            <p className="text-slate-300 text-sm font-medium mb-8 relative leading-relaxed">
              Encrypted audit trails and tiered RBAC systems ensure data integrity.
            </p>
            <div className="space-y-4 relative">
              {['Sync Active', 'Audit Encrypted', 'SHA Validated'].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                  <div className="text-[10px] font-black uppercase tracking-widest">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <EmployeeImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
};

export default Dashboard;