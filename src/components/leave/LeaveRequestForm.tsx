// src/components/leave/LeaveRequestForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle } from 'lucide-react';
import { useBrandSettings } from '../hooks/useBrandSettings';
import type { LeaveRequest } from '../../types';

interface LeaveRequestFormProps {
  request?: LeaveRequest | null;
  onSubmit: (data: {
    startDate: string;
    endDate: string;
    type: string;
    reason: string;
  }) => void;
  onClose: () => void;
  userRole: string;
}

const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({
  request,
  onSubmit,
  onClose,
  userRole,
}) => {
  const { brandSettings } = useBrandSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: request?.startDate || '',
    endDate: request?.endDate || '',
    type: request?.type || 'Annual',
    reason: request?.reason || '',
  });
  const [days, setDays] = useState(0);

  // Calculate days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
      setDays(diffDays);
    } else {
      setDays(0);
    }
  }, [formData.startDate, formData.endDate]);

  // Initialize form data when editing
  useEffect(() => {
    if (request) {
      setFormData({
        startDate: request.startDate,
        endDate: request.endDate,
        type: request.type,
        reason: request.reason,
      });
    }
  }, [request]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.startDate || !formData.endDate) {
      alert('Please select both start and end dates.');
      return;
    }
    
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      alert('End date cannot be before start date.');
      return;
    }
    
    if (!formData.reason.trim()) {
      alert('Please provide a reason for your leave request.');
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      alert('Failed to submit leave request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
      <div className="bg-white rounded-t-[30px] md:rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95">
        {/* Header */}
        <div className="bg-slate-900 p-6 md:p-8 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl md:text-2xl font-black">
              {request ? 'Edit Leave Request' : 'Submit Leave Request'}
            </h3>
            <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[9px] md:text-[11px]">
              {request ? 'Update your leave details' : 'Plan your time off'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {/* Leave Type */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Leave Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm disabled:bg-slate-100"
            >
              <option value="Annual">Annual Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Maternity">Maternity Leave</option>
              <option value="Paternity">Paternity Leave</option>
              <option value="Compassionate">Compassionate Leave</option>
              <option value="Study">Study Leave</option>
              <option value="Unpaid">Unpaid Leave</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <Calendar size={12} className="inline mr-1 mb-0.5" /> Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                disabled={isLoading || (request?.status === 'approved' || request?.status === 'rejected')}
                className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm disabled:bg-slate-100"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <Calendar size={12} className="inline mr-1 mb-0.5" /> End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                disabled={isLoading || (request?.status === 'approved' || request?.status === 'rejected')}
                className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Duration */}
          {days > 0 && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Duration
                </span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-blue-600" size={16} />
                  <span className="text-lg font-black text-slate-800">{days} day{days > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Reason for Leave
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              disabled={isLoading || (request?.status === 'approved' || request?.status === 'rejected')}
              rows={4}
              placeholder="Please provide details about your leave request..."
              className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-sm disabled:bg-slate-100 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col md:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full md:w-auto px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-6 py-3 rounded-xl font-black shadow-lg uppercase tracking-widest text-sm"
              style={{
                backgroundColor: brandSettings.primaryColor,
                color: 'white',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Processing...
                </span>
              ) : request ? (
                'Update Request'
              ) : (
                'Submit Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestForm;