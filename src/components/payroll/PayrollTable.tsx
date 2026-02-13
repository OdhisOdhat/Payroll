// src/components/payroll/PayrollTable.tsx
import React, { useMemo } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Eye 
} from 'lucide-react';
import { usePayroll } from '../hooks/usePayroll';
import { useBrandSettings } from '../hooks/useBrandSettings';
import type { PayrollRecord } from '../../types';

interface PayrollTableProps {
  records: PayrollRecord[];
  onViewPayslip: (record: PayrollRecord) => void;
  onDownloadPayslip: (record: PayrollRecord) => void;
  isLoading?: boolean;
}

const PayrollTable: React.FC<PayrollTableProps> = ({
  records,
  onViewPayslip,
  onDownloadPayslip,
  isLoading = false,
}) => {
  const { generatePayslipPDF } = usePayroll();
  const { brandSettings } = useBrandSettings();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get status configuration
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          label: 'Completed',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          icon: <CheckCircle size={14} className="text-emerald-600" />
        };
      case 'processing':
        return {
          label: 'Processing',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          icon: <Clock size={14} className="text-amber-600" />
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          icon: <AlertTriangle size={14} className="text-rose-600" />
        };
      default:
        return {
          label: 'Pending',
          color: 'text-slate-500',
          bg: 'bg-slate-50',
          icon: <Clock size={14} className="text-slate-500" />
        };
    }
  };

  // Handle download payslip
  const handleDownload = async (record: PayrollRecord) => {
    try {
      const pdfBlob = await generatePayslipPDF(record);
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${record.employeeName}_${formatDate(record.payPeriodStart)}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      onDownloadPayslip(record);
    } catch (error) {
      console.error('Failed to download payslip:', error);
      alert('Failed to download payslip. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black">
              <th className="py-4 px-6">Payroll ID</th>
              <th className="py-4 px-6">Employee</th>
              <th className="py-4 px-6">Pay Period</th>
              <th className="py-4 px-6">Gross Pay</th>
              <th className="py-4 px-6">Net Pay</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((record) => {
                const statusConfig = getStatusConfig(record.status);
                return (
                  <tr
                    key={record.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="py-4 px-6 text-xs font-black" style={{ color: brandSettings.primaryColor }}>
                      PR-{record.id.substring(0, 6).toUpperCase()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: brandSettings.primaryColor }}
                        >
                          {record.employeeName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate">
                            {record.employeeName}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {record.employeeNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-600">
                      <div>{formatDate(record.payPeriodStart)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">to {formatDate(record.payPeriodEnd)}</div>
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-800">
                      {formatCurrency(record.grossPay)}
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-slate-800">
                      {formatCurrency(record.netPay)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewPayslip(record)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 transition-colors"
                          title="View payslip"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownload(record)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 transition-colors"
                          title="Download payslip"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-20 text-center text-slate-400 italic">
                  No payroll records found. Run payroll to generate records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayrollTable;