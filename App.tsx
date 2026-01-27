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
  Lock,
  Mail,
  Eye,
  ShieldCheck,
  User as UserIcon,
  PlaneTakeoff,
  Activity,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Scale,
  Building2,
  Download,
  X,
  ChevronLast,
  History,
  FileDown,
  Save
} from 'lucide-react';
import { Employee, PayrollRecord, PayrollAudit, User, BrandSettings, LeaveRequest } from './types';
import { calculatePayroll } from './utils/calculations';
import { geminiService } from './services/geminiService';
import { apiService } from './services/apiService';
import { downloadCSV } from './utils/exportUtils';
import { parseEmployeeCSV } from './utils/importUtils';
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showLeaveRequestModal, setShowLeaveRequestModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  const [aiInsight, setAiInsight] = useState<string>('');
  const [taxOptimizationAdvice, setTaxOptimizationAdvice] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingTaxAdvice, setLoadingTaxAdvice] = useState(false);
  
  const [dbStatus, setDbStatus] = useState<'online' | 'local' | 'error'>('online');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', brandSettings.primaryColor);
    document.documentElement.style.setProperty('--primary-color-light', `${brandSettings.primaryColor}15`);
  }, [brandSettings.primaryColor]);

  useEffect(() => {
    if (!user) {
      setIsInitializing(false);
      return;
    }
    
    const skipTimer = setTimeout(() => setShowSkipButton(true), 2500);
    const hardLimitTimer = setTimeout(() => setIsInitializing(false), 5000);
    
    const loadInitialData = async () => {
      try {
        const isOnline = await apiService.checkBackend();
        setDbStatus(isOnline ? 'online' : 'local');

        const [empData, payrollData, auditData, brandData, leaveData] = await Promise.all([
          apiService.getEmployees().catch(() => []),
          apiService.getPayrollHistory().catch(() => []),
          apiService.getAuditLogs().catch(() => []),
          apiService.getBrandSettings().catch(() => null),
          apiService.getLeaveRequests(user.role === 'staff' ? user.employeeId : undefined).catch(() => [])
        ]);
        
        setEmployees(Array.isArray(empData) ? empData : []);
        setPayrollHistory(Array.isArray(payrollData) ? payrollData : []);
        setAuditLogs(Array.isArray(auditData) ? auditData : []);
        setLeaveRequests(Array.isArray(leaveData) ? leaveData : []);
        if (brandData) setBrandSettings(brandData);
        
        if (user.role === 'staff' && user.employeeId) {
          const self = (Array.isArray(empData) ? empData : []).find(e => e.id === user.employeeId);
          if (self) setSelectedEmployee(self);
        }
      } catch (error) {
        console.error("Initialization Error:", error);
      } finally {
        setIsInitializing(false);
        clearTimeout(skipTimer);
        clearTimeout(hardLimitTimer);
      }
    };
    loadInitialData();
    
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(hardLimitTimer);
    };
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
      // Reset view to dashboard on successful login
      setActiveTab('dashboard'); 
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
    setIsInitializing(false);
  };

  const accessibleEmployees = useMemo(() => {
    if (user?.role === 'admin' || user?.role === 'tax' || user?.role === 'manager') return employees;
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
    if (user?.role === 'admin' || user?.role === 'tax' || user?.role === 'manager') return payrollHistory;
    return payrollHistory.filter(p => p.employeeId === user?.employeeId);
  }, [payrollHistory, user]);

  const stats = useMemo(() => {
    const history = Array.isArray(accessiblePayroll) ? accessiblePayroll : [];
    const currentMonthPayroll = history.filter(p => 
      p.month === new Date().getMonth() && p.year === new Date().getFullYear()
    );
    return {
      totalGross: currentMonthPayroll.reduce((acc, curr) => acc + (curr.grossSalary || 0), 0),
      totalNet: currentMonthPayroll.reduce((acc, curr) => acc + (curr.netSalary || 0), 0),
      totalPaye: currentMonthPayroll.reduce((acc, curr) => acc + (curr.paye || 0), 0),
      totalNssf: currentMonthPayroll.reduce((acc, curr) => acc + (curr.nssf || 0), 0),
      totalSha: currentMonthPayroll.reduce((acc, curr) => acc + (curr.sha || 0), 0),
      totalHousing: currentMonthPayroll.reduce((acc, curr) => acc + (curr.housingLevy || 0), 0),
    };
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
      setAiInsight('AI insights temporarily unavailable.');
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
      setTaxOptimizationAdvice(advice || 'No advice available.');
    } catch (error) {
      setTaxOptimizationAdvice('Optimization advice unavailable.');
    } finally {
      setLoadingTaxAdvice(false);
    }
  };

  const processPayrollRun = async () => {
    if (!user) return;
    setIsLoading(true);
    const now = new Date();
    const records: PayrollRecord[] = accessibleEmployees.map(emp => ({
      ...calculatePayroll(emp.basicSalary, emp.benefits),
      id: Math.random().toString(36).substr(2, 9),
      employeeId: emp.id,
      month: now.getMonth(),
      year: now.getFullYear(),
      processedAt: now.toISOString()
    }));
    try {
      await apiService.savePayrollRun(records);
      setPayrollHistory(prev => [...records, ...prev]);
      alert(`Payroll ledger processed for ${records.length} personnel for ${now.toLocaleString('default', { month: 'long' })}.`);
    } catch (err) {
      alert("Payroll execution error.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !user.employeeId) return;
    const fd = new FormData(e.currentTarget);
    const request: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string,
      reason: fd.get('reason') as string,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };
    setIsLoading(true);
    try {
      await apiService.submitLeaveRequest(request);
      setLeaveRequests(prev => [request, ...prev]);
      setShowLeaveRequestModal(false);
    } catch (error) {
      alert('Failed to submit request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveStatusUpdate = async (id: string, status: 'approved' | 'rejected', employeeId: string, start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setIsLoading(true);
    try {
      await apiService.updateLeaveStatus(id, status, employeeId, diff);
      setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      if (status === 'approved') {
        setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, remainingLeaveDays: e.remainingLeaveDays - diff } : e));
      }
    } catch (error) {
      alert('Update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] custom-theme-bg shadow-2xl mb-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              {brandSettings.logoUrl ? <img src={brandSettings.logoUrl} className="w-14 h-14 object-contain" /> : <Receipt className="text-white" size={48} />}
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2 italic">PayrollPro<span className="text-blue-500">.ke</span></h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Enterprise Ledger Access</p>
          </div>
          <div className="bg-white/5 border border-white/10 backdrop-blur-3xl p-10 rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Official Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-500 group-focus-within:text-blue-500 transition-colors"><Mail size={18} /></div>
                  <input name="email" type="email" required placeholder="admin@payrollpro.com" className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl pl-14 pr-6 py-5 text-white focus:border-blue-500 focus:ring-4 ring-blue-500/10 outline-none transition-all font-bold placeholder:text-slate-600" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Secure Token</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-500 group-focus-within:text-blue-500 transition-colors"><Lock size={18} /></div>
                  <input name="password" type="password" required placeholder="••••••••" className="w-full bg-slate-900 border-2 border-slate-800 rounded-3xl pl-14 pr-6 py-5 text-white focus:border-blue-500 focus:ring-4 ring-blue-500/10 outline-none transition-all font-bold placeholder:text-slate-600" />
                </div>
              </div>
              {authError && <div className="p-5 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-shake">{authError}</div>}
              <button type="submit" disabled={isLoggingIn} className="w-full custom-theme-bg text-white font-black py-5 rounded-3xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)]">
                {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                {isLoggingIn ? 'Authorizing...' : 'Establish Secure Connection'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 selection:bg-blue-100 selection:text-blue-900">
      {isInitializing && (
        <div className="fixed inset-0 bg-white z-[999] flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
          <div className="relative mb-10">
            <Loader2 className="animate-spin text-blue-600 relative z-10" size={80} />
            <div className="absolute inset-0 bg-blue-100 rounded-full blur-[60px] animate-pulse opacity-40"></div>
          </div>
          <h2 className="font-black text-3xl text-slate-800 mb-2 tracking-tight">Syncing Global Ledger...</h2>
          <p className="text-slate-400 text-sm font-medium">Validating compliance tokens and encrypted personnel data</p>
          {showSkipButton && (
            <button 
              onClick={() => setIsInitializing(false)} 
              className="mt-16 flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 hover:-translate-y-1 transition-all active:translate-y-0"
            >
              <ChevronLast size={18} /> Bypass Optimization
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[1000] flex items-center justify-center">
           <div className="bg-white px-10 py-6 rounded-[32px] shadow-2xl border border-slate-100 flex items-center gap-4 animate-in zoom-in-95">
              <Loader2 className="animate-spin custom-theme-text" size={24} />
              <span className="font-black text-xs uppercase tracking-[0.15em] text-slate-700">Committing Transaction...</span>
           </div>
        </div>
      )}

      <aside className="w-72 bg-slate-900 text-white flex flex-col no-print shrink-0 shadow-2xl z-50">
        <div className="p-10">
          <h1 className="text-2xl font-black flex items-center gap-4 tracking-tighter italic">
            {brandSettings.logoUrl ? <img src={brandSettings.logoUrl} className="w-10 h-10 object-contain" /> : <Receipt className="text-blue-500" size={32} />} 
            <span className="truncate">{brandSettings.entityName}</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20}/>} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          
          {/* MANAGERS and ADMINS can see Personnel and Payroll */}
          {(user.role === 'admin' || user.role === 'manager') && (
            <>
              <NavItem 
                icon={<Users size={20}/>} 
                label="Personnel" 
                active={activeTab === 'employees'} 
                onClick={() => setActiveTab('employees')} 
              />
              <NavItem 
                icon={<Receipt size={20}/>} 
                label="Monthly Run" 
                active={activeTab === 'payroll'} 
                onClick={() => setActiveTab('payroll')} 
              />
            </>
          )}

          <NavItem 
            icon={<PlaneTakeoff size={20}/>} 
            label="Leave Requests" 
            active={activeTab === 'leave'} 
            onClick={() => setActiveTab('leave')} 
          />

          {/* ONLY ADMINS can see Settings/Branding */}
          {user.role === 'admin' && (
            <NavItem 
              icon={<Settings size={20}/>} 
              label="Entity Branding" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
            />
          )}
        </nav>
        <div className="px-8 py-10 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-[18px] bg-blue-600/20 text-blue-400 flex items-center justify-center font-black ring-1 ring-blue-500/20 shadow-inner"><UserIcon size={24} /></div>
            <div className="overflow-hidden">
              <div className="text-sm font-black truncate text-slate-100">{user.firstName} {user.lastName}</div>
              <div className="text-[9px] text-blue-400 font-black uppercase tracking-[0.15em] mt-1">{user.role} Identity</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-red-950/40 text-slate-400 hover:text-red-400 py-4 rounded-[20px] transition-all font-black text-[10px] uppercase tracking-[0.2em] border border-slate-700/50 hover:border-red-900/50"><LogOut size={16} /> Terminate</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative bg-[#f8fafc]">
        <div className="p-12 no-print max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-5xl font-black text-slate-800 tracking-tight leading-tight">{(user.role === 'admin' || user.role === 'tax' || user.role === 'manager') ? 'Organization Pulse' : `Welcome, ${user.firstName}`}</h2>
                  <div className="flex items-center gap-4 mt-6">
                    <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] flex items-center gap-3 border shadow-sm ${dbStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      {dbStatus === 'online' ? <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> : <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                      {dbStatus === 'online' ? 'Real-time Ledger Connected' : 'Local Sandbox Mode'}
                    </div>
                  </div>
                </div>
                {(user.role === 'admin' || user.role === 'tax' || user.role === 'manager') && (
                  <div className="glass-effect px-10 py-6 rounded-[36px] shadow-sm border border-slate-200 flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl shadow-inner">KES</div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total Monthly Gross</div>
                      <div className="text-3xl font-black text-slate-800">{stats.totalGross.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="PAYE (Tax)" value={stats.totalPaye} color="text-red-600" bgColor="bg-red-50" icon={<Scale size={20}/>} />
                <StatCard title="NSSF (Pension)" value={stats.totalNssf} color="text-blue-600" bgColor="bg-blue-50" icon={<ShieldCheck size={20}/>} />
                <StatCard title="SHA (Health)" value={stats.totalSha} color="text-emerald-600" bgColor="bg-emerald-50" icon={<Activity size={20}/>} />
                <StatCard title="Housing Levy" value={stats.totalHousing} color="text-indigo-600" bgColor="bg-indigo-50" icon={<Building2 size={20}/>} />
              </div>
              
              {(user.role === 'admin' || user.role === 'tax' || user.role === 'manager') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><History className="text-blue-500" /> Integrity Logs</h3>
                      <button onClick={() => setActiveTab('reports')} className="text-[10px] font-black uppercase text-blue-600 hover:underline tracking-widest">Full Audit Trail</button>
                    </div>
                    <div className="space-y-4">
                      {auditLogs.length > 0 ? auditLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="p-5 rounded-[24px] bg-slate-50/60 border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                          <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-xl bg-white border shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors"><ShieldCheck size={18} /></div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{log.action}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{log.performedBy} • {new Date(log.timestamp).toLocaleTimeString()}</div>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                        </div>
                      )) : (
                        <div className="py-20 text-center text-slate-300 font-bold border-2 border-dashed rounded-[32px]">No Recent Logs</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
                     <div className="absolute -right-16 -bottom-16 opacity-[0.05] transform rotate-12"><ShieldCheck size={320} /></div>
                     <div className="relative z-10">
                        <div className="inline-flex px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8 border border-blue-500/20">Statutory Watch</div>
                        <h3 className="text-3xl font-black mb-6 leading-tight">Compliance Status:<br/>Finance Act 2024</h3>
                        <p className="text-slate-400 text-base leading-relaxed mb-10">The engine is currently calculating deductions based on the latest gazetted regulations. SHA (2.75%) and AHL (1.5%) are enforced.</p>
                        <div className="flex flex-wrap gap-4">
                           <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div> NSSF TIER I & II Active</div>
                           <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> PR: KES 2,400 Valid</div>
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'employees' && (user.role === 'admin' || user.role === 'manager')) && (
            <div className="space-y-10 animate-in slide-in-from-right-10 duration-700">
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Personnel Directory</h2>
                <div className="flex gap-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400"><Search size={18} /></div>
                    <input 
                      type="text" 
                      placeholder="Search name, PIN or email..." 
                      value={employeeSearchQuery}
                      onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                      className="w-80 bg-white border border-slate-200 rounded-[24px] pl-14 pr-6 py-4 focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-sm" 
                    />
                  </div>
                  {user.role === 'admin' && (
                    <button onClick={() => setShowAddEmployee(true)} className="custom-theme-bg text-white px-10 py-4 rounded-[24px] flex items-center gap-3 font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                      <Plus size={20} /> Onboard Personnel
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                        <th className="py-8 px-10">Personnel Identity</th>
                        <th className="py-8 px-10">Monthly Gross</th>
                        <th className="py-8 px-10">Leave Balance</th>
                        <th className="py-8 px-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployeesList.map(emp => (
                        <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/40 transition-all cursor-pointer group" onClick={() => { setSelectedEmployee(emp); setShowDetailModal(true); }}>
                          <td className="py-8 px-10">
                            <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-[18px] bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:rotate-6 font-black transition-all duration-500">{emp.firstName[0]}{emp.lastName[0]}</div>
                              <div>
                                <div className="font-black text-slate-800 text-base">{emp.firstName} {emp.lastName}</div>
                                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">{emp.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-8 px-10">
                            <div className="font-black text-slate-700">KES {emp.basicSalary.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">PIN: {emp.kraPin}</div>
                          </td>
                          <td className="py-8 px-10">
                            <div className={`text-sm font-black ${emp.remainingLeaveDays < 5 ? 'text-red-500' : 'text-emerald-600'}`}>{emp.remainingLeaveDays} Days Remaining</div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(emp.remainingLeaveDays / emp.totalLeaveDays) * 100}%` }}></div></div>
                          </td>
                          <td className="py-8 px-10">
                             <div className="p-3 rounded-2xl bg-slate-50 text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all inline-block shadow-inner"><Eye size={20} /></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (user.role === 'admin' || user.role === 'manager') && (
            <div className="animate-in zoom-in-95 duration-700 flex flex-col items-center justify-center min-h-[60vh] text-center p-12">
               <div className="max-w-xl w-full glass-effect rounded-[56px] shadow-2xl border border-white p-16 space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-[80px]"></div>
                  <div className="w-28 h-28 bg-blue-50 rounded-[36px] flex items-center justify-center text-blue-600 mx-auto shadow-inner relative"><Receipt size={56} /><div className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black border-4 border-white">2024</div></div>
                  <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">Execute Monthly Run</h2>
                    <p className="text-slate-500 font-medium mt-4 text-lg">Finalizing calculations for {new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}. This action will commit all statutory values to the global ledger.</p>
                  </div>
                  {user.role === 'admin' ? (
                    <button onClick={processPayrollRun} className="w-full custom-theme-bg text-white py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] active:scale-95 text-sm">Commit & Execute Transaction</button>
                  ) : (
                    <div className="p-6 bg-slate-50 rounded-3xl text-slate-500 font-bold italic">Managers have View-Only access to payroll data. Processing remains restricted to Administrators.</div>
                  )}
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secure TLS/SSL Transaction • Audited by System</p>
               </div>
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-12 animate-in fade-in slide-in-from-right-10 duration-700">
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black text-slate-800 flex items-center gap-4"><PlaneTakeoff className="text-blue-500" size={40} /> Leave Management</h2>
                {user.role === 'staff' && (
                  <button onClick={() => setShowLeaveRequestModal(true)} className="custom-theme-bg text-white px-10 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl hover:-translate-y-1 transition-all">
                    Request Absence
                  </button>
                )}
              </div>
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-[0.2em]">
                      <th className="py-8 px-10">Personnel</th>
                      <th className="py-8 px-10">Absence Period</th>
                      <th className="py-8 px-10">Status Token</th>
                      {(user.role === 'admin' || user.role === 'manager') && <th className="py-8 px-10">Ledger Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.length > 0 ? leaveRequests.map(req => (
                      <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all">
                        <td className="py-8 px-10 font-black text-slate-800 text-base">{req.firstName} {req.lastName}</td>
                        <td className="py-8 px-10">
                          <div className="font-bold text-slate-700 text-sm">{new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{req.reason}</div>
                        </td>
                        <td className="py-8 px-10">
                          <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : (req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100')}`}>
                            {req.status}
                          </span>
                        </td>
                        {(user.role === 'admin' || user.role === 'manager') && (
                          <td className="py-8 px-10">
                            {req.status === 'pending' && (
                              <div className="flex gap-3">
                                <button onClick={() => handleLeaveStatusUpdate(req.id, 'approved', req.employeeId, req.startDate, req.endDate)} className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-lg transition-all"><ThumbsUp size={18}/></button>
                                <button onClick={() => handleLeaveStatusUpdate(req.id, 'rejected', req.employeeId, req.startDate, req.endDate)} className="p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white hover:shadow-lg transition-all"><ThumbsDown size={18}/></button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="py-24 text-center text-slate-300 font-bold border-2 border-dashed rounded-[32px] mx-10 my-10 inline-block w-[calc(100%-80px)]">No Active Leave Applications</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (user.role === 'admin' || user.role === 'tax' || user.role === 'manager') && (
            <div className="space-y-12 animate-in fade-in duration-700">
               <div className="flex justify-between items-center">
                 <h2 className="text-4xl font-black text-slate-800 tracking-tight">Compliance & Reporting</h2>
                 <button onClick={() => window.print()} className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 hover:bg-slate-800 transition-all"><Printer size={18}/> Export System PDF</button>
               </div>
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                  <div className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-10 opacity-5"><Receipt size={160}/></div>
                     <h3 className="text-2xl font-black mb-10 flex items-center gap-3"><FileText className="text-blue-500" /> Digital Payslip Preview</h3>
                     {selectedEmployee ? (
                       <div className="scale-95 origin-top bg-[#f8fafc] p-10 rounded-[40px] border border-dashed border-slate-200">
                         <Payslip employee={selectedEmployee} record={latestSelectedEmployeeRecord || { ...calculatePayroll(selectedEmployee.basicSalary, selectedEmployee.benefits), id: 'DRAFT', employeeId: selectedEmployee.id, month: new Date().getMonth(), year: new Date().getFullYear(), processedAt: new Date().toISOString() } as PayrollRecord} brand={brandSettings} />
                       </div>
                     ) : (
                       <div className="py-32 text-center text-slate-300 font-bold border-4 border-dotted rounded-[40px] bg-slate-50/30">Select Personnel from Directory to Preview</div>
                     )}
                  </div>
                  <div className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-sm overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-10 opacity-5"><FileDown size={160}/></div>
                     <h3 className="text-2xl font-black mb-10 flex items-center gap-3"><Scale className="text-emerald-500" /> Statutory P9 Summary</h3>
                     {selectedEmployee ? (
                       <div className="scale-[0.85] origin-top bg-[#f8fafc] p-10 rounded-[40px] border border-dashed border-slate-200">
                         <P9Form employee={selectedEmployee} records={accessiblePayroll.filter(r => r.employeeId === selectedEmployee.id)} brand={brandSettings} />
                       </div>
                     ) : (
                       <div className="py-32 text-center text-slate-300 font-bold border-4 border-dotted rounded-[40px] bg-slate-50/30">Select Personnel from Directory to Preview</div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && user.role === 'admin' && (
            <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-10 duration-700 py-10">
               <h2 className="text-4xl font-black text-slate-800 mb-12 tracking-tight">System Entity Branding</h2>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 const fd = new FormData(e.currentTarget);
                 const updated: BrandSettings = {
                   entityName: fd.get('entityName') as string,
                   logoUrl: fd.get('logoUrl') as string,
                   primaryColor: fd.get('primaryColor') as string,
                   address: fd.get('address') as string,
                 };
                 setIsLoading(true);
                 try {
                   await apiService.saveBrandSettings(updated);
                   setBrandSettings(updated);
                   alert('Entity settings synchronized successfully.');
                 } finally { setIsLoading(false); }
               }} className="bg-white p-16 rounded-[56px] shadow-2xl border border-slate-100 space-y-10 relative">
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-50"></div>
                  <FormField label="Organization Legal Name" name="entityName" defaultValue={brandSettings.entityName} required placeholder="e.g. Acme Africa Ltd" />
                  <FormField label="Brand Assets (Logo URL)" name="logoUrl" defaultValue={brandSettings.logoUrl} placeholder="https://cdn.yourdomain.com/logo.png" />
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="Brand Primary Color" name="primaryColor" type="color" defaultValue={brandSettings.primaryColor} />
                    <div className="bg-slate-50 rounded-3xl p-6 flex items-center gap-4 border border-slate-100">
                       <div className="w-12 h-12 rounded-2xl shadow-lg" style={{ backgroundColor: brandSettings.primaryColor }}></div>
                       <div><div className="text-[10px] font-black uppercase text-slate-400">Preview</div><div className="font-bold text-slate-800">{brandSettings.primaryColor.toUpperCase()}</div></div>
                    </div>
                  </div>
                  <FormField label="Registered Physical Address" name="address" defaultValue={brandSettings.address} required placeholder="Building, Street, City" />
                  <button type="submit" className="w-full custom-theme-bg text-white py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"><Save size={20}/> Update Global Identity</button>
               </form>
            </div>
          )}
        </div>

        {/* --- MODALS --- */}

        {showDetailModal && selectedEmployee && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[56px] shadow-[0_64px_128px_-16px_rgba(0,0,0,0.4)] w-full max-w-3xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="bg-slate-900 p-12 text-white flex justify-between items-center shrink-0 relative">
                <div className="absolute top-0 right-0 p-10 opacity-5"><UserIcon size={240} /></div>
                <div className="flex items-center gap-8 relative z-10">
                   <div className="w-24 h-24 custom-theme-bg rounded-[32px] flex items-center justify-center text-5xl font-black shadow-2xl rotate-3">{selectedEmployee.firstName[0]}</div>
                   <div>
                     <h3 className="text-4xl font-black tracking-tighter">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                     <div className="flex items-center gap-3 mt-3">
                        <div className="px-4 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-300">Identity: #{selectedEmployee.id.toUpperCase()}</div>
                        <div className="px-4 py-1 rounded-full bg-blue-500/20 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest text-blue-300">Role: Active Staff</div>
                     </div>
                   </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-slate-500 hover:text-white p-4 hover:bg-white/10 rounded-full transition-all relative z-10"><X size={32} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-[#f8fafc]">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Statutory Identifiers</h4>
                       <DetailRow label="Monthly Gross" value={`KES ${selectedEmployee.basicSalary.toLocaleString()}`} />
                       <DetailRow label="Tax Identification" value={selectedEmployee.kraPin} />
                       <DetailRow label="NSSF Reference" value={selectedEmployee.nssfNumber} />
                       <DetailRow label="Health / SHA" value={selectedEmployee.nhifNumber} />
                    </div>
                    <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Contractual Data</h4>
                       <DetailRow label="Leave Remaining" value={`${selectedEmployee.remainingLeaveDays} Days`} />
                       <DetailRow label="Annual Leave Total" value={`${selectedEmployee.totalLeaveDays} Days`} />
                       <DetailRow label="Onboarding Date" value={new Date(selectedEmployee.joinedDate).toLocaleDateString()} />
                       <DetailRow label="Communication" value={selectedEmployee.email} />
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-2">
                       <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><BrainCircuit size={18} /></div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">GenAI Tax Intelligence</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <button onClick={() => getAiTaxAdvice(selectedEmployee)} disabled={loadingAi} className="bg-white border-2 border-slate-100 p-6 rounded-[28px] font-black uppercase text-[10px] tracking-widest shadow-sm hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-3">
                         {loadingAi ? <Loader2 className="animate-spin" size={18}/> : <Activity size={18}/>} Deduction Analysis
                       </button>
                       <button onClick={() => handleGetTaxOptimization(selectedEmployee)} disabled={loadingTaxAdvice} className="bg-white border-2 border-slate-100 p-6 rounded-[28px] font-black uppercase text-[10px] tracking-widest shadow-sm hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-3">
                         {loadingTaxAdvice ? <Loader2 className="animate-spin" size={18}/> : <Lightbulb size={18}/>} Optimization Strategy
                       </button>
                    </div>
                    {(aiInsight || taxOptimizationAdvice) && (
                      <div className="bg-blue-50 p-10 rounded-[40px] border-2 border-blue-100 text-[13px] leading-relaxed text-slate-700 font-medium italic animate-in slide-in-from-top-4">
                        <Sparkles size={20} className="text-blue-400 mb-4" />
                        "{aiInsight || taxOptimizationAdvice}"
                        <div className="mt-6 text-[9px] font-black uppercase text-blue-400 tracking-widest">Analysis provided by Gemini 3.0 Pro</div>
                      </div>
                    )}
                 </div>
              </div>
              <div className="p-10 border-t bg-white flex gap-6 shrink-0">
                {user.role === 'admin' && (
                  <button onClick={() => { setEditingEmployee(selectedEmployee); setShowAddEmployee(true); setShowDetailModal(false); }} className="flex-1 bg-slate-100 py-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-200 transition-all">Edit Records</button>
                )}
                <button onClick={() => setShowDetailModal(false)} className="flex-1 custom-theme-bg text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl">Close Profile</button>
              </div>
            </div>
          </div>
        )}

        {showAddEmployee && user.role === 'admin' && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[56px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95">
              <div className="bg-slate-900 p-12 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-4xl font-black tracking-tight">{editingEmployee ? 'Update Records' : 'Personnel Onboarding'}</h3>
                  <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.2em] text-[10px]">Secure Ledger Entry Form</p>
                </div>
                <button onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); }} className="text-slate-500 hover:text-white p-4 hover:bg-white/10 rounded-full transition-all"><X size={32} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
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
                  totalLeaveDays: parseInt(fd.get('totalLeaveDays') as string) || 21,
                  remainingLeaveDays: editingEmployee ? editingEmployee.remainingLeaveDays : 21,
                  joinedDate: editingEmployee ? editingEmployee.joinedDate : new Date().toISOString()
                };
                setIsLoading(true);
                try {
                  if (editingEmployee) await apiService.updateEmployee(emp);
                  else await apiService.saveEmployee(emp);
                  setShowAddEmployee(false);
                  setEditingEmployee(null);
                  const fresh = await apiService.getEmployees();
                  setEmployees(fresh);
                } finally { setIsLoading(false); }
              }} className="p-12 grid grid-cols-2 gap-8 bg-[#f8fafc] overflow-y-auto max-h-[75vh]">
                <FormField label="First Name" name="firstName" required defaultValue={editingEmployee?.firstName} />
                <FormField label="Last Name" name="lastName" required defaultValue={editingEmployee?.lastName} />
                <FormField label="Corporate Email" name="email" type="email" defaultValue={editingEmployee?.email} />
                <FormField label="KRA Identity (PIN)" name="kraPin" required defaultValue={editingEmployee?.kraPin} placeholder="A000000000Z" />
                <div className="col-span-2 grid grid-cols-2 gap-8 p-10 bg-white rounded-[40px] border border-slate-100 shadow-inner">
                  <FormField label="Monthly Basic Salary" name="basicSalary" type="number" required defaultValue={editingEmployee?.basicSalary} />
                  <FormField label="Taxable Benefits" name="benefits" type="number" defaultValue={editingEmployee?.benefits} />
                </div>
                <FormField label="NSSF Ref Number" name="nssfNumber" defaultValue={editingEmployee?.nssfNumber} />
                <FormField label="SHA / NHIF Ref" name="nhifNumber" defaultValue={editingEmployee?.nhifNumber} />
                <div className="col-span-2 flex justify-end gap-6 mt-10">
                  <button type="button" onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); }} className="px-10 py-5 rounded-[24px] border-2 border-slate-200 font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-50">Discard</button>
                  <button type="submit" className="px-12 py-5 rounded-[24px] custom-theme-bg text-white font-black uppercase text-xs tracking-widest shadow-xl hover:-translate-y-1 transition-all">Authorize Personnel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showLeaveRequestModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[400] flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="bg-white rounded-[56px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-900 p-12 text-white flex justify-between items-center"><h3 className="text-3xl font-black">Apply for Absence</h3><button onClick={() => setShowLeaveRequestModal(false)} className="text-slate-500 hover:text-white"><X size={32} /></button></div>
                <form onSubmit={handleLeaveRequestSubmit} className="p-12 space-y-8 bg-[#f8fafc]">
                   <div className="grid grid-cols-2 gap-8">
                     <FormField label="Commencement Date" name="startDate" type="date" required />
                     <FormField label="Resumption Date" name="endDate" type="date" required />
                   </div>
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Justification for Absence</label>
                     <textarea name="reason" rows={4} required className="w-full border-2 border-slate-100 rounded-[28px] px-8 py-6 font-bold text-slate-700 outline-none focus:border-blue-500 bg-white transition-all resize-none shadow-inner" placeholder="Provide detailed context..." />
                   </div>
                   <button type="submit" className="w-full custom-theme-bg text-white py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 transition-all">Submit Application</button>
                </form>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`w-full flex items-center gap-5 px-8 py-5 rounded-[24px] transition-all duration-500 font-black text-[11px] uppercase tracking-[0.15em] ${active ? 'custom-theme-bg text-white shadow-[0_12px_24px_-8px_rgba(37,99,235,0.6)] translate-x-2' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
  >
    <div className={`transition-transform duration-500 ${active ? 'scale-110' : ''}`}>{icon}</div>
    {label}
  </button>
);

const StatCard = ({ title, value, color, bgColor, icon }: any) => (
  <div className={`p-10 rounded-[44px] border border-slate-100 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${bgColor}`}>
    <div className="flex items-center justify-between mb-6">
      <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{title}</div>
      <div className={`p-3 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm ${color}`}>{icon}</div>
    </div>
    <div className={`text-4xl font-black ${color} tracking-tight`}>KES {Number(value || 0).toLocaleString()}</div>
  </div>
);

const DetailRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center text-sm py-4 border-b border-slate-50 last:border-0 hover:translate-x-1 transition-transform">
    <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-[9px]">{label}</span>
    <span className="font-black text-slate-800">{value}</span>
  </div>
);

const FormField = ({ label, name, type = "text", required = false, placeholder = "", defaultValue }: any) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{label}</label>
    <input 
      type={type} 
      name={name} 
      required={required} 
      placeholder={placeholder} 
      defaultValue={defaultValue} 
      className="w-full border-2 border-slate-100 rounded-[24px] px-8 py-5 bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 shadow-sm focus:ring-4 ring-blue-500/5" 
    />
  </div>
);

const Sparkles = ({ size, className }: any) => (
  <div className={className}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
  </div>
);

export default App;