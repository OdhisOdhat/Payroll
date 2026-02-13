// src/components/leave/LeaveManagement.tsx
import React, { useState, useMemo } from 'react';
import { PlaneTakeoff, Plus, Download, Calendar, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLeaveRequests } from '../hooks/useLeaveRequests';
import { useEmployees } from '../hooks/useEmployees';
import { useBrandSettings } from '../hooks/useBrandSettings';
import LeaveRequestsTable from './LeaveRequestsTable';
import LeaveRequestForm from './LeaveRequestForm';
import LeaveEntitlementCard from './LeaveEntitlementCard';
import type { LeaveRequest, LeaveStatus } from '../../types';

const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const { 
    leaveRequests, 
    pendingRequests, 
    approvedRequests, 
    rejectedRequests,
    submitLeaveRequest,
    updateLeaveRequest,
    isLoading 
  } = useLeaveRequests();
  const { employees } = useEmployees();
  const { brandSettings } = useBrandSettings();
  
  // Modal states
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  
  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<LeaveStatus | ''>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get current user's leave requests
  const currentUserRequests = useMemo(() => {
    return leaveRequests.filter(req => req.employeeId === user?.employeeId);
  }, [leaveRequests, user]);

  // Get all employees for admin/manager view
  const accessibleEmployees = useMemo(() => {
    if (user?.role === 'admin' || user?.role === 'manager') {
      return employees.filter(emp => emp.isActive !== false);
    }
    return [];
  }, [employees, user]);

  // Filter leave requests based on role and filters
  const filteredRequests = useMemo(() => {
    let filtered = leaveRequests;
    
    // Role-based filtering
    if (user?.role === 'staff') {
      filtered = currentUserRequests;
    }
    
    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(req => req.status === selectedStatus);
    }
    
    // Employee filter (admin/manager only)
    if (selectedEmployee && (user?.role === 'admin' || user?.role === 'manager')) {
      filtered = filtered.filter(req => req.employeeId === selectedEmployee);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req => {
        const employee = employees.find(emp => emp.id === req.employeeId);
        return (
          employee?.firstName.toLowerCase().includes(term) ||
          employee?.lastName.toLowerCase().includes(term) ||
          req.reason.toLowerCase().includes(term) ||
          req.type.toLowerCase().includes(term)
        );
      });
    }
    
    return filtered;
  }, [leaveRequests, currentUserRequests, selectedStatus, selectedEmployee, searchTerm, user, employees]);

  // Handle new leave request submission
  const handleRequestSubmit = async (formData: {
    startDate: string;
    endDate: string;
    type: string;
    reason: string;
  }) => {
    try {
      await submitLeaveRequest({
        employeeId: user!.employeeId!,
        ...formData,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      });
      setShowRequestForm(false);
      setEditingRequest(null);
      alert('Leave request submitted successfully!');
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      alert('Failed to submit leave request. Please try again.');
    }
  };

  // Handle approve/reject actions
  const handleApprove = async (requestId: string) => {
    if (!window.confirm('Approve this leave request?')) return;
    
    try {
      await updateLeaveRequest(requestId, { status: 'approved' });
      alert('Leave request approved successfully!');
    } catch (error) {
      console.error('Failed to approve leave request:', error);
      alert('Failed to approve leave request. Please try again.');
    }
  };

  // Handle reject action
  const handleReject = async (requestId: string) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await updateLeaveRequest(requestId, { 
        status: 'rejected',
        rejectionReason: reason 
      });
      alert('Leave request rejected successfully!');
    } catch (error) {
      console.error('Failed to reject leave request:', error);
      alert('Failed to reject leave request. Please try again.');
    }
  };

  // Handle edit action
  const handleEdit = (request: LeaveRequest) => {
    setEditingRequest(request);
    setShowRequestForm(true);
  };

  // Handle cancel action
  const handleCancel = async (requestId: string) => {
    if (!window.confirm('Cancel this leave request?')) return;
    
    try {
      await updateLeaveRequest(requestId, { status: 'cancelled' });
      alert('Leave request cancelled successfully!');
    } catch (error) {
      console.error('Failed to cancel leave request:', error);
      alert('Failed to cancel leave request. Please try again.');
    }
  };

  // Handle export
  const handleExport = () => {
    // Convert data to CSV
    const csvData = filteredRequests.map(req => {
      const employee = employees.find(emp => emp.id === req.employeeId);
      return {
        'Employee Name': `${employee?.firstName} ${employee?.lastName}`,
        'Employee Number': employee?.payrollNumber,
        'Leave Type': req.type,
        'Start Date': req.startDate,
        'End Date': req.endDate,
        'Days': req.days,
        'Status': req.status,
        'Reason': req.reason,
        'Submitted At': new Date(req.submittedAt).toLocaleDateString(),
      };
    });

    // Convert to CSV string
    const csv = [
      Object.keys(csvData[0] || {}),
      ...csvData.map(row => Object.values(row))
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leave_Requests_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">Leave Management</h2>
          <p className="text-slate-500 text-sm mt-1">
            {user?.role === 'staff'
              ? 'Submit and track your leave requests'
              : 'Manage and approve employee leave requests'}
          </p>
        </div>
        <div className="flex gap-3">
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Download size={18} />
              Export
            </button>
          )}
          <button
            onClick={() => {
              setEditingRequest(null);
              setShowRequestForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
          >
            <Plus size={18} />
            New Request
          </button>
        </div>
      </div>

      {/* Leave Entitlement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <LeaveEntitlementCard
          title="Pending Requests"
          count={user?.role === 'staff' 
            ? currentUserRequests.filter(r => r.status === 'pending').length
            : pendingRequests.length
          }
          icon={<Clock size={24} className="text-amber-600" />}
          bgColor="bg-amber-50"
          textColor="text-amber-600"
        />
        <LeaveEntitlementCard
          title="Approved"
          count={user?.role === 'staff'
            ? currentUserRequests.filter(r => r.status === 'approved').length
            : approvedRequests.length
          }
          icon={<CheckCircle size={24} className="text-emerald-600" />}
          bgColor="bg-emerald-50"
          textColor="text-emerald-600"
        />
        <LeaveEntitlementCard
          title="Rejected"
          count={user?.role === 'staff'
            ? currentUserRequests.filter(r => r.status === 'rejected').length
            : rejectedRequests.length
          }
          icon={<XCircle size={24} className="text-rose-600" />}
          bgColor="bg-rose-50"
          textColor="text-rose-600"
        />
      </div>

      {/* Filters (Admin/Manager only) */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="text-blue-600" size={20} />
              <h3 className="text-lg font-bold text-slate-800">Filters</h3>
            </div>
            {(selectedStatus || selectedEmployee || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedStatus('');
                  setSelectedEmployee('');
                  setSearchTerm('');
                }}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as LeaveStatus | '')}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white"
              >
                <option value="">All Employees</option>
                {accessibleEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.payrollNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, reason, or leave type..."
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-medium text-slate-700 bg-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      <LeaveRequestsTable
        requests={filteredRequests}
        onApprove={handleApprove}
        onReject={handleReject}
        onEdit={handleEdit}
        onCancel={handleCancel}
        userRole={user?.role || 'staff'}
        isLoading={isLoading}
      />

      {/* Leave Request Form Modal */}
      {showRequestForm && (
        <LeaveRequestForm
          request={editingRequest}
          onSubmit={handleRequestSubmit}
          onClose={() => {
            setShowRequestForm(false);
            setEditingRequest(null);
          }}
          userRole={user?.role || 'staff'}
        />
      )}
    </div>
  );
};

export default LeaveManagement;