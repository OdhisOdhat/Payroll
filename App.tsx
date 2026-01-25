
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  Settings, 
  Plus, 
  Search,
  Download,
  BrainCircuit,
  LogOut,
  ChevronRight,
  Printer,
  Database,
  Loader2,
  CloudOff,
  Cloud
} from 'lucide-react';
import { Employee, PayrollRecord } from './types';
import { calculatePayroll } from './utils/calculations';
import { geminiService } from './services/geminiService';
import { apiService } from './services/apiService';
import Payslip from './components/Payslip';
import P9Form from './components/P9Form';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'payroll' | 'reports'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'local' | 'error'>('online');

  // Load data from Hybrid API Service
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // First check if the real backend is alive
        const isOnline = await apiService.checkBackend();
        setDbStatus(isOnline ? 'online' : 'local');

        const [empData, payrollData] = await Promise.all([
          apiService.getEmployees(),
          apiService.getPayrollHistory()
        ]);
        
        setEmployees(Array.isArray(empData) ? empData : []);
        setPayrollHistory(Array.isArray(payrollData) ? payrollData : []);
      } catch (error) {
        console.error("Data Load Error:", error);
        setDbStatus('error');
        // Fallback to local storage if API call completely failed
        setEmployees([]);
        setPayrollHistory([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    
    if (!firstName || !lastName) return;

    const newEmployee: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      firstName,
      lastName,
      email: formData.get('email') as string || '',
      kraPin: formData.get('kraPin') as string || '',
      nssfNumber: formData.get('nssfNumber') as string || '',
      nhifNumber: formData.get('nhifNumber') as string || '',
      basicSalary: parseFloat(formData.get('basicSalary') as string) || 0,
      benefits: parseFloat(formData.get('benefits') as string) || 0,
      joinedDate: new Date().toISOString(),
    };

    try {
      const saved = await apiService.saveEmployee(newEmployee);
      setEmployees(prev => [saved, ...prev]);
      setShowAddEmployee(false);
    } catch (err) {
      alert("Error saving record. The system is currently in read-only mode.");
    }
  };

  const runPayroll = async () => {
    if (employees.length === 0) {
      alert("No employees to process.");
      return;
    }
    
    setIsLoading(true);
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const newRecords: PayrollRecord[] = employees.map(emp => {
      const calcs = calculatePayroll(emp.basicSalary, emp.benefits);
      return {
        ...calcs,
        id: Math.random().toString(36).substr(2, 9),
        employeeId: emp.id,
        month,
        year,
        processedAt: new Date().toISOString()
      };
    });

    try {
      await apiService.savePayrollRun(newRecords);
      setPayrollHistory(prev => [...newRecords, ...prev]);
      alert(`Successfully processed payroll for ${employees.length} employees.`);
    } catch (err) {
      alert("Error processing payroll. Please check your database connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const getAiTaxAdvice = async (emp: Employee) => {
    setLoadingAi(true);
    setAiInsight('');
    try {
      const calcs = calculatePayroll(emp.basicSalary, emp.benefits);
      const advice = await geminiService.explainDeductions(emp.basicSalary + emp.benefits, calcs);
      setAiInsight(advice || 'No advice available.');
    } catch (err) {
      setAiInsight("AI analysis is currently unavailable. Please verify your Gemini API key.");
    } finally {
      setLoadingAi(false);
    }
  };

  const stats = useMemo(() => {
    const history = Array.isArray(payrollHistory) ? payrollHistory : [];
    const currentMonthPayroll = history.filter(p => 
      p.month === new Date().getMonth() && p.year === new Date().getFullYear()
    );
    return {
      totalGross: currentMonthPayroll.reduce((acc, curr) => acc + curr.grossSalary, 0),
      totalNet: currentMonthPayroll.reduce((acc, curr) => acc + curr.netSalary, 0),
      totalPaye: currentMonthPayroll.reduce((acc, curr) => acc + curr.paye, 0),
      totalNssf: currentMonthPayroll.reduce((acc, curr) => acc + curr.nssf, 0),
      totalSha: currentMonthPayroll.reduce((acc, curr) => acc + curr.sha, 0),
      totalHousing: currentMonthPayroll.reduce((acc, curr) => acc + curr.housingLevy, 0),
    };
  }, [payrollHistory]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col no-print shrink-0 shadow-2xl">
        <div className="p-8">
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight">
            <Receipt className="text-blue-400" /> Payroll<span className="text-blue-400">Pro</span>
          </h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Users size={20}/>} label="Employees" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
          <NavItem icon={<Receipt size={20}/>} label="Monthly Run" active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
          <NavItem icon={<FileText size={20}/>} label="Reports & P9" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        </nav>
        
        {/* Connection Status Indicator */}
        <div className="px-6 py-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {dbStatus === 'online' ? (
                <Cloud size={14} className="text-green-500" />
              ) : (
                <CloudOff size={14} className="text-orange-500" />
              )}
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Sync Status</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${dbStatus === 'online' ? 'text-green-400' : 'text-orange-400'}`}>
                {dbStatus === 'online' ? 'Turso Cloud' : 'Local Instance'}
              </span>
              <div className={`w-2 h-2 rounded-full animate-pulse ${dbStatus === 'online' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <Settings size={20} /> Settings
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 transition mt-2">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center text-blue-600 transition-all">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="font-bold text-lg animate-pulse tracking-tight text-slate-700">Synchronizing Ledger...</p>
          </div>
        )}

        <div className="p-10 no-print max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Organization Pulse</h2>
                  <p className="text-slate-500 mt-2 text-lg">Real-time payroll distribution and compliance monitoring.</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-xl text-blue-600 font-black">KES</div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Liability</div>
                      <div className="text-2xl font-black text-slate-800">{stats.totalGross.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Income Tax (PAYE)" value={stats.totalPaye} color="text-red-600" bgColor="bg-red-50" icon={<Cloud size={16}/>} />
                <StatCard title="Social Security" value={stats.totalNssf} color="text-blue-600" bgColor="bg-blue-50" icon={<Database size={16}/>} />
                <StatCard title="Health Levy (SHA)" value={stats.totalSha} color="text-emerald-600" bgColor="bg-emerald-50" icon={<Cloud size={16}/>} />
                <StatCard title="Affordable Housing" value={stats.totalHousing} color="text-violet-600" bgColor="bg-violet-50" icon={<Database size={16}/>} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-8 overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold text-slate-800">Recent Onboarding</h3>
                    <button onClick={() => setActiveTab('employees')} className="text-blue-600 text-sm font-bold hover:underline">View All</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase font-black tracking-widest">
                          <th className="pb-4 font-black">Staff Member</th>
                          <th className="pb-4 font-black">Remuneration</th>
                          <th className="pb-4 font-black">Status</th>
                          <th className="pb-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.slice(0, 5).map(emp => (
                          <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors group">
                            <td className="py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                  {emp.firstName[0]}{emp.lastName[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-700">{emp.firstName} {emp.lastName}</div>
                                  <div className="text-xs text-slate-400">PIN: {emp.kraPin}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 text-slate-600 font-bold">KES {emp.basicSalary.toLocaleString()}</td>
                            <td className="py-5">
                              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">Verified</span>
                            </td>
                            <td className="py-5 text-right">
                              <button onClick={() => { setSelectedEmployee(emp); setActiveTab('employees'); }} className="text-slate-300 hover:text-blue-600 transition-colors">
                                <ChevronRight size={20} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {employees.length === 0 && !isLoading && (
                          <tr><td colSpan={4} className="py-12 text-center text-slate-400 italic font-medium">No personnel records found in the current ledger.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                   <div className="relative z-10">
                    <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                      <BrainCircuit className="text-blue-200" size={28} />
                    </div>
                    <h3 className="text-2xl font-black mb-4 leading-tight">AI Compliance Assistant</h3>
                    <p className="text-blue-100 text-sm mb-8 leading-relaxed font-medium opacity-90">
                      Our Gemini-driven engine parses Kenyan tax statutes (2024 updates) to explain complex deductions in plain English.
                    </p>
                    <button 
                      onClick={() => setActiveTab('employees')}
                      className="w-full bg-white text-blue-900 py-4 rounded-2xl font-black hover:bg-blue-50 transition-all shadow-lg text-sm uppercase tracking-widest"
                    >
                      Audit Personnel
                    </button>
                   </div>
                   {/* Decorative SVG elements */}
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Personnel Roster</h2>
                <button 
                  onClick={() => setShowAddEmployee(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all font-bold"
                >
                  <Plus size={20} /> Onboard Personnel
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 focus-within:ring-4 ring-blue-500/10 transition-all">
                    <div className="p-3"><Search className="text-slate-400" size={20} /></div>
                    <input type="text" placeholder="Search by name, PIN or Email..." className="bg-transparent border-none focus:outline-none w-full text-slate-700 font-medium" />
                  </div>
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                            <th className="py-4 px-6">Personnel</th>
                            <th className="py-4 px-6">Remuneration Details</th>
                            <th className="py-4 px-6">Database Status</th>
                            <th className="py-4 px-6"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {employees.map(emp => (
                            <tr key={emp.id} className={`border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-all group cursor-pointer ${selectedEmployee?.id === emp.id ? 'bg-blue-50/50' : ''}`} onClick={() => setSelectedEmployee(emp)}>
                              <td className="py-5 px-6">
                                <div className="font-bold text-slate-800">{emp.firstName} {emp.lastName}</div>
                                <div className="text-xs text-slate-400 font-medium">{emp.email}</div>
                              </td>
                              <td className="py-5 px-6">
                                <div className="text-sm font-bold text-slate-600">KES {emp.basicSalary.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">PIN: {emp.kraPin}</div>
                              </td>
                              <td className="py-5 px-6">
                                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 flex items-center gap-1.5 w-fit">
                                  <Database size={10} /> {dbStatus === 'online' ? 'Cloud Sync' : 'Local Host'}
                                </span>
                              </td>
                              <td className="py-5 px-6 text-right">
                                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {selectedEmployee ? (
                    <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="bg-slate-900 p-8 text-white relative">
                        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl font-black mb-6 shadow-xl shadow-blue-500/30">
                          {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Personnel ID: {selectedEmployee.id}</p>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                      </div>
                      <div className="p-8 space-y-6">
                        <DetailRow label="Monthly Base" value={`KES ${selectedEmployee.basicSalary.toLocaleString()}`} />
                        <DetailRow label="KRA Identity" value={selectedEmployee.kraPin} />
                        <DetailRow label="NSSF Reference" value={selectedEmployee.nssfNumber} />
                        <DetailRow label="SHA/Health Ref" value={selectedEmployee.nhifNumber} />
                        
                        <div className="pt-6 border-t border-slate-100">
                          <button 
                            onClick={() => getAiTaxAdvice(selectedEmployee)}
                            disabled={loadingAi}
                            className="w-full flex items-center justify-center gap-3 bg-blue-50 text-blue-700 py-4 rounded-2xl font-black hover:bg-blue-100 transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                          >
                            <BrainCircuit size={18} /> {loadingAi ? 'Synthesizing...' : 'Deduction Audit'}
                          </button>
                        </div>

                        {aiInsight && (
                          <div className="mt-4 p-5 bg-slate-900 rounded-2xl text-xs text-slate-300 animate-in fade-in zoom-in-95 leading-relaxed font-medium">
                            <h4 className="font-black text-blue-400 mb-3 flex items-center gap-2 uppercase tracking-widest text-[10px]">
                               <BrainCircuit size={14} /> Intelligence Brief
                            </h4>
                            {aiInsight}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-100 border-4 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                        <Users size={32} />
                      </div>
                      <p className="text-slate-400 font-bold max-w-[200px]">Select a staff member to view full intelligence profile.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="max-w-4xl mx-auto space-y-10 animate-in zoom-in-95 duration-500">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-12 text-center space-y-8">
                <div className="w-24 h-24 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto shadow-inner">
                  <Receipt size={48} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Execute Monthly Ledger</h2>
                  <p className="text-slate-500 font-medium text-lg mt-2">Committing payroll for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex justify-center gap-16 py-8 border-y border-slate-100">
                  <div className="text-center">
                    <div className="text-slate-400 text-[11px] uppercase font-black tracking-widest mb-2">Personnel Count</div>
                    <div className="text-4xl font-black text-slate-800">{employees.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-400 text-[11px] uppercase font-black tracking-widest mb-2">Estimated Payout</div>
                    <div className="text-4xl font-black text-slate-800">KES {(employees.reduce((a, b) => a + b.basicSalary, 0)).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-4 justify-center">
                   <button 
                    onClick={runPayroll}
                    className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 transition-all transform active:scale-95 uppercase tracking-widest"
                   >
                     Process & Commit to DB
                   </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-xl font-black mb-6 text-slate-800">Archive Log</h3>
                <div className="space-y-4">
                  {payrollHistory.slice(0, 10).map(run => {
                    const emp = employees.find(e => e.id === run.employeeId);
                    return (
                      <div key={run.id} className="flex items-center justify-between p-5 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black">
                            {(run.month || 0) + 1}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{emp?.firstName || 'Syncing...'} {emp?.lastName || ''}</div>
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Verified: {new Date(run.processedAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Net Remittance</div>
                          <div className="font-black text-slate-700 text-lg">KES {run.netSalary.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Compliance & Reporting</h2>
                <div className="flex gap-3">
                  <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all font-bold">
                    <Printer size={18} /> Export Documents
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Receipt size={20}/></div>
                    <h3 className="text-xl font-bold text-slate-800">Individual Payslip</h3>
                  </div>
                  <div className="space-y-6">
                    <select 
                      className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                      onChange={(e) => {
                        const emp = employees.find(emp => emp.id === e.target.value);
                        if (emp) setSelectedEmployee(emp);
                      }}
                      value={selectedEmployee?.id || ""}
                    >
                      <option value="" disabled>Select Staff Member</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                    </select>
                    
                    {selectedEmployee && (
                      <div className="border border-slate-100 rounded-3xl p-6 bg-slate-50/50 scale-90 origin-top shadow-inner">
                         <Payslip 
                           employee={selectedEmployee} 
                           record={{
                             ...calculatePayroll(selectedEmployee.basicSalary, selectedEmployee.benefits),
                             id: 'STUB-' + selectedEmployee.id.substring(0,4),
                             employeeId: selectedEmployee.id,
                             month: new Date().getMonth(),
                             year: new Date().getFullYear(),
                             processedAt: new Date().toISOString()
                           } as PayrollRecord} 
                         />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><FileText size={20}/></div>
                    <h3 className="text-xl font-bold text-slate-800">Annual P9 Summary</h3>
                  </div>
                  {selectedEmployee ? (
                     <div className="space-y-4">
                        <div className="border border-slate-100 rounded-3xl p-6 overflow-hidden h-[500px] hover:overflow-y-auto transition-all shadow-inner">
                           <P9Form employee={selectedEmployee} records={payrollHistory.filter(r => r.employeeId === selectedEmployee.id)} />
                        </div>
                     </div>
                  ) : (
                    <div className="h-[500px] border-4 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-400 font-bold p-10 text-center">
                      Select personnel to generate annual tax card (P9).
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal: New Staff Onboarding */}
        {showAddEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative">
                <div>
                  <h3 className="text-3xl font-black tracking-tight">Personnel Onboarding</h3>
                  <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[11px]">System Entry Form</p>
                </div>
                <button onClick={() => setShowAddEmployee(false)} className="text-slate-400 hover:text-white text-4xl leading-none">&times;</button>
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
              </div>
              <form onSubmit={handleAddEmployee} className="p-10 grid grid-cols-2 gap-8 bg-white">
                <FormField label="First Name" name="firstName" required />
                <FormField label="Last Name" name="lastName" required />
                <FormField label="Work Email" name="email" type="email" />
                <FormField label="KRA Identity (PIN)" name="kraPin" required placeholder="A000000000X" />
                <FormField label="NSSF Reference" name="nssfNumber" required />
                <FormField label="SHA/Health Reference" name="nhifNumber" required />
                <div className="col-span-2 grid grid-cols-2 gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <FormField label="Monthly Base Base" name="basicSalary" type="number" required />
                  <FormField label="Recurring Allowances" name="benefits" type="number" />
                </div>
                
                <div className="col-span-2 flex justify-end gap-4 mt-4 pt-8 border-t border-slate-100">
                   <button type="button" onClick={() => setShowAddEmployee(false)} className="px-8 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                   <button type="submit" className="px-8 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all uppercase tracking-widest text-sm">Commit to Ledger</button>
                </div>
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
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm tracking-tight ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-1' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
  >
    {icon} {label}
  </button>
);

const StatCard = ({ title, value, color, bgColor, icon }: any) => (
  <div className={`p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 ${bgColor}`}>
    <div className="flex items-center justify-between mb-4">
      <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</div>
      <div className={`p-1.5 rounded-lg bg-white/50 ${color}`}>{icon}</div>
    </div>
    <div className={`text-3xl font-black ${color}`}>KES {Number(value || 0).toLocaleString()}</div>
    <div className="text-[10px] text-slate-400 mt-2 font-bold opacity-70">Current Month Liability</div>
  </div>
);

const DetailRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center text-sm py-3 border-b border-slate-50 last:border-0">
    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{label}</span>
    <span className="font-bold text-slate-800">{value}</span>
  </div>
);

const FormField = ({ label, name, type = "text", required = false, placeholder = "" }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type={type} 
      name={name} 
      required={required}
      placeholder={placeholder}
      className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 bg-slate-50 focus:bg-white focus:ring-4 ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700" 
    />
  </div>
);

export default App;
