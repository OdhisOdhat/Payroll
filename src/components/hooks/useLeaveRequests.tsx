// src/components/hooks/useLeaveRequests.tsx
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from './useAuth';
import type { LeaveRequest, LeaveStatus } from '../../types';

interface LeaveContextType {
  leaveRequests: LeaveRequest[];
  pendingRequests: LeaveRequest[];
  approvedRequests: LeaveRequest[];
  rejectedRequests: LeaveRequest[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  submitLeaveRequest: (request: Partial<LeaveRequest>) => Promise<void>;
  updateLeaveStatus: (id: string, status: LeaveStatus, comment?: string) => Promise<void>;
  updateLeaveRequest: (id: string, updates: Partial<LeaveRequest>) => Promise<void>;
  cancelLeaveRequest: (id: string) => Promise<void>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider = ({ children }: { children: React.ReactNode }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const loadLeaveData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const requestsData = await apiService.getLeaveRequests();

      const filteredRequests = requestsData.filter(request => {
        if (['admin', 'manager'].includes(user?.role || '')) return true;
        return request.employeeId === user?.employeeId;
      });

      setLeaveRequests(filteredRequests);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load leave data';
      console.error('Leave data load error:', errorMsg);
      setError(errorMsg);
      setLeaveRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const submitLeaveRequest = useCallback(async (requestData: Partial<LeaveRequest>) => {
    setIsLoading(true);
    setError(null);
    
    const optimisticRequest: LeaveRequest = {
      ...(requestData as LeaveRequest),
      id: `optimistic-${Date.now()}`,
      status: 'pending',
      employeeId: requestData.employeeId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      daysRequested: calculateLeaveDays(requestData.startDate || '', requestData.endDate || ''),
    };
    
    setLeaveRequests(prev => [optimisticRequest, ...prev]);
    
    try {
      const newRequest = await apiService.submitLeaveRequest(requestData);
      
      setLeaveRequests(prev => 
        prev.map(req => 
          req.id === optimisticRequest.id ? newRequest : req
        ).filter(req => req.id !== optimisticRequest.id || !req.id.startsWith('optimistic-'))
      );
    } catch (err) {
      setLeaveRequests(prev => prev.filter(req => req.id !== optimisticRequest.id));
      
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit leave request';
      console.error('Leave submission error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLeaveStatus = useCallback(async (id: string, status: LeaveStatus, comment?: string) => {
    if (!['admin', 'manager'].includes(user?.role || '')) {
      throw new Error('Unauthorized: Only admins and managers can update leave status');
    }

    setIsLoading(true);
    setError(null);
    
    const currentRequest = leaveRequests.find(req => req.id === id);
    if (!currentRequest) throw new Error('Leave request not found');
    
    const optimisticUpdate = {
      ...currentRequest,
      status,
      updatedAt: new Date().toISOString(),
      ...(comment && { rejectionComment: comment })
    };
    
    setLeaveRequests(prev => 
      prev.map(req => req.id === id ? optimisticUpdate as LeaveRequest : req)
    );
    
    try {
      await apiService.updateLeaveStatus(id, status, currentRequest.employeeId, 0);
    } catch (err) {
      setLeaveRequests(prev => 
        prev.map(req => req.id === id ? currentRequest : req)
      );
      
      const errorMsg = err instanceof Error ? err.message : 'Failed to update leave status';
      console.error('Leave status update error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, leaveRequests]);

  const cancelLeaveRequest = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    const currentRequest = leaveRequests.find(req => req.id === id);
    if (!currentRequest) throw new Error('Leave request not found');
    
    if (currentRequest.status !== 'pending' && currentRequest.status !== 'approved') {
      throw new Error('Cannot cancel leave request that is already processed');
    }
    
    const optimisticUpdate = {
      ...currentRequest,
      status: 'cancelled' as LeaveStatus,
      updatedAt: new Date().toISOString(),
    };
    
    setLeaveRequests(prev => 
      prev.map(req => req.id === id ? optimisticUpdate as LeaveRequest : req)
    );
    
    try {
      // If you haven't implemented cancel yet, comment out or implement in apiService
      // await apiService.cancelLeaveRequest(id);
      console.warn('cancelLeaveRequest called but backend not implemented yet');
    } catch (err) {
      setLeaveRequests(prev => 
        prev.map(req => req.id === id ? currentRequest : req)
      );
      
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel leave request';
      console.error('Leave cancellation error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [leaveRequests]);

  const updateLeaveRequest = useCallback(async (id: string, updates: Partial<LeaveRequest>) => {
    setIsLoading(true);
    setError(null);

    const current = leaveRequests.find(r => r.id === id);
    if (!current) throw new Error('Leave request not found');

    const optimistic = { ...current, ...updates, updatedAt: new Date().toISOString() } as LeaveRequest;
    setLeaveRequests(prev => prev.map(r => r.id === id ? optimistic : r));

    try {
      // No backend call implemented for editing leave requests; preserve optimistic local change
      // If backend endpoint exists, call it here (e.g., apiService.updateLeaveRequest)
      return;
    } catch (err) {
      setLeaveRequests(prev => prev.map(r => r.id === id ? current : r));
      const errorMsg = err instanceof Error ? err.message : 'Failed to update leave request';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [leaveRequests]);

  const calculateLeaveDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    let workingDays = 0;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    
    return workingDays;
  };

  useEffect(() => {
    if (user) {
      loadLeaveData();
    }
  }, [user, loadLeaveData]);

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const approvedRequests = leaveRequests.filter(r => r.status === 'approved');
  const rejectedRequests = leaveRequests.filter(r => r.status === 'rejected');

  const value: LeaveContextType = {
    leaveRequests,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    isLoading,
    error,
    refetch: loadLeaveData,
    submitLeaveRequest,
    updateLeaveStatus,
    updateLeaveRequest,
    cancelLeaveRequest,
  };

  return (
    <LeaveContext.Provider value={value}>
      {children}
    </LeaveContext.Provider>
  );
};

export const useLeaveRequests = () => {
  const context = useContext(LeaveContext);
  if (!context) {
    throw new Error('useLeaveRequests must be used within LeaveProvider');
  }
  return context;
};