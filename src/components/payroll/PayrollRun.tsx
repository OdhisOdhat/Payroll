// src/components/payroll/PayrollRun.tsx
import React, { useState, useMemo } from 'react';
import { Calendar, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { usePayroll } from '../hooks/usePayroll';
import { useEmployees } from '../hooks/useEmployees';
import { useAuth } from '../hooks/useAuth';
import { useBrandSettings } from '../hooks/useBrandSettings';
import type { PayrollRunParams } from '../../types';

const PayrollRun: React.FC = () => {
  const { runPayroll, isLoading: payrollLoading, error: payrollError } = usePayroll();
  const { employees } = useEmployees();
  const { user } = useAuth();
  const { brandSettings } = useBrandSettings();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<{
    success: boolean;
    message: string;
    recordsProcessed?: number;
  } | null>(null);

  // Get active employees for payroll run
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => emp.isActive !== false);
  }, [employees]);

  // Month names for display
  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => 
      new Date(0, i).toLocaleString('default', { month: 'long' })
    );
  }, []);

  // Current date validation
  const isFutureDate = useMemo(() => {
    const now = new Date();
    return selectedYear > now.getFullYear() || 
           (selectedYear === now.getFullYear() && selectedMonth > now.getMonth());
  }, [selectedMonth, selectedYear]);

  const handleRunPayroll = async () => {
    if (isFutureDate) {
      alert('Cannot run payroll for future dates. Please select current or past month.');
      return;
    }

    if (activeEmployees.length === 0) {
      alert('No active employees found. Please add employees before running payroll.');
      return;
    }

    if (!window.confirm(`Run payroll for ${monthNames[selectedMonth]} ${selectedYear} for ${activeEmployees.length} employees?`)) {
      return;
    }

    setIsRunning(true);
    setRunResult(null);

    try {
      const params: PayrollRunParams = {
        month: selectedMonth,
        year: selectedYear,
        employeeIds: activeEmployees.map(emp => emp.id)
      };

      const result = await runPayroll(params);
      
      setRunResult({
        success: true,
        message: `Successfully processed payroll for ${result.length} employees`,
        recordsProcessed: result.length
      });
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => setRunResult(null), 5000);
    } catch (error) {
      setRunResult({
        success: false,
        message: `Payroll run failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Only admins and managers can run payroll
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Access Restricted</h3>
        <p className="text-slate-600">
          Only administrators and managers can execute payroll runs.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="p-2 bg-blue-50 rounded-xl">
          <Calendar className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Execute Payroll Run</h2>
          <p className="text-sm text-slate-500 mt-1">
            Process salaries for all active employees for the selected period
          </p>
        </div>
      </div>

      {/* Result Notification */}
      {runResult && (
        <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
          runResult.success 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {runResult.success ? (
            <CheckCircle className="mt-0.5 flex-shrink-0" size={20} />
          ) : (
            <AlertCircle className="mt-0.5 flex-shrink-0" size={20} />
          )}
          <div>
            <p className="font-bold">{runResult.message}</p>
            {runResult.recordsProcessed && (
              <p className="text-sm opacity-80 mt-1">
                {runResult.recordsProcessed} employee records processed
              </p>
            )}
          </div>
        </div>
      )}

      {/* Payroll Period Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Select Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            disabled={isRunning || payrollLoading}
            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
          >
            {monthNames.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Select Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            disabled={isRunning || payrollLoading}
            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
          >
            {[2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Count & Validation */}
      <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-600">Active Employees</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {activeEmployees.length}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-600">Pay Period</p>
            <p className="text-lg font-black text-slate-800 mt-1">
              {monthNames[selectedMonth]} {selectedYear}
            </p>
          </div>
        </div>
        {isFutureDate && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Warning: Selected date is in the future. Payroll can only be processed for current or past periods.</span>
          </div>
        )}
      </div>

      {/* Execute Button */}
      <button
        onClick={handleRunPayroll}
        disabled={isRunning || payrollLoading || isFutureDate || activeEmployees.length === 0}
        className={`
          w-full py-4 px-6 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all
          ${
            isRunning || payrollLoading
              ? 'bg-slate-400 cursor-not-allowed'
              : isFutureDate || activeEmployees.length === 0
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl transform hover:-translate-y-0.5'
          }
        `}
      >
        {isRunning || payrollLoading ? (
          <>
            <Loader2 className="animate-spin" size={24} />
            <span>Processing Payroll...</span>
          </>
        ) : (
          <>
            <Play size={24} />
            <span>Execute Payroll Run for {monthNames[selectedMonth]} {selectedYear}</span>
          </>
        )}
      </button>

      {/* Footer Note */}
      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          <span className="font-bold">Note:</span> This action will calculate salaries, deductions, and generate payslips for all active employees. 
          Ensure all employee data and attendance records are up to date before proceeding.
        </p>
      </div>
    </div>
  );
};

export default PayrollRun;