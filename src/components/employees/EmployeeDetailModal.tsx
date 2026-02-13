// src/components/employees/EmployeeDetailModal.tsx
import React, { useState } from 'react';
import { 
  X, 
  User as UserIcon, 
  Briefcase, 
  PlaneTakeoff, 
  BrainCircuit, 
  Info, 
  Lightbulb, 
  FileSearch, 
  Loader2, 
  FileText as FileIcon, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import type { Employee } from '../../types';
import { useBrandSettings } from '../hooks/useBrandSettings';
import { calculatePayroll } from '../../utils/calculations';
import { geminiService } from '../../services/geminiService';
import DetailRow from '../shared/DetailRow';

interface EmployeeDetailModalProps {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
  onTerminate: (employeeId: string) => void;
  userRole: string;
}

const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  onClose,
  onEdit,
  onTerminate,
  userRole,
}) => {
  const { brandSettings } = useBrandSettings();
  const [aiInsight, setAiInsight] = useState('');
  const [taxOptimizationAdvice, setTaxOptimizationAdvice] = useState('');
  const [p9Breakdown, setP9Breakdown] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingTaxAdvice, setLoadingTaxAdvice] = useState(false);
  const [loadingP9Breakdown, setLoadingP9Breakdown] = useState(false);

  const getAiTaxAdvice = async () => {
    setLoadingAi(true);
    setAiInsight('');
    try {
      const calcs = calculatePayroll(employee.basicSalary, employee.benefits);
      const explanation = await geminiService.explainDeductions(
        employee.basicSalary + (employee.benefits || 0),
        calcs
      );
      setAiInsight(explanation || 'No insight available.');
    } catch (error) {
      console.error('AI Tax Advice Error:', error);
      setAiInsight('Could not generate insights at this time.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGetTaxOptimization = async () => {
    setLoadingTaxAdvice(true);
    setTaxOptimizationAdvice('');
    try {
      const calcs = calculatePayroll(employee.basicSalary, employee.benefits);
      const advice = await geminiService.getTaxOptimizationAdvice(
        employee.basicSalary,
        employee.benefits,
        calcs
      );
      setTaxOptimizationAdvice(advice || 'No optimization advice available at this time.');
    } catch (error) {
      console.error('Tax Optimization Error:', error);
      setTaxOptimizationAdvice('Could not retrieve optimization tips.');
    } finally {
      setLoadingTaxAdvice(false);
    }
  };

  const handleGenerateP9Breakdown = async () => {
    setLoadingP9Breakdown(true);
    setP9Breakdown('');
    try {
      const calcs = calculatePayroll(employee.basicSalary, employee.benefits);
      const breakdown = await geminiService.generateP9Breakdown(
        `${employee.firstName} ${employee.lastName}`,
        employee.basicSalary,
        employee.benefits,
        calcs
      );
      setP9Breakdown(breakdown || 'No P9 breakdown available.');
    } catch (error) {
      console.error('P9 Breakdown Error:', error);
      setP9Breakdown('Could not generate P9 breakdown.');
    } finally {
      setLoadingP9Breakdown(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1500] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
      <div className="bg-white rounded-t-[30px] md:rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 flex flex-col h-[95vh] md:max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-6 md:p-8 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-3xl font-black shrink-0"
              style={{ backgroundColor: brandSettings.primaryColor }}
            >
              {employee.firstName[0]}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg md:text-2xl font-black truncate">
                {employee.firstName} {employee.lastName}
              </h3>
              <div className="text-slate-400 text-[10px] font-bold mt-1">
                Payroll No: {employee.payrollNumber}
              </div>
              <div className="text-slate-300 text-[9px] font-bold mt-0.5">
                {employee.designation || employee.position || 'Staff'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-6 md:space-y-8 bg-slate-50/50">
          {/* Personal & Compensation Info */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserIcon size={12} /> Personal
              </h4>
              <div className="space-y-2 md:space-y-3">
                <DetailRow
                  label="Full Name"
                  value={`${employee.firstName} ${employee.lastName}`}
                />
                <DetailRow
                  label="Designation"
                  value={employee.designation || employee.position || 'Not specified'}
                />
                <DetailRow label="Payroll Number" value={employee.payrollNumber} />
                <DetailRow label="KRA PIN" value={employee.kraPin} />
                <DetailRow label="Email" value={employee.email} />
                <DetailRow label="NSSF Number" value={employee.nssfNumber || 'N/A'} />
                <DetailRow label="NHIF/SHA" value={employee.nhifNumber || 'N/A'} />
              </div>
            </div>
            <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Briefcase size={12} /> Compensation
              </h4>
              <div className="space-y-2 md:space-y-3">
                <DetailRow
                  label="Base Salary"
                  value={`KES ${employee.basicSalary.toLocaleString()}`}
                />
                <DetailRow
                  label="Benefits"
                  value={`KES ${(employee.benefits || 0).toLocaleString()}`}
                />
                <DetailRow
                  label="Gross Pay"
                  value={`KES ${(employee.basicSalary + (employee.benefits || 0)).toLocaleString()}`}
                />
                <DetailRow label="Joined Date" value={new Date(employee.joinedDate).toLocaleDateString()} />
                {employee.terminatedAt && (
                  <DetailRow
                    label="Termination Date"
                    value={new Date(employee.terminatedAt).toLocaleDateString()}
                  />
                )}
                {employee.terminationReason && (
                  <DetailRow label="Termination Reason" value={employee.terminationReason} />
                )}
              </div>
            </div>
          </section>

          {/* Leave Balance */}
          <section className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <PlaneTakeoff size={12} /> Leave Balance
            </h4>
            <div className="grid grid-cols-3 gap-2 md:gap-6">
              <div className="text-center p-2 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl">
                <div className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase mb-1">
                  Total
                </div>
                <div className="text-base md:text-2xl font-black text-slate-800">
                  {employee.totalLeaveDays || 21}
                </div>
              </div>
              <div className="text-center p-2 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl">
                <div className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase mb-1">
                  Used
                </div>
                <div className="text-base md:text-2xl font-black text-slate-800">
                  {(employee.totalLeaveDays || 21) - (employee.remainingLeaveDays || 0)}
                </div>
              </div>
              <div
                className="text-center p-2 md:p-4 rounded-xl md:rounded-2xl text-white shadow-lg"
                style={{ backgroundColor: brandSettings.primaryColor }}
              >
                <div className="text-[7px] md:text-[9px] font-black opacity-70 uppercase mb-1">
                  Net
                </div>
                <div className="text-base md:text-2xl font-black">
                  {employee.remainingLeaveDays || 0}
                </div>
              </div>
            </div>
          </section>

          {/* AI Intelligence Section */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <BrainCircuit size={14} style={{ color: brandSettings.primaryColor }} /> AI Intelligence
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={getAiTaxAdvice}
                disabled={loadingAi}
                className="bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-[8px] md:text-[10px] uppercase shadow-sm flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
              >
                {loadingAi ? <Loader2 className="animate-spin" size={12} /> : <Info size={12} />}
                <span>Analytic</span>
              </button>
              <button
                onClick={handleGetTaxOptimization}
                disabled={loadingTaxAdvice}
                className="bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-[8px] md:text-[10px] uppercase shadow-sm flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
              >
                {loadingTaxAdvice ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <Lightbulb size={12} />
                )}
                <span>Savings</span>
              </button>
              <button
                onClick={handleGenerateP9Breakdown}
                disabled={loadingP9Breakdown}
                className="py-3 rounded-xl font-bold text-[8px] md:text-[10px] uppercase shadow-lg flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
                style={{ backgroundColor: brandSettings.primaryColor, color: 'white' }}
              >
                {loadingP9Breakdown ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <FileSearch size={12} />
                )}
                <span>Tax Audit</span>
              </button>
            </div>
            {(aiInsight || taxOptimizationAdvice || p9Breakdown) && (
              <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                {aiInsight && (
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-[10px] md:text-xs text-slate-600 leading-relaxed italic">
                    "{aiInsight}"
                  </div>
                )}
                {taxOptimizationAdvice && (
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-[10px] md:text-xs text-indigo-900 leading-relaxed whitespace-pre-wrap">
                    {taxOptimizationAdvice}
                  </div>
                )}
                {p9Breakdown && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-[10px] md:text-[11px] text-emerald-900 leading-relaxed whitespace-pre-wrap font-mono">
                    {p9Breakdown}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-8 border-t border-slate-100 bg-white grid grid-cols-2 md:flex gap-3 md:gap-4 shrink-0">
          <button
            onClick={() => {
              // Handle payslip viewing - could open a new modal or navigate
              alert('Payslip viewing functionality would be implemented here');
            }}
            className="bg-slate-900 text-white font-black py-4 rounded-xl md:rounded-2xl uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2"
          >
            <FileIcon size={16} /> Payslip
          </button>
          {(userRole === 'admin' || userRole === 'manager') && (
            <>
              <button
                onClick={onEdit}
                className="bg-slate-100 text-slate-600 font-black py-4 rounded-xl md:rounded-2xl uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2"
              >
                <Edit2 size={16} /> Edit
              </button>
              {employee.isActive !== false && (
                <button
                  onClick={() => onTerminate(employee.id)}
                  className="bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl md:rounded-2xl uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2 shadow-xl"
                >
                  <Trash2 size={16} /> Terminate
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="col-span-2"
            style={{
              backgroundColor: brandSettings.primaryColor,
              color: 'white',
            }}
          >
            <span className="font-black py-4 rounded-xl md:rounded-2xl shadow-xl uppercase tracking-widest text-[9px] md:text-xs block text-center">
              Close
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailModal;