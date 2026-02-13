// src/components/leave/LeaveRequestsTable.tsx
import React, { useMemo } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Edit2, 
  Trash2, 
  Calendar,
  User 
} from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useBrandSettings } from '../hooks/useBrandSettings';
import type { LeaveRequest, LeaveStatus } from '../../types';

interface LeaveRequestsTableProps {
  requests: LeaveRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onEdit: (request: LeaveRequest) => void;
  onCancel: (requestId: string) => void;
  userRole: string;
  isLoading?: boolean;
}

const LeaveRequestsTable: React.FC<LeaveRequestsTableProps> = ({
  requests,
  onApprove,
  onReject,
  onEdit,
  onCancel,
  userRole,
  isLoading = false,
}) => {
  const { employees } = useEmployees();
  const { brandSettings } = useBrandSettings();

  // Get status configuration
  const getStatusConfig = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          icon: <CheckCircle size={14} className="text-emerald-600" />
        };
      case 'rejected':
        return {
          label: 'Rejected',
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          icon: <XCircle size={14} className="text-rose-600" />
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'text-slate-500',
          bg: 'bg-slate-50',
          icon: <XCircle size={14} className="text-slate-500" />
        };
      default:
        return {
          label: 'Pending',
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          icon: <Clock size={14} className="text-amber-600" />
        };
    }
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

  // Get employee name
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
  };

  // Get employee number
  const getEmployeeNumber = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.payrollNumber || 'N/A';
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
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black">
              <th className="py-4 px-6">Request ID</th>
              {userRole !== 'staff' && (
                <th className="py-4 px-6">Employee</th>
              )}
              <th className="py-4 px-6">Leave Type</th>
              <th className="py-4 px-6">Period</th>
              <th className="py-4 px-6">Days</th>
              <th className="py-4 px-6">Reason</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length > 0 ? (
              requests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const canManage = userRole === 'admin' || userRole === 'manager';
                const isOwner = request.employeeId === employees.find(e => e.email === userRole)?.id;
                
                return (
                  <tr
                    key={request.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="py-4 px-6 text-xs font-black" style={{ color: brandSettings.primaryColor }}>
                      LR-{request.id.substring(0, 6).toUpperCase()}
                    </td>
                    
                    {userRole !== 'staff' && (
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: brandSettings.primaryColor }}
                          >
                            {getEmployeeName(request.employeeId).charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-xs truncate">
                              {getEmployeeName(request.employeeId)}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {getEmployeeNumber(request.employeeId)}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    
                    <td className="py-4 px-6">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black">
                        {request.type}
                      </span>
                    </td>
                    
                    <td className="py-4 px-6 text-xs font-bold text-slate-600">
                      <div>{formatDate(request.startDate)}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">to {formatDate(request.endDate)}</div>
                    </td>
                    
                    <td className="py-4 px-6 text-xs font-bold text-slate-800">
                      {request.days} days
                    </td>
                    
                    <td className="py-4 px-6 text-xs text-slate-600 max-w-xs truncate">
                      {request.reason}
                    </td>
                    
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && canManage && (
                          <>
                            <button
                              onClick={() => onApprove(request.id)}
                              className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 hover:text-emerald-700 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => onReject(request.id)}
                              className="p-2 hover:bg-rose-50 rounded-lg text-rose-600 hover:text-rose-700 transition-colors"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        
                        {request.status === 'pending' && (canManage || isOwner) && (
                          <button
                            onClick={() => onEdit(request)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        
                        {request.status === 'pending' && isOwner && (
                          <button
                            onClick={() => onCancel(request.id)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-700 transition-colors"
                            title="Cancel"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={userRole !== 'staff' ? 8 : 7} className="py-20 text-center text-slate-400 italic">
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaveRequestsTable;