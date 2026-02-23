import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEmployees } from '../hooks/useEmployees';
import { usePayroll } from '../hooks/usePayroll';
import { useBrandSettings } from '../hooks/useBrandSettings';
import Payslip from '../Payslip';
import P9Form from '../P9Form';
import { FileText, FileJson, Download } from 'lucide-react';
import { exportP9ToExcel } from '../../utils/p9ExportUtils';
import { exportPayslipToExcel } from '../../utils/payslipExportUtils';
import { exportPayslipToPDF } from '../../utils/payslipPdfExportUtils';

const PayrollReports: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { employees } = useEmployees();
  const { payrollHistory } = usePayroll();
  const { brandSettings } = useBrandSettings();

  const [viewType, setViewType] = useState<'payslip' | 'p9'>('payslip');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    searchParams.get('employee') || null
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    parseInt(searchParams.get('month') || String(new Date().getMonth())) 
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  );

  // Get all employees for dropdown
  const activeEmployees = useMemo(() => 
    employees.filter(e => e.isActive !== false).sort((a, b) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    ), 
    [employees]
  );

  // Get selected employee
  const selectedEmployee = useMemo(() =>
    selectedEmployeeId 
      ? employees.find(e => e.id === selectedEmployeeId)
      : activeEmployees[0],
    [selectedEmployeeId, employees, activeEmployees]
  );

  // Get payroll records for selected employee
  const employeeRecords = useMemo(() =>
    selectedEmployee
      ? payrollHistory.filter(r => r.employeeId === selectedEmployee.id)
      : [],
    [selectedEmployee, payrollHistory]
  );

  // Get current payslip record
  const currentRecord = useMemo(() =>
    employeeRecords.find(r => {
      const recordDate = new Date(r.payPeriodStart);
      return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
    }) || (employeeRecords.length > 0 ? employeeRecords[0] : null),
    [employeeRecords, selectedMonth, selectedYear]
  );

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const handleDownloadPDF = async () => {
    try {
      if (viewType !== 'payslip') {
        alert('PDF download is only available for Payslip');
        return;
      }
      if (!selectedEmployee) {
        alert('Please select an employee');
        return;
      }
      if (!currentRecord) {
        alert('No payroll record available for the selected month/year');
        return;
      }
      await exportPayslipToPDF(selectedEmployee, currentRecord, brandSettings);
      console.log('Payslip PDF exported successfully');
    } catch (error) {
      console.error('PDF export failed:', error);
      alert(`PDF download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownloadP9Excel = () => {
    try {
      if (!selectedEmployee) {
        alert('Please select an employee');
        return;
      }
      if (employeeRecords.length === 0) {
        alert('No payroll records available for this employee');
        return;
      }
      exportP9ToExcel(selectedEmployee, employeeRecords, brandSettings, selectedMonth, selectedYear);
      console.log('P9 Excel exported successfully');
    } catch (error) {
      console.error('P9 Excel export failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownloadPayslipExcel = () => {
    try {
      if (!selectedEmployee) {
        alert('Please select an employee');
        return;
      }
      if (!currentRecord) {
        alert('No payroll record available for the selected month/year');
        return;
      }
      exportPayslipToExcel(selectedEmployee, currentRecord, brandSettings);
      console.log('Payslip Excel exported successfully');
    } catch (error) {
      console.error('Payslip Excel export failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!selectedEmployee || !currentRecord) {
    return (
      <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 duration-500">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800">Reports & Compliance</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-500">No payroll records available. Run payroll first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800">Reports & Compliance</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Print
          </button>
          {viewType === 'payslip' && (
            <button
              onClick={handleDownloadPayslipExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Download Excel
            </button>
          )}
          {viewType === 'p9' && (
            <button
              onClick={handleDownloadP9Excel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Download Excel
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* View Type */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Document Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewType('payslip')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  viewType === 'payslip'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <FileText size={14} /> Payslip
              </button>
              <button
                onClick={() => setViewType('p9')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  viewType === 'p9'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <FileJson size={14} /> P9 Form
              </button>
            </div>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Employee</label>
            <select
              value={selectedEmployeeId || ''}
              onChange={(e) => {
                setSelectedEmployeeId(e.target.value);
                setSearchParams({ 
                  ...Object.fromEntries(searchParams), 
                  employee: e.target.value 
                });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {activeEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(parseInt(e.target.value));
                setSearchParams({
                  ...Object.fromEntries(searchParams),
                  month: e.target.value
                });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {months.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setSearchParams({
                  ...Object.fromEntries(searchParams),
                  year: e.target.value
                });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Document Display */}
      <div className="bg-slate-50 rounded-2xl p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        {viewType === 'payslip' ? (
          <Payslip 
            employee={selectedEmployee} 
            record={currentRecord}
            brand={brandSettings}
          />
        ) : (
          <P9Form 
            employee={selectedEmployee}
            records={employeeRecords}
            brand={brandSettings}
          />
        )}
      </div>
    </div>
  );
};

export default PayrollReports;
