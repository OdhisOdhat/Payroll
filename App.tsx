
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  Settings, 
  Plus, 
  Search,
  BrainCircuit,
  LogOut,
  ChevronRight,
  Printer,
  Database,
  Loader2,
  CloudOff,
  Cloud,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  User as UserIcon,
  CalendarDays,
  Edit2,
  Share2,
  Send,
  X,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  History,
  Activity,
  Info,
  Filter,
  ArrowUpDown,
  Calendar,
  Palette,
  Building2,
  ImageIcon,
  Save,
  PlaneTakeoff,
  Clock,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Lightbulb,
  Coins,
  ShieldQuestion,
  FileSearch,
  Scale,
  Briefcase,
  Fingerprint,
  Download,
  Upload,
  FileDown,
  FileText as FileIcon
} from 'lucide-react';
import { Employee, PayrollRecord, PayrollAudit, User, BrandSettings, LeaveRequest } from './types';
import { calculatePayroll } from './utils/calculations';
import { geminiService } from './services/geminiService';
import { apiService } from './services/apiService';
import { downloadCSV } from './utils/exportUtils';
import { downloadEmployeeTemplate, parseEmployeeCSV } from './utils/importUtils';
import Payslip from './components/Payslip';
import P9Form from './components/P9Form';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(apiService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'payroll' | 'reports' | 'settings' | 'leave'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<PayrollAudit[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    entityName: 'PayrollPro Kenya',
    logoUrl: '',
    primaryColor: '#2563eb',
    address: '123 Nairobi, Kenya'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [taxOptimizationAdvice, setTaxOptimizationAdvice] = useState<string>('');
  const [p9Breakdown, setP9Breakdown] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingTaxAdvice, setLoadingTaxAdvice] = useState(false);
  const [loadingP9Breakdown, setLoadingP9Breakdown] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'local' | 'error'>('online');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History Filtering & Sorting state
  const [payrollMonthFilter, setPayrollMonthFilter] = useState<string>('all');
  const [payrollYearFilter, setPayrollYearFilter] = useState<string>('all');
  const [payrollEmployeeFilter, setPayrollEmployeeFilter] = useState<string>('all');
  const [payrollSortField, setPayrollSortField] = useState<'processedAt' | 'netSalary'>('processedAt');
  const [payrollSortDir, setPayrollSortDir] = useState<'asc' | 'desc'>('desc');

  // Sharing states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Apply dynamic theme color
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', brandSettings.primaryColor);
    document.documentElement.style.setProperty('--primary-color-light', `${brandSettings.primaryColor}20`);
  }, [brandSettings.primaryColor]);

  // Load data from Hybrid API Service
  useEffect(() => {
    if (!user) return;
    
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const isOnline = await apiService.checkBackend();
        setDbStatus(isOnline ? 'online' : 'local');

        const [empData, payrollData, auditData, brandData, leaveData] = await Promise.all([
          apiService.getEmployees(),
          apiService.getPayrollHistory(),
          apiService.getAuditLogs(),
          apiService.getBrandSettings(),
          apiService.getLeaveRequests(user.role === 'staff' ? user.employeeId : undefined)
        ]);
        
        setEmployees(Array.isArray(empData) ? empData : []);
        setPayrollHistory(Array.isArray(payrollData) ? payrollData : []);
        setAuditLogs(Array.isArray(auditData) ? auditData : []);
        setLeaveRequests(Array.isArray(leaveData) ? leaveData : []);
        if (brandData) setBrandSettings(brandData);
        
        if (user.role === 'staff' && user.employeeId) {
          const self = empData.find(e => e.id === user.employeeId);
          if (self) setSelectedEmployee(self);
        }
      } catch (error) {
        console.error("Data Load Error:", error);
        setDbStatus('error');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [user]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const loggedInUser = await apiService.login(email, password);
      setUser(loggedInUser);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setEmployees([]);
    setPayrollHistory([]);
    setAuditLogs([]);
    setLeaveRequests([]);
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedBrand: BrandSettings = {
      entityName: formData.get('entityName') as string,
      logoUrl: formData.get('logoUrl') as string,
      primaryColor: formData.get('primaryColor') as string,
      address: formData.get('address') as string,
    };
    
    setIsLoading(true);
    try {
      await apiService.saveBrandSettings(updatedBrand);
      setBrandSettings(updatedBrand);
      
      if (user) {
        await apiService.saveAuditLog({
          id: Math.random().toString(36).substr(2, 9),
          performedBy: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          action: 'Settings Updated',
          details: 'Organization brand settings were updated.',
          timestamp: new Date().toISOString()
        });
      }
      alert('Settings saved successfully.');
    } catch (error) {
      alert('Failed to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const accessibleEmployees = useMemo(() => {
    if (user?.role === 'admin' || user?.role === 'tax') return employees;
    return employees.filter(e => e.id === user?.employeeId);
  }, [employees, user]);

  const filteredEmployeesList = useMemo(() => {
    if (!employeeSearchQuery) return accessibleEmployees;
    const term = employeeSearchQuery.toLowerCase();
    return accessibleEmployees.filter(emp => 
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term) ||
      emp.kraPin.toLowerCase().includes(term)
    );
  }, [accessibleEmployees, employeeSearchQuery]);

  const accessiblePayroll = useMemo(() => {
    if (user?.role === 'admin' || user?.role === 'tax') return payrollHistory;
    return payrollHistory.filter(p => p.employeeId === user?.employeeId);
  }, [payrollHistory, user]);

  const stats = useMemo(() => {
    const history = Array.isArray(accessiblePayroll) ? accessiblePayroll : [];
    const currentMonthPayroll = history.filter(p => 
      p.month === new Date().getMonth() && p.year === new Date().getFullYear()
    );
    return {
      totalGross: currentMonthPayroll.reduce((acc, curr) => acc + (curr.grossSalary as number), 0),
      totalNet: currentMonthPayroll.reduce((acc, curr) => acc + (curr.netSalary as number), 0),
      totalPaye: currentMonthPayroll.reduce((acc, curr) => acc + (curr.paye as number), 0),
      totalNssf: currentMonthPayroll.reduce((acc, curr) => acc + (curr.nssf as number), 0),
      totalSha: currentMonthPayroll.reduce((acc, curr) => acc + (curr.sha as number), 0),
      totalHousing: currentMonthPayroll.reduce((acc, curr) => acc + (curr.housingLevy as number), 0),
    };
  }, [accessiblePayroll]);

  // Filtered & Sorted Payroll History
  const filteredPayroll = useMemo(() => {
    let result = [...accessiblePayroll];

    if (payrollMonthFilter !== 'all') {
      result = result.filter(r => r.month === parseInt(payrollMonthFilter));
    }
    if (payrollYearFilter !== 'all') {
      result = result.filter(r => r.year === parseInt(payrollYearFilter));
    }
    if (payrollEmployeeFilter !== 'all') {
      result = result.filter(r => r.employeeId === payrollEmployeeFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (payrollSortField === 'processedAt') {
        comparison = new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime();
      } else {
        comparison = (a.netSalary as number) - (b.netSalary as number);
      }
      return payrollSortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [accessiblePayroll, payrollMonthFilter, payrollYearFilter, payrollEmployeeFilter, payrollSortField, payrollSortDir]);

  const availableYears = useMemo(() => {
    const years = new Set(accessiblePayroll.map(r => r.year));
    return Array.from(years).sort((a, b) => (b as number) - (a as number));
  }, [accessiblePayroll]);

  const latestSelectedEmployeeRecord = useMemo(() => {
    if (!selectedEmployee) return null;
    return accessiblePayroll
      .filter(p => p.employeeId === selectedEmployee.id)
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime())[0] || null;
  }, [selectedEmployee, accessiblePayroll]);

  const getAiTaxAdvice = async (emp: Employee) => {
    setLoadingAi(true);
    setAiInsight('');
    try {
      const calcs = calculatePayroll(emp.basicSalary, emp.benefits);
      const explanation = await geminiService.explainDeductions(emp.basicSalary + (emp.benefits || 0), calcs);
      setAiInsight(explanation || 'No insight available.');
    } catch (error) {
      setAiInsight('Could not generate insights at this time.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleGetTaxOptimization = async (emp: Employee) => {
    setLoadingTaxAdvice(true);
    setTaxOptimizationAdvice('');
    try {
      const calcs = calculatePayroll(emp.basicSalary, emp.benefits);
      const advice = await geminiService.getTaxOptimizationAdvice(emp.basicSalary, emp.benefits, calcs);
      setTaxOptimizationAdvice(advice || 'No optimization advice available at this time.');
    } catch (error) {
      setTaxOptimizationAdvice('Could not retrieve optimization tips.');
    } finally {
      setLoadingTaxAdvice(false);
    }
  };

  const handleGenerateP9Breakdown = async (emp: Employee) => {
    setLoadingP9Breakdown(true);
    setP9Breakdown('');
    try {
      const calcs = calculatePayroll(emp.basicSalary, emp.benefits);
      const breakdown = await geminiService.generateP9Breakdown(`${emp.firstName} ${emp.lastName}`, emp.basicSalary, emp.benefits, calcs);
      setP9Breakdown(breakdown || 'No P9 breakdown available.');
    } catch (error) {
      setP9Breakdown('Could not generate P9 breakdown.');
    } finally {
      setLoadingP9Breakdown(false);
    }
  };

  const handleLeaveRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !user.employeeId) return;
    
    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const reason = formData.get('reason') as string;

    const request: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      startDate,
      endDate,
      reason,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    try {
      setIsLoading(true);
      await apiService.submitLeaveRequest(request);
      setLeaveRequests(prev => [request, ...prev]);
      setShowLeaveRequestModal(false);
      alert("Leave request submitted successfully.");
    } catch (error) {
      alert("Failed to submit leave request.");
    } finally {
      setIsLoading(true); // Trigger reload
      window.location.reload(); // Simple way to refresh data
    }
  };

  const handleLeaveStatusUpdate = async (id: string, status: 'approved' | 'rejected', employeeId: string, startDate: string, endDate: string) => {
    if (!user) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      setIsLoading(true);
      await apiService.updateLeaveStatus(id, status, employeeId, diffDays);
      
      // Update local state
      setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      
      if (status === 'approved') {
        setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, remainingLeaveDays: e.remainingLeaveDays - diffDays } : e));
      }

      await apiService.saveAuditLog({
        id: Math.random().toString(36).substr(2, 9),
        performedBy: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: `Leave ${status.toUpperCase()}`,
        details: `${status.charAt(0).toUpperCase() + status.slice(1)} leave for ${employeeId}. Duration: ${diffDays} days.`,
        timestamp: new Date().toISOString()
      });
      
      alert(`Leave request ${status}.`);
    } catch (error) {
      alert("Failed to update leave request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftEmail = async () => {
    if (!selectedEmployee) return;
    setIsDraftingEmail(true);
    try {
      const draft = await geminiService.draftShareEmail(
        selectedEmployee.firstName,
        new Date().toLocaleString('default', { month: 'long' }),
        new Date().getFullYear()
      );
      setShareMessage(draft || '');
    } catch (error) {
      console.error("Draft Error:", error);
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const handleShareSubmit = async () => {
    if (!selectedEmployee || !shareEmail || !user) return;
    setIsSharing(true);
    try {
      const recordId = accessiblePayroll.find(p => p.employeeId === selectedEmployee.id)?.id || 'LATEST';
      await apiService.sharePayslip(shareEmail, selectedEmployee.id, recordId, shareMessage);
      
      await apiService.saveAuditLog({
        id: Math.random().toString(36).substr(2, 9),
        performedBy: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'Payslip Shared',
        details: `Shared payslip for ${selectedEmployee.firstName} ${selectedEmployee.lastName} with ${shareEmail}. Employee notified via security protocol.`,
        timestamp: new Date().toISOString()
      });

      setShareSuccess(true);
      setTimeout(() => {
        setShowShareModal(false);
        setShareSuccess(false);
        setShareEmail('');
        setShareMessage('');
      }, 2000);
    } catch (error) {
      alert("Failed to share payslip.");
    } finally {
      setIsSharing(false);
    }
  };

  const processPayrollRun = async () => {
    if (!user) return;
    setIsLoading(true);
    const now = new Date();
    const newRecords: PayrollRecord[] = accessibleEmployees.map(emp => ({
      ...calculatePayroll(emp.basicSalary, emp.benefits),
      id: Math.random().toString(36).substr(2, 9),
      employeeId: emp.id,
      month: now.getMonth(),
      year: now.getFullYear(),
      processedAt: now.toISOString()
    }));

    try {
      await apiService.savePayrollRun(newRecords);
      
      const auditLog: PayrollAudit = {
        id: Math.random().toString(36).substr(2, 9),
        performedBy: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'Payroll Run Committed',
        details: `Processed payroll for ${newRecords.length} employees. Net Salary: KES ${newRecords.reduce((acc, curr) => acc + (curr.netSalary as number), 0).toLocaleString()}. Email notifications dispatched.`,
        timestamp: now.toISOString()
      };
      await apiService.saveAuditLog(auditLog);
      
      setPayrollHistory(prev => [...newRecords, ...prev]);
      setAuditLogs(prev => [auditLog, ...prev]);
      alert(`Processed ${accessibleEmployees.length} records. Notifications have been sent.`);
    } catch (err) {
      alert("Error committing payroll run.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSort = (field: 'processedAt' | 'netSalary') => {
    if (payrollSortField === field) {
      setPayrollSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPayrollSortField(field);
      setPayrollSortDir('desc');
    }
  };

  const handleExportEmployees = () => {
    const filename = `Personnel_Roster_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(accessibleEmployees, filename);
  };

  const handleExportPayroll = () => {
    const filename = `Payroll_History_${new Date().toISOString().split('T')[0]}.csv`;
    const dataToExport = filteredPayroll.map(record => {
      const emp = employees.find(e => e.id === record.employeeId);
      return {
        ...record,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'N/A'
      };
    });
    downloadCSV(dataToExport, filename);
  };

  const handleImportCSVClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const importedData = parseEmployeeCSV(text);
      
      if (importedData.length === 0) {
        alert("No valid data found in CSV file.");
        return;
      }

      setIsLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const entry of importedData) {
        try {
          // Basic validation
          if (!entry.firstName || !entry.lastName || !entry.email) {
            errorCount++;
            continue;
          }
          
          await apiService.saveEmployee(entry as Employee);
          successCount++;
        } catch (err) {
          errorCount++;
        }
      }

      setIsLoading(false);
      alert(`Import complete: ${successCount} successful, ${errorCount} errors.`);
      
      // Reload employees
      const freshEmps = await apiService.getEmployees();
      setEmployees(freshEmps);
      
      if (event.target) event.target.value = ''; // Reset input
    };
    reader.readAsText(file);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-blue-500/30">
        <style>{`
          :root {
            --primary-color: ${brandSettings.primaryColor};
            --primary-color-light: ${brandSettings.primaryColor}20;
          }
          .custom-theme-bg { background-color: var(--primary-color); }
          .custom-theme-text { color: var(--primary-color); }
          .custom-theme-border { border-color: var(--primary-color); }
          .custom-theme-ring:focus { ring-color: var(--primary-color); }
        `}</style>
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl custom-theme-bg shadow-2xl shadow-blue-500/20 mb-6 group hover:scale-105 transition-transform">
              {brandSettings.logoUrl ? (
                <img src={brandSettings.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <Receipt className="text-white group-hover:rotate-12 transition-transform" size={40} />
              )}
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              {brandSettings.entityName.split(' ')[0]}<span className="custom-theme-text">{brandSettings.entityName.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-slate-400 font-medium">Enterprise Management System v2.0</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-10 rounded-[40px] shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:custom-theme-text transition-colors">
                    <Mail size={18} />
                  </div>
                  <input name="email" type="email" required placeholder="admin@payrollpro.com" className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:custom-theme-border focus:ring-4 ring-blue-500/10 outline-none transition-all font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Token</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:custom-theme-text transition-colors">
                    <Lock size={18} />
                  </div>
                  <input name="password" type="password" required placeholder="password123" className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:custom-theme-border focus:ring-4 ring-blue-500/10 outline-none transition-all font-bold" />
                </div>
              </div>
              {authError && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold animate-in shake duration-300">{authError}</div>}
              <button type="submit" disabled={isLoggingIn} className="w-full custom-theme-bg hover:opacity-90 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                {isLoggingIn ? 'Verifying...' : 'Authorize Access'}
              </button>
            </form>
          </div>
          <div className="mt-8 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest">Restricted System. Unauthorized access is monitored.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <style>{`
        :root {
          --primary-color: ${brandSettings.primaryColor};
          --primary-color-light: ${brandSettings.primaryColor}20;
        }
        .custom-theme-bg { background-color: var(--primary-color); }
        .custom-theme-text { color: var(--primary-color); }
        .custom-theme-border { border-color: var(--primary-color); }
        .custom-theme-ring:focus { ring-color: var(--primary-color); }
        .stat-card-blue { background-color: var(--primary-color-light); color: var(--primary-color); }
      `}</style>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".csv" 
        className="hidden" 
      />
      <aside className="w-64 bg-slate-900 text-white flex flex-col no-print shrink-0 shadow-2xl">
        <div className="p-8">
          <h1 className="text-xl font-bold flex items-center gap-3 tracking-tight">
            {brandSettings.logoUrl ? (
              <img src={brandSettings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <Receipt className="custom-theme-text" />
            )} 
            <span className="truncate">{brandSettings.entityName}</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          {user.role === 'admin' && (
            <>
              <NavItem icon={<Users size={20}/>} label="Personnel" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
              <NavItem icon={<Receipt size={20}/>} label="Monthly Run" active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
            </>
          )}
          <NavItem icon={<PlaneTakeoff size={20}/>} label="Leave Requests" active={activeTab === 'leave'} onClick={() => setActiveTab('leave')} />
          {(user.role === 'admin' || user.role === 'tax') && (
            <NavItem icon={<FileText size={20}/>} label={user.role === 'admin' ? "Reports & Compliance" : "Compliance Hub"} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          )}
          {user.role === 'admin' && (
            <NavItem icon={<Settings size={20}/>} label="Entity Branding" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          )}
          {user.role === 'staff' && <NavItem icon={<FileText size={20}/>} label="My Documents" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />}
        </nav>
        <div className="px-6 py-6 border-t border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center"><UserIcon size={20} /></div>
            <div className="overflow-hidden">
              <div className="text-sm font-black truncate">{user.firstName} {user.lastName}</div>
              <div className="text-[10px] custom-theme-text font-black uppercase tracking-widest">{user.role} Account</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-400 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"><LogOut size={14} /> Terminate Session</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        {isLoading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center text-blue-600"><Loader2 className="animate-spin mb-4" size={48} /><p className="font-bold text-lg animate-pulse tracking-tight text-slate-700">Processing Entity Ledger...</p></div>}
        <div className="p-10 no-print max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end">
                <div><h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">{(user.role === 'admin' || user.role === 'tax') ? 'Organization Pulse' : `Hello, ${user.firstName}`}</h2><p className="text-slate-500 mt-2 text-lg">{(user.role === 'admin' || user.role === 'tax') ? 'Real-time payroll distribution and compliance monitoring.' : 'Your personal earnings and tax summary.'}</p></div>
                {(user.role === 'admin' || user.role === 'tax') && (
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="stat-card-blue p-3 rounded-xl font-black">KES</div><div><div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Liability</div><div className="text-2xl font-black text-slate-800">{stats.totalGross.toLocaleString()}</div></div></div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Income Tax" value={stats.totalPaye} color="text-red-600" bgColor="bg-red-50" icon={<Cloud size={16}/>} />
                <StatCard title="Social Security" value={stats.totalNssf} color="custom-theme-text" bgColor="bg-blue-50" icon={<Database size={16}/>} />
                <StatCard title="Health Levy (SHA)" value={stats.totalSha} color="text-emerald-600" bgColor="bg-emerald-50" icon={<Cloud size={16}/>} />
                <StatCard title="Housing Levy" value={stats.totalHousing} color="text-violet-600" bgColor="bg-violet-50" icon={<Database size={16}/>} />
              </div>

              {(user.role === 'admin' || user.role === 'tax') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                         <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><History className="custom-theme-text" /> System Audit Trail</h3>
                         <button onClick={() => apiService.getAuditLogs().then(setAuditLogs)} className="text-[10px] font-black uppercase custom-theme-text bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all">Refresh Logs</button>
                      </div>
                      <div className="space-y-4">
                         {auditLogs.length > 0 ? auditLogs.slice(0, 5).map(log => (
                           <div key={log.id} className="flex gap-4 p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-all group">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:custom-theme-text transition-all shrink-0"><Activity size={18} /></div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-start mb-1">
                                    <div className="font-bold text-sm text-slate-800">{log.action}</div>
                                    <div className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString()}</div>
                                 </div>
                                 <div className="text-xs text-slate-500 font-medium mb-1">{log.details}</div>
                                 <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Initiated by {log.performedBy} ({log.userRole})</div>
                              </div>
                           </div>
                         )) : (
                           <div className="py-12 text-center text-slate-400 font-bold italic">No audit records detected in ledger.</div>
                         )}
                      </div>
                   </div>
                   <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-10 opacity-10 custom-theme-text"><ShieldCheck size={180} /></div>
                      <h3 className="text-xl font-bold mb-4 relative">Security Overview</h3>
                      <p className="text-slate-300 text-sm font-medium mb-8 relative leading-relaxed">System activity is being logged in accordance with enterprise compliance standards. Personnel access is tiered based on verified role identities.</p>
                      <div className="space-y-6 relative">
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                            <div className="text-xs font-black uppercase tracking-widest">Database Sync Active</div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                            <div className="text-xs font-black uppercase tracking-widest">Audit Engine Encrypted</div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50"></div>
                            <div className="text-xs font-black uppercase tracking-widest">Authorized Tax Sign-offs</div>
                         </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <PlaneTakeoff className="custom-theme-text" /> Leave Management
                </h2>
                {user.role === 'staff' && (
                  <button onClick={() => setShowLeaveRequestModal(true)} className="custom-theme-bg text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:opacity-90 shadow-xl transition-all font-bold">
                    <Plus size={20} /> Request Leave
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Clock className="text-slate-400" size={14} /> 
                        {user.role === 'admin' ? 'Recent Applications' : 'My Requests'}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                            <th className="py-4 px-6">Personnel</th>
                            <th className="py-4 px-6">Period</th>
                            <th className="py-4 px-6">Reason</th>
                            <th className="py-4 px-6">Status</th>
                            {user.role === 'admin' && <th className="py-4 px-6">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {leaveRequests.length > 0 ? leaveRequests.map(req => (
                            <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all">
                              <td className="py-5 px-6">
                                <div className="font-bold text-slate-800">{req.firstName} {req.lastName}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: #{req.employeeId}</div>
                              </td>
                              <td className="py-5 px-6">
                                <div className="text-xs font-bold text-slate-600">{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400 font-medium">Requested {new Date(req.requestedAt).toLocaleDateString()}</div>
                              </td>
                              <td className="py-5 px-6">
                                <div className="text-xs text-slate-500 font-medium max-w-[150px] truncate" title={req.reason}>{req.reason}</div>
                              </td>
                              <td className="py-5 px-6">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit
                                  ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                                  ${req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : ''}
                                  ${req.status === 'rejected' ? 'bg-red-100 text-red-700' : ''}
                                `}>
                                  {req.status === 'pending' && <Clock size={10} />}
                                  {req.status === 'approved' && <ThumbsUp size={10} />}
                                  {req.status === 'rejected' && <ThumbsDown size={10} />}
                                  {req.status}
                                </span>
                              </td>
                              {user.role === 'admin' && (
                                <td className="py-5 px-6">
                                  {req.status === 'pending' ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => handleLeaveStatusUpdate(req.id, 'approved', req.employeeId, req.startDate, req.endDate)} className="p-2 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"><ThumbsUp size={14}/></button>
                                      <button onClick={() => handleLeaveStatusUpdate(req.id, 'rejected', req.employeeId, req.startDate, req.endDate)} className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all"><ThumbsDown size={14}/></button>
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-slate-300 font-black uppercase italic">Processed</div>
                                  )}
                                </td>
                              )}
                            </tr>
                          )) : (
                            <tr><td colSpan={5} className="py-12 text-center text-slate-400 font-bold italic">No leave applications found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-10 custom-theme-text"><PlaneTakeoff size={180} /></div>
                    <h3 className="text-xl font-bold mb-4 relative">Leave Entitlement</h3>
                    <p className="text-slate-300 text-sm font-medium mb-8 relative leading-relaxed">
                      All personnel are entitled to annual leave as per the statutory requirements and company policy.
                    </p>
                    
                    {user.role === 'staff' && selectedEmployee && (
                      <div className="space-y-6 relative">
                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                          <div>
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Remaining Balance</div>
                            <div className="text-4xl font-black">{selectedEmployee.remainingLeaveDays} <span className="text-lg text-slate-500">Days</span></div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Entitlement</div>
                             <div className="text-lg font-bold">{selectedEmployee.totalLeaveDays} Days</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                           <AlertCircle size={16} className="text-amber-400 shrink-0" />
                           <p className="text-[10px] text-slate-400 font-medium">Leave must be requested at least 48 hours in advance for operational planning.</p>
                        </div>
                      </div>
                    )}
                    
                    {user.role === 'admin' && (
                      <div className="space-y-4 relative">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                           <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Pending Approvals</div>
                           <div className="text-3xl font-black">{leaveRequests.filter(r => r.status === 'pending').length}</div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium italic">Processing approvals updates the personnel roster immediately.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && user?.role === 'admin' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <Palette className="custom-theme-text" /> Organization Branding
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <form onSubmit={handleSaveSettings} className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Building2 size={12} /> Legal Entity Name
                      </label>
                      <input name="entityName" type="text" required defaultValue={brandSettings.entityName} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:custom-theme-border transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <ImageIcon size={12} /> Logo Image URL
                      </label>
                      <input name="logoUrl" type="url" placeholder="https://logo.com/image.png" defaultValue={brandSettings.logoUrl} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:custom-theme-border transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Palette size={12} /> Brand Identity Color
                      </label>
                      <div className="flex gap-4">
                        <input name="primaryColor" type="color" defaultValue={brandSettings.primaryColor} className="h-14 w-20 p-1 rounded-xl bg-slate-100 border-2 border-slate-100 cursor-pointer" />
                        <input type="text" value={brandSettings.primaryColor} readOnly className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 font-mono font-bold text-slate-400 uppercase" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Building2 size={12} /> Registered Address
                      </label>
                      <textarea name="address" rows={2} required defaultValue={brandSettings.address} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:custom-theme-border transition-all resize-none" />
                    </div>
                  </div>
                  
                  <button type="submit" className="w-full custom-theme-bg text-white font-black py-5 rounded-2xl shadow-xl transition-all hover:opacity-90 flex items-center justify-center gap-3 uppercase tracking-widest text-sm">
                    <Save size={18} /> Deploy Brand Settings
                  </button>
                </form>

                <div className="space-y-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Live Preview</h3>
                  <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-2xl scale-95 origin-top">
                    <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl custom-theme-bg flex items-center justify-center text-white shadow-lg">
                        {brandSettings.logoUrl ? <img src={brandSettings.logoUrl} className="w-6 h-6 object-contain" /> : <Building2 size={20} />}
                      </div>
                      <div className="font-black text-slate-800">{brandSettings.entityName}</div>
                    </div>
                    <div className="p-10 space-y-6">
                      <div className="flex justify-between items-center">
                        <div className="w-24 h-3 bg-slate-100 rounded-full"></div>
                        <div className="w-32 h-10 custom-theme-bg rounded-xl shadow-lg"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl"></div>
                        <div className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl"></div>
                      </div>
                      <div className="pt-6">
                         <div className="w-full h-24 border-4 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-[10px] font-black uppercase text-slate-300 tracking-widest">UI Content Block</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && user?.role === 'admin' && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personnel Roster</h2>
                <div className="flex flex-wrap gap-4">
                  <button onClick={downloadEmployeeTemplate} className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all font-bold text-sm">
                    <FileDown size={18} /> Template
                  </button>
                  <button onClick={handleImportCSVClick} className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all font-bold text-sm">
                    <Upload size={18} /> Import CSV
                  </button>
                  <button onClick={handleExportEmployees} className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all font-bold text-sm">
                    <Download size={18} /> Export
                  </button>
                  <button onClick={() => { setEditingEmployee(null); setShowAddEmployee(true); }} className="custom-theme-bg text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:opacity-90 shadow-xl transition-all font-bold">
                    <Plus size={20} /> Onboard Personnel
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                  <div className="p-3"><Search className="text-slate-400" size={20} /></div>
                  <input 
                    type="text" 
                    placeholder="Search by name, PIN or Email..." 
                    className="bg-transparent border-none focus:outline-none w-full text-slate-700 font-medium"
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                  />
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                          <th className="py-4 px-6">Personnel</th>
                          <th className="py-4 px-6">Identity (KRA)</th>
                          <th className="py-4 px-6">Compensation</th>
                          <th className="py-4 px-6">Leave Balance</th>
                          <th className="py-4 px-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployeesList.length > 0 ? filteredEmployeesList.map(emp => (
                          <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-all group cursor-pointer" onClick={() => { setSelectedEmployee(emp); setAiInsight(''); setTaxOptimizationAdvice(''); setP9Breakdown(''); setShowDetailModal(true); }}>
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl custom-theme-bg flex items-center justify-center text-white font-bold">{emp.firstName[0]}</div>
                                <div>
                                  <div className="font-bold text-slate-800">{emp.firstName} {emp.lastName}</div>
                                  <div className="text-xs text-slate-400 font-medium">{emp.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="text-sm font-bold text-slate-600">{emp.kraPin}</div>
                              <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Ref: #{emp.id}</div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="text-sm font-bold text-slate-800">KES {(emp.basicSalary + (emp.benefits || 0)).toLocaleString()}</div>
                              <div className="text-[9px] text-emerald-600 font-black uppercase">Active Salary</div>
                            </td>
                            <td className="py-5 px-6">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${emp.remainingLeaveDays < 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                <CalendarDays size={10} /> {emp.remainingLeaveDays} Days Remaining
                              </span>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex gap-2 justify-end">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); setShowPayslipModal(true); }}
                                  className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:custom-theme-bg hover:text-white transition-all shadow-sm flex items-center gap-2"
                                  title="View Latest Payslip"
                                >
                                  <FileIcon size={18} />
                                </button>
                                <button 
                                  onClick={() => { setSelectedEmployee(emp); setAiInsight(''); setTaxOptimizationAdvice(''); setP9Breakdown(''); setShowDetailModal(true); }}
                                  className="p-2 rounded-xl bg-slate-100 text-slate-400 group-hover:custom-theme-bg group-hover:text-white transition-all shadow-sm"
                                >
                                  <Eye size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="py-20 text-center">
                              <div className="flex flex-col items-center gap-3 text-slate-400">
                                <Search size={48} className="opacity-20" />
                                <p className="font-bold">No personnel records found matching your search.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && user?.role === 'admin' && (
            <div className="space-y-10 animate-in zoom-in-95 duration-500">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-12 text-center space-y-8">
                  <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto shadow-inner"><Receipt size={48} /></div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">Execute Monthly Ledger</h2>
                    <p className="text-slate-500 font-medium text-lg mt-2">Committing payroll for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex justify-center gap-16 py-8 border-y border-slate-100">
                    <div className="text-center">
                      <div className="text-slate-400 text-[11px] uppercase font-black tracking-widest mb-2">Personnel Count</div>
                      <div className="text-4xl font-black text-slate-800">{accessibleEmployees.length}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-[11px] uppercase font-black tracking-widest mb-2">Estimated Payout</div>
                      <div className="text-4xl font-black text-slate-800">KES {(accessibleEmployees.reduce((a, b) => a + b.basicSalary + (b.benefits || 0), 0)).toLocaleString()}</div>
                    </div>
                  </div>
                  <button onClick={processPayrollRun} className="custom-theme-bg text-white px-12 py-5 rounded-2xl font-black text-lg hover:opacity-90 shadow-2xl transition-all uppercase tracking-widest">Process & Commit to DB</button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2"><History className="custom-theme-text" /> Payroll History</h3>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    <button onClick={handleExportPayroll} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-2xl flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all font-bold text-xs">
                      <Download size={16} /> Export Data
                    </button>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                      <Calendar size={16} className="text-slate-400" />
                      <select 
                        value={payrollMonthFilter} 
                        onChange={(e) => setPayrollMonthFilter(e.target.value)}
                        className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-600 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Months</option>
                        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                      <Filter size={16} className="text-slate-400" />
                      <select 
                        value={payrollYearFilter} 
                        onChange={(e) => setPayrollYearFilter(e.target.value)}
                        className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-600 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Years</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                      <UserIcon size={16} className="text-slate-400" />
                      <select 
                        value={payrollEmployeeFilter} 
                        onChange={(e) => setPayrollEmployeeFilter(e.target.value)}
                        className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-600 focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Employees</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                        <th className="py-4 px-6">Personnel</th>
                        <th className="py-4 px-6">Period</th>
                        <th className="py-4 px-6 cursor-pointer hover:custom-theme-text transition-colors" onClick={() => toggleSort('netSalary')}>
                          <div className="flex items-center gap-1">
                            Net Salary {payrollSortField === 'netSalary' && <ArrowUpDown size={12} className={payrollSortDir === 'asc' ? 'rotate-180' : ''} />}
                          </div>
                        </th>
                        <th className="py-4 px-6 cursor-pointer hover:custom-theme-text transition-colors" onClick={() => toggleSort('processedAt')}>
                          <div className="flex items-center gap-1">
                            Processed At {payrollSortField === 'processedAt' && <ArrowUpDown size={12} className={payrollSortDir === 'asc' ? 'rotate-180' : ''} />}
                          </div>
                        </th>
                        <th className="py-4 px-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayroll.length > 0 ? filteredPayroll.map(record => {
                        const emp = employees.find(e => e.id === record.employeeId);
                        const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][record.month];
                        return (
                          <tr key={record.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all group">
                            <td className="py-5 px-6">
                              <div className="font-bold text-slate-800">{emp ? `${emp.firstName} ${emp.lastName}` : 'Deleted User'}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ref: {record.id}</div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="text-sm font-bold text-slate-600">{monthName} {record.year}</div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="text-sm font-black custom-theme-text">KES {record.netSalary.toLocaleString()}</div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="text-xs text-slate-500 font-medium">{new Date(record.processedAt).toLocaleString()}</div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <button 
                                onClick={() => { setSelectedEmployee(emp || null); setActiveTab('reports'); }}
                                className="p-2 rounded-xl bg-slate-100 text-slate-400 group-hover:custom-theme-bg group-hover:text-white transition-all"
                              >
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                              <CloudOff size={48} />
                              <p className="font-bold">No historical data matching the selected criteria.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex justify-between items-center"><h2 className="text-3xl font-black text-slate-800 tracking-tight">Compliance & Reporting</h2><div className="flex gap-4"><button onClick={() => setShowShareModal(true)} disabled={!selectedEmployee} className="flex items-center gap-2 custom-theme-bg text-white px-6 py-3 rounded-2xl font-bold shadow-xl disabled:opacity-50 hover:opacity-90 transition-all"><Share2 size={18} /> Secure Share</button><button onClick={() => window.print()} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-xl hover:opacity-90 transition-all"><Printer size={18} /> Export PDF</button></div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8"><h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2"><Receipt className="custom-theme-text" /> Individual Payslip</h3><div className="space-y-6">{(user?.role === 'admin' || user?.role === 'tax') && (<select className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 font-bold text-slate-700 outline-none focus:custom-theme-border transition-all" onChange={(e) => { const emp = employees.find(emp => emp.id === e.target.value); if (emp) setSelectedEmployee(emp); }} value={selectedEmployee?.id || ""}><option value="" disabled>Select Staff Member</option>{employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select>)}{selectedEmployee && (<div className="border border-slate-100 rounded-3xl p-6 bg-slate-50/50 scale-90 origin-top shadow-inner"><Payslip employee={selectedEmployee} record={latestSelectedEmployeeRecord || { ...calculatePayroll(selectedEmployee.basicSalary, selectedEmployee.benefits), id: 'STUB', employeeId: selectedEmployee.id, month: new Date().getMonth(), year: new Date().getFullYear(), processedAt: new Date().toISOString() } as PayrollRecord} brand={brandSettings} /></div>)}</div></div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8"><h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2"><FileText className="text-indigo-500" /> Annual Tax Summary (P9)</h3>{selectedEmployee ? (<div className="space-y-4"><div className="border border-slate-100 rounded-3xl p-6 overflow-y-auto h-[500px] shadow-inner"><P9Form employee={selectedEmployee} records={accessiblePayroll.filter(r => r.employeeId === selectedEmployee.id)} brand={brandSettings} /></div></div>) : (<div className="h-[500px] border-4 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-slate-400 font-bold">Select personnel for P9 card.</div>)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Payslip Modal */}
        {showPayslipModal && selectedEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
             <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
               <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 custom-theme-bg rounded-2xl flex items-center justify-center text-white shadow-lg"><FileIcon size={24} /></div>
                     <div><h3 className="text-2xl font-black">Latest Payslip</h3><p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">Secure Document Viewer</p></div>
                  </div>
                  <button onClick={() => setShowPayslipModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-10 bg-slate-50">
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
                     <Payslip 
                        employee={selectedEmployee} 
                        record={latestSelectedEmployeeRecord || { ...calculatePayroll(selectedEmployee.basicSalary, selectedEmployee.benefits), id: 'STUB', employeeId: selectedEmployee.id, month: new Date().getMonth(), year: new Date().getFullYear(), processedAt: new Date().toISOString() } as PayrollRecord} 
                        brand={brandSettings} 
                     />
                  </div>
               </div>
               <div className="p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
                  <button onClick={() => window.print()} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                    <Printer size={16} /> Export PDF
                  </button>
                  <button onClick={() => setShowPayslipModal(false)} className="flex-1 custom-theme-bg text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-xl uppercase tracking-widest text-xs">
                    Close Document
                  </button>
               </div>
             </div>
          </div>
        )}

        {/* Employee Detail Modal */}
        {showDetailModal && selectedEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 custom-theme-bg rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg">{selectedEmployee.firstName[0]}</div>
                   <div>
                      <h3 className="text-2xl font-black tracking-tight">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mt-1">
                        <Fingerprint size={12} className="custom-theme-text" /> 
                        Personnel ID: #{selectedEmployee.id}
                      </div>
                   </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-slate-50/50">
                <section className="grid grid-cols-2 gap-6">
                   <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><UserIcon size={12}/> Personal & Contact</h4>
                      <div className="space-y-3">
                         <DetailRow label="Full Name" value={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`} />
                         <DetailRow label="Official Email" value={selectedEmployee.email} />
                         <DetailRow label="KRA Tax PIN" value={selectedEmployee.kraPin} />
                         <DetailRow label="Joined Date" value={new Date(selectedEmployee.joinedDate).toLocaleDateString()} />
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={12}/> Compensation Ledger</h4>
                      <div className="space-y-3">
                         <DetailRow label="Base Salary" value={`KES ${selectedEmployee.basicSalary.toLocaleString()}`} />
                         <DetailRow label="Allowances" value={`KES ${(selectedEmployee.benefits || 0).toLocaleString()}`} />
                         <DetailRow label="Gross Value" value={`KES ${(selectedEmployee.basicSalary + (selectedEmployee.benefits || 0)).toLocaleString()}`} />
                         <DetailRow label="NSSF Reference" value={selectedEmployee.nssfNumber} />
                         <DetailRow label="SHA Identity" value={selectedEmployee.nhifNumber} />
                      </div>
                   </div>
                </section>

                <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><PlaneTakeoff size={12}/> Annual Leave Entitlement</h4>
                   </div>
                   <div className="grid grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-slate-50 rounded-2xl">
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Allocated</div>
                         <div className="text-2xl font-black text-slate-800">{selectedEmployee.totalLeaveDays} <span className="text-xs text-slate-400">Days</span></div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-2xl">
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Days Consumed</div>
                         <div className="text-2xl font-black text-slate-800">{selectedEmployee.totalLeaveDays - selectedEmployee.remainingLeaveDays} <span className="text-xs text-slate-400">Days</span></div>
                      </div>
                      <div className="text-center p-4 custom-theme-bg rounded-2xl text-white shadow-lg">
                         <div className="text-[9px] font-black opacity-70 uppercase tracking-widest mb-1">Net Balance</div>
                         <div className="text-2xl font-black">{selectedEmployee.remainingLeaveDays} <span className="text-xs opacity-70">Days</span></div>
                      </div>
                   </div>
                </section>
                
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <BrainCircuit size={14} className="custom-theme-text" /> AI Intelligence Service
                   </h4>
                   <div className="grid grid-cols-3 gap-3">
                     <button onClick={() => getAiTaxAdvice(selectedEmployee)} disabled={loadingAi} className="bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                        {loadingAi ? <Loader2 className="animate-spin" size={14} /> : <Info size={14} />} 
                        Analysis
                     </button>
                     <button onClick={() => handleGetTaxOptimization(selectedEmployee)} disabled={loadingTaxAdvice} className="bg-white border border-slate-200 text-slate-600 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm">
                        {loadingTaxAdvice ? <Loader2 className="animate-spin" size={14} /> : <Lightbulb size={14} />} 
                        Strategy
                     </button>
                     <button onClick={() => handleGenerateP9Breakdown(selectedEmployee)} disabled={loadingP9Breakdown} className="custom-theme-bg text-white py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                        {loadingP9Breakdown ? <Loader2 className="animate-spin" size={14} /> : <FileSearch size={14} />} 
                        P9 Audit
                     </button>
                   </div>
                   
                   {(aiInsight || taxOptimizationAdvice || p9Breakdown) && (
                     <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                        {aiInsight && (
                          <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                             <p className="text-xs text-slate-600 leading-relaxed font-medium italic">"{aiInsight}"</p>
                          </div>
                        )}
                        {taxOptimizationAdvice && (
                          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl shadow-sm">
                             <div className="flex items-center gap-2 text-indigo-700 mb-3"><Lightbulb size={16}/><span className="text-[10px] font-black uppercase tracking-widest">Savings Recommendations</span></div>
                             <div className="text-xs text-indigo-900 leading-relaxed font-medium whitespace-pre-wrap">{taxOptimizationAdvice}</div>
                          </div>
                        )}
                        {p9Breakdown && (
                          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl shadow-sm">
                             <div className="flex items-center gap-2 text-emerald-700 mb-3"><Scale size={16}/><span className="text-[10px] font-black uppercase tracking-widest">Tax Auditor Breakdown</span></div>
                             <div className="text-[11px] text-emerald-900 leading-relaxed font-medium whitespace-pre-wrap font-mono bg-white/50 p-4 rounded-2xl border border-emerald-100">{p9Breakdown}</div>
                          </div>
                        )}
                     </div>
                   )}
                </section>
              </div>

              <div className="p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
                <button onClick={() => { setShowPayslipModal(true); setShowDetailModal(false); }} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                   <FileIcon size={16} /> View Latest Payslip
                </button>
                <button onClick={() => { setEditingEmployee(selectedEmployee); setShowAddEmployee(true); setShowDetailModal(false); }} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                   <Edit2 size={16} /> Edit Profile
                </button>
                <button onClick={() => setShowDetailModal(false)} className="flex-1 custom-theme-bg text-white font-black py-4 rounded-2xl hover:opacity-90 transition-all shadow-xl uppercase tracking-widest text-xs">
                   Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Request Modal */}
        {showLeaveRequestModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 custom-theme-bg rounded-2xl flex items-center justify-center text-white shadow-lg"><PlaneTakeoff size={24} /></div>
                   <div><h3 className="text-2xl font-black">Apply for Leave</h3><p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">Balance: {selectedEmployee?.remainingLeaveDays || 0} Days Available</p></div>
                </div>
                <button onClick={() => setShowLeaveRequestModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleLeaveRequestSubmit} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Start Date" name="startDate" type="date" required />
                  <FormField label="End Date" name="endDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Absence</label>
                  <textarea name="reason" rows={3} required placeholder="State your reason for requesting leave..." className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-700 outline-none focus:custom-theme-border transition-all resize-none" />
                </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowLeaveRequestModal(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                   <button type="submit" className="flex-1 py-4 rounded-2xl custom-theme-bg text-white font-black hover:opacity-90 shadow-xl transition-all uppercase tracking-widest text-sm">
                      Submit Application
                   </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && selectedEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 custom-theme-bg rounded-2xl flex items-center justify-center text-white shadow-lg"><Share2 size={24} /></div>
                   <div><h3 className="text-2xl font-black">Secure Payslip Delivery</h3><p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">Employee: {selectedEmployee.firstName} {selectedEmployee.lastName}</p></div>
                </div>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-6">
                {shareSuccess ? (
                  <div className="text-center py-10 animate-in zoom-in-50"><div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div><h4 className="text-2xl font-bold text-slate-800">Securely Sent!</h4><p className="text-slate-500 mt-2">The payslip link has been delivered to {shareEmail}.</p></div>
                ) : (
                  <>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Address</label>
                       <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:custom-theme-text"><Mail size={18} /></div>
                          <input type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="recipient@company.com" className="w-full border-2 border-slate-100 rounded-2xl pl-14 pr-5 py-4 font-bold text-slate-700 outline-none focus:custom-theme-border transition-all" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Message Content</label><button onClick={handleDraftEmail} disabled={isDraftingEmail} className="custom-theme-text text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:underline disabled:opacity-50 transition-all bg-blue-50 px-3 py-1.5 rounded-lg"><Sparkles size={12} /> {isDraftingEmail ? 'Draft with AI' : 'Draft with AI'}</button></div>
                       <textarea rows={4} value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} placeholder="Enter instructions for the recipient..." className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 font-medium text-slate-700 outline-none focus:custom-theme-border transition-all resize-none" />
                    </div>
                    <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
                       <div className="p-3 bg-white rounded-xl text-amber-600 shadow-sm"><ShieldAlert size={20} /></div>
                       <div className="text-[10px] text-amber-900 font-bold leading-relaxed space-y-1">
                          <p className="uppercase tracking-widest text-amber-700 font-black">Security Protocol Active</p>
                          <p className="opacity-70">This action generates a confidential, one-time-access link that expires automatically after 24 hours. The recipient will be required to verify their identity via the secure portal.</p>
                       </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setShowShareModal(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                       <button onClick={handleShareSubmit} disabled={!shareEmail || isSharing} className="flex-1 py-4 rounded-2xl custom-theme-bg text-white font-black hover:opacity-90 shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                          {isSharing ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />} 
                          {isSharing ? 'Transmitting...' : 'Send Securely'}
                       </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Onboarding/Edit Modal */}
        {showAddEmployee && user?.role === 'admin' && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative">
                <div><h3 className="text-3xl font-black">{editingEmployee ? 'Update Personnel' : 'Personnel Onboarding'}</h3><p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[11px]">System Entry Form</p></div>
                <button onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); }} className="text-slate-400 hover:text-white text-4xl">&times;</button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const totalLeave = parseInt(fd.get('totalLeaveDays') as string) || 21;
                const emp: Employee = {
                  id: editingEmployee ? editingEmployee.id : Math.random().toString(36).substr(2, 9),
                  firstName: fd.get('firstName') as string,
                  lastName: fd.get('lastName') as string,
                  email: fd.get('email') as string,
                  kraPin: fd.get('kraPin') as string,
                  nssfNumber: fd.get('nssfNumber') as string,
                  nhifNumber: fd.get('nhifNumber') as string,
                  basicSalary: parseFloat(fd.get('basicSalary') as string) || 0,
                  benefits: parseFloat(fd.get('benefits') as string) || 0,
                  totalLeaveDays: totalLeave,
                  remainingLeaveDays: parseInt(fd.get('remainingLeaveDays') as string) || totalLeave,
                  joinedDate: editingEmployee ? editingEmployee.joinedDate : new Date().toISOString()
                };
                try {
                  if (editingEmployee) {
                    const updated = await apiService.updateEmployee(emp);
                    setEmployees(prev => prev.map(item => item.id === updated.id ? updated : item));
                    setSelectedEmployee(updated);
                  } else {
                    const saved = await apiService.saveEmployee(emp);
                    setEmployees(prev => [saved, ...prev]);
                  }
                  setShowAddEmployee(false);
                  setEditingEmployee(null);
                } catch (err) { alert("Error processing personnel record."); }
              }} className="p-10 grid grid-cols-2 gap-8 bg-white overflow-y-auto max-h-[70vh]">
                <FormField label="First Name" name="firstName" required defaultValue={editingEmployee?.firstName} />
                <FormField label="Last Name" name="lastName" required defaultValue={editingEmployee?.lastName} />
                <FormField label="Work Email" name="email" type="email" defaultValue={editingEmployee?.email} />
                <FormField label="KRA Identity (PIN)" name="kraPin" required placeholder="A000...Z" defaultValue={editingEmployee?.kraPin} />
                <FormField label="NSSF Reference" name="nssfNumber" required defaultValue={editingEmployee?.nssfNumber} />
                <FormField label="SHA/Health Ref" name="nhifNumber" required defaultValue={editingEmployee?.nhifNumber} />
                <div className="col-span-2 grid grid-cols-2 gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <FormField label="Monthly Base Salary" name="basicSalary" type="number" required defaultValue={editingEmployee?.basicSalary} />
                  <FormField label="Monthly Allowances" name="benefits" type="number" defaultValue={editingEmployee?.benefits} />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-8 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <FormField label="Total Annual Leave" name="totalLeaveDays" type="number" defaultValue={editingEmployee?.totalLeaveDays || 21} />
                  <FormField label="Remaining Days" name="remainingLeaveDays" type="number" defaultValue={editingEmployee?.remainingLeaveDays || 21} />
                </div>
                <div className="col-span-2 flex justify-end gap-4 mt-4 pt-8 border-t border-slate-100">
                  <button type="button" onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); }} className="px-8 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" className="px-8 py-4 rounded-2xl custom-theme-bg text-white font-black hover:opacity-90 shadow-xl transition-all uppercase tracking-widest text-sm">{editingEmployee ? 'Update Ledger' : 'Commit to Ledger'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (<button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm tracking-tight ${active ? 'custom-theme-bg text-white shadow-xl translate-x-1' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>{icon} {label}</button>);
const StatCard = ({ title, value, color, bgColor, icon }: any) => (<div className={`p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-xl ${bgColor}`}><div className="flex items-center justify-between mb-4"><div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</div><div className={`p-1.5 rounded-lg bg-white/50 ${color}`}>{icon}</div></div><div className={`text-3xl font-black ${color}`}>KES {Number(value || 0).toLocaleString()}</div></div>);
const DetailRow = ({ label, value }: any) => (<div className="flex justify-between items-center text-sm py-3 border-b border-slate-50 last:border-0"><span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{label}</span><span className="font-bold text-slate-800">{value}</span></div>);
const FormField = ({ label, name, type = "text", required = false, placeholder = "", defaultValue }: any) => (<div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label><input type={type} name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 focus:bg-white focus:custom-theme-border outline-none transition-all font-bold text-slate-700" /></div>);

export default App;
