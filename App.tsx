import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, LayoutDashboard, Receipt, FileText, Settings, Plus, Search, BrainCircuit, LogOut, 
  ChevronRight, Printer, Database, Loader2, CloudOff, Cloud, Lock, Mail, Eye, EyeOff, 
  ShieldCheck, User as UserIcon, CalendarDays, Edit2, Share2, Send, X, CheckCircle2, 
  Sparkles, ShieldAlert, History, Activity, Info, Filter, ArrowUpDown, Calendar, 
  Palette, Building2, ImageIcon, Save, PlaneTakeoff, Clock, ThumbsUp, ThumbsDown, 
  AlertCircle, Lightbulb, Coins, ShieldQuestion, FileSearch, Scale, Briefcase, 
  Fingerprint, Download, Upload, FileDown, Zap, ChevronLast
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
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'local' | 'error'>('online');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply dynamic theme color
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', brandSettings.primaryColor);
    document.documentElement.style.setProperty('--primary-color-light', `${brandSettings.primaryColor}20`);
  }, [brandSettings.primaryColor]);

  // Load data
  useEffect(() => {
    if (!user) {
      setIsInitializing(false);
      return;
    }
    
    const loadInitialData = async () => {
      setIsInitializing(true);
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
      } catch (error) {
        setDbStatus('error');
      } finally {
        setIsInitializing(false);
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
  };

  const stats = useMemo(() => {
    const currentMonthPayroll = payrollHistory.filter(p => 
      p.month === new Date().getMonth() && p.year === new Date().getFullYear()
    );
    return {
      totalGross: currentMonthPayroll.reduce((acc, curr) => acc + (curr.grossSalary || 0), 0),
      totalNet: currentMonthPayroll.reduce((acc, curr) => acc + (curr.netSalary || 0), 0),
    };
  }, [payrollHistory]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white">
              {brandSettings.entityName.split(' ')[0]} <span className="text-blue-500">Pro</span>
            </h1>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[40px]">
            <form onSubmit={handleLogin} className="space-y-6">
              <input name="email" type="email" placeholder="Email" className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-white outline-none" required />
              <input name="password" type="password" placeholder="Password" className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 text-white outline-none" required />
              {authError && <p className="text-red-400 text-xs font-bold">{authError}</p>}
              <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl">
                {isLoggingIn ? 'Authorizing...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {isInitializing && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[999] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-6" size={64} />
          <p className="font-black text-2xl text-slate-800">Syncing Systems...</p>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col no-print shrink-0 shadow-2xl">
        <div className="p-8">
          <h1 className="text-xl font-bold flex items-center gap-3">
            <Receipt className="text-blue-500" />
            <span className="truncate">{brandSettings.entityName}</span>
          </h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          
          {(user.role === 'admin' || user.role === 'manager') && (
            <>
              <NavItem icon={<Users size={20}/>} label="Personnel" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
              <NavItem icon={<Receipt size={20}/>} label="Monthly Run" active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
            </>
          )}

          <NavItem icon={<PlaneTakeoff size={20}/>} label="Leave Requests" active={activeTab === 'leave'} onClick={() => setActiveTab('leave')} />

          {user.role === 'admin' && (
            <NavItem icon={<Settings size={20}/>} label="Entity Branding" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          )}
        </nav>

        <div className="px-6 py-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center"><UserIcon size={20} /></div>
             <div>
               <div className="text-sm font-black">{user.firstName}</div>
               <div className="text-[10px] text-blue-400 uppercase font-black">{user.role}</div>
             </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-red-400">
            <LogOut size={14} /> Terminate Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative p-10">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                    {(user.role === 'admin' || user.role === 'manager') ? 'Organization Pulse' : `Hello, ${user.firstName}`}
                  </h2>
                  <p className="text-slate-500 text-lg mt-2">
                    {dbStatus === 'online' ? '✅ System Live' : '⚠️ Offline Mode'}
                  </p>
                </div>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Monthly Liability</div>
                    <div className="text-2xl font-black text-slate-800">KES {stats.totalGross.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Add other views (EmployeeView, PayrollView, etc.) here */}
          {activeTab === 'employees' && (user.role === 'admin' || user.role === 'manager') && <div className="text-slate-800 font-bold text-2xl">Personnel Management Interface</div>}
          {activeTab === 'payroll' && (user.role === 'admin' || user.role === 'manager') && <div className="text-slate-800 font-bold text-2xl">Monthly Payroll Processing</div>}
          {activeTab === 'leave' && <div className="text-slate-800 font-bold text-2xl">Leave Management System</div>}
          {activeTab === 'settings' && user.role === 'admin' && <div className="text-slate-800 font-bold text-2xl">Entity Branding & Configuration</div>}
        </div>
      </main>
    </div>
  );
};

// Sub-components
const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon}
    <span className="font-bold text-sm">{label}</span>
  </button>
);

export default App;