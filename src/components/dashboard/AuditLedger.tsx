// src/components/dashboard/AuditLedger.tsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  User
} from 'lucide-react';
import { usePayroll } from '../hooks/usePayroll';
import { useAuth } from '../hooks/useAuth';
import { useBrandSettings } from '../hooks/useBrandSettings';
import type { PayrollRecord } from '../../types';

const AuditLedger: React.FC = () => {
  const navigate = useNavigate();
  const { payrollHistory, isLoading } = usePayroll();
  const { user } = useAuth();
  const { brandSettings } = useBrandSettings();

  // Get most recent 5 records, sorted by creation date (newest first)
  const recentRecords = useMemo(() => {
    return [...payrollHistory]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [payrollHistory]);

  // Get status configuration
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          label: 'Completed',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          icon: <CheckCircle size={16} className="text-emerald-600" />
        };
      case 'processing':
        return {
          label: 'Processing',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          icon: <Clock size={16} className="text-amber-600" />
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          icon: <AlertTriangle size={16} className="text-rose-600" />
        };
      default:
        return {
          label: 'Pending',
          color: 'text-slate-500',
          bg: 'bg-slate-50',
          icon: <Clock size={16} className="text-slate-500" />
        };
    }
  };

  // Format currency consistently
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format date consistently
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get description text based on user role
  const getDescription = (record: PayrollRecord) => {
    if (user?.role === 'staff') {
      return 'Your payroll processed';
    }
    
    const employeeName = record.employeeName || 'Unknown Employee';
    const periodStart = new Date(record.payPeriodStart).toLocaleString('default', { month: 'short', year: 'numeric' });
    
    return `${employeeName} • ${periodStart}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-[380px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <FileText className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Audit Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recent payroll processing activity
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/payroll')}
          className="text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center gap-1 transition-colors"
          aria-label="View all payroll records"
        >
          View All
          <TrendingUp size={16} />
        </button>
      </div>

      {/* Records List */}
      <div className="flex-1">
        {recentRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8">
            <FileText size={48} className="mb-4 opacity-30" />
            <p className="text-center text-sm max-w-xs">
              No payroll records found. Process your first payroll run to see activity here.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {recentRecords.map((record) => {
              const statusConfig = getStatusConfig(record.status);
              const isStaffView = user?.role === 'staff';
              
              return (
                <div
                  key={record.id}
                  className={`
                    flex items-start justify-between p-4 rounded-xl border
                    transition-all duration-200 cursor-pointer
                    hover:border-slate-200 hover:shadow-sm
                    ${statusConfig.bg}
                  `}
                  onClick={() => navigate(`/reports?payslip=${record.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/reports?payslip=${record.id}`)}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${statusConfig.bg} mt-0.5`}>
                          {statusConfig.icon}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-800">
                            {isStaffView ? 'Your Payroll' : record.employeeName || 'Payroll Processed'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <span>{formatDate(record.createdAt)}</span>
                            {!isStaffView && record.employeeNumber && (
                              <>
                                <span>•</span>
                                <span className="font-medium">#{record.employeeNumber}</span>
                              </>
                            )}
                          </div>
                          {!isStaffView && (
                            <div className="text-[10px] text-slate-600 mt-1 flex items-center gap-1.5">
                              <User size={10} className="opacity-70" />
                              <span>
                                {new Date(record.payPeriodStart).toLocaleString('default', { 
                                  month: 'short', 
                                  year: 'numeric' 
                                })} Pay Period
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4 text-right">
                        <div className="font-black text-slate-800">
                          {formatCurrency(record.grossPay)}
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${statusConfig.color}`}>
                          {statusConfig.label}
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional details for admin/manager view */}
                    {!isStaffView && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-3 text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="font-bold">Net:</span> 
                            {formatCurrency(record.netPay)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-bold">Tax:</span> 
                            {formatCurrency(record.paye)}
                          </span>
                        </div>
                        <div className="text-amber-700 font-bold flex items-center gap-1">
                          <span>{record.absentDays || 0} Absent</span>
                          <span>•</span>
                          <span>{record.lateArrivals || 0} Late</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span>Completed</span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-3"></div>
          <span>Processing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>Data encrypted</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        </div>
      </div>
    </div>
  );
};

export default AuditLedger;