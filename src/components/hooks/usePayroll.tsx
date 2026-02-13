// src/hooks/usePayroll.ts
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from './useAuth';
import { useEmployees } from './useEmployees';
import type { PayrollRecord, PayrollStats, PayrollRunParams } from '../../types';

interface PayrollContextType {
  payrollHistory: PayrollRecord[];
  stats: PayrollStats;
  isLoading: boolean;
  error: string | null;
  runPayroll: (params: PayrollRunParams) => Promise<PayrollRecord[]>;
  refetch: () => Promise<void>;
  generatePayslipPDF: (record: PayrollRecord) => Promise<Blob>;
  generateP9Form: (employeeId: string, year: number) => Promise<Blob>;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const PayrollProvider = ({ children }: { children: React.ReactNode }) => {
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [stats, setStats] = useState<PayrollStats>({
    totalGross: 0,
    totalNet: 0,
    totalTax: 0,
    totalNhif: 0,
    totalNssf: 0,
    totalRelief: 0,
    totalPaye: 0,
    employeeCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { employees } = useEmployees();

  // Compute current month stats from payroll history
  const computeCurrentMonthStats = useCallback((records: PayrollRecord[]): PayrollStats => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthRecords = records.filter(record => {
      const payPeriod = new Date(record.payPeriodStart);
      return (
        payPeriod.getMonth() === currentMonth && 
        payPeriod.getFullYear() === currentYear
      );
    });

    return {
      totalGross: currentMonthRecords.reduce((sum, r) => sum + (r.grossPay || 0), 0),
      totalNet: currentMonthRecords.reduce((sum, r) => sum + (r.netPay || 0), 0),
      totalTax: currentMonthRecords.reduce((sum, r) => sum + (r.paye || 0), 0),
      totalNhif: currentMonthRecords.reduce((sum, r) => sum + (r.nhif || 0), 0),
      totalNssf: currentMonthRecords.reduce((sum, r) => sum + (r.nssf || 0), 0),
      totalRelief: currentMonthRecords.reduce((sum, r) => sum + (r.personalRelief || 0), 0),
      totalPaye: currentMonthRecords.reduce((sum, r) => sum + (r.paye || 0), 0),
      employeeCount: currentMonthRecords.length,
    };
  }, []);

  // Load payroll history and compute stats
  const loadPayrollHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await apiService.getPayrollHistory();
      
      // Role-based filtering (mirrors Dashboard logic)
      let filteredData = data;
      if (user?.role && !['admin', 'manager', 'tax'].includes(user.role)) {
        filteredData = data.filter(p => p.employeeId === user.employeeId);
      }
      
      setPayrollHistory(filteredData);
      setStats(computeCurrentMonthStats(filteredData));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load payroll data';
      console.error('Payroll load error:', errorMsg);
      setError(errorMsg);
      setPayrollHistory([]);
      setStats({
        totalGross: 0,
        totalNet: 0,
        totalTax: 0,
        totalNhif: 0,
        totalNssf: 0,
        totalRelief: 0,
        totalPaye: 0,
        employeeCount: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, computeCurrentMonthStats]);

  // Run payroll with optimistic update
  const runPayroll = useCallback(async (params: PayrollRunParams): Promise<PayrollRecord[]> => {
    setIsLoading(true);
    setError(null);
    
    // Optimistic UI: show loading state for affected employees
    const optimisticRecords: PayrollRecord[] = (params.employeeIds || employees
      .filter(e => e.isActive !== false)
      .map(e => e.id))
      .map(employeeId => ({
        id: `optimistic-${Date.now()}-${employeeId}`,
        employeeId,
        payPeriodStart: new Date(params.year, params.month, 1).toISOString(),
        payPeriodEnd: new Date(params.year, params.month + 1, 0).toISOString(),
        grossPay: 0,
        netPay: 0,
        status: 'processing' as const,
        createdAt: new Date().toISOString(),
        // Other fields with default values
        basicSalary: 0,
        allowances: 0,
        deductions: 0,
        paye: 0,
        nhif: 0,
        nssf: 0,
        personalRelief: 0,
        taxableIncome: 0,
        helb: 0,
        housingLevy: 0,
        employerNssf: 0,
        employerNhif: 0,
        pension: 0,
        otherDeductions: 0,
        bonus: 0,
        overtime: 0,
        commission: 0,
        advance: 0,
        loanRepayment: 0,
        absentDays: 0,
        lateArrivals: 0,
        employeeName: employees.find(e => e.id === employeeId)?.firstName || 'Processing...',
        employeeNumber: employees.find(e => e.id === employeeId)?.payrollNumber || '',
      }));

    // Update UI optimistically
    setPayrollHistory(prev => [...optimisticRecords, ...prev]);
    
    try {
      // Actual API call
      const newRecords = await apiService.runPayroll(params);
      
      // Remove optimistic records and add real ones
      setPayrollHistory(prev => {
        const withoutOptimistic = prev.filter(r => !r.id.startsWith('optimistic-'));
        return [...newRecords, ...withoutOptimistic];
      });
      
      // Recompute stats with new data
      setStats(prev => {
        const allRecords = [...newRecords, ...payrollHistory.filter(r => !r.id.startsWith('optimistic-'))];
        return computeCurrentMonthStats(allRecords);
      });
      
      return newRecords;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payroll run failed';
      console.error('Payroll run error:', errorMsg);
      setError(errorMsg);
      
      // Revert optimistic update on error
      setPayrollHistory(prev => prev.filter(r => !r.id.startsWith('optimistic-')));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [employees, payrollHistory, computeCurrentMonthStats]);

  // Generate payslip PDF
  const generatePayslipPDF = useCallback(async (record: PayrollRecord): Promise<Blob> => {
    try {
      return await apiService.generatePayslipPDF(record.id);
    } catch (err) {
      console.error('Payslip generation error:', err);
      throw new Error('Failed to generate payslip PDF');
    }
  }, []);

  // Generate P9 form
  const generateP9Form = useCallback(async (employeeId: string, year: number): Promise<Blob> => {
    try {
      return await apiService.generateP9Form(employeeId, year);
    } catch (err) {
      console.error('P9 form generation error:', err);
      throw new Error('Failed to generate P9 form');
    }
  }, []);

  // Initial load and refresh function
  useEffect(() => {
    loadPayrollHistory();
  }, [loadPayrollHistory]);

  const value = {
    payrollHistory,
    stats,
    isLoading,
    error,
    runPayroll,
    refetch: loadPayrollHistory,
    generatePayslipPDF,
    generateP9Form,
  };

  return (
    <PayrollContext.Provider value={value}>
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (!context) {
    throw new Error('usePayroll must be used within PayrollProvider');
  }
  return context;
};