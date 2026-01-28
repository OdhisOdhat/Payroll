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
  Menu,
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
  FileText as FileIcon,
  Zap,
  ChevronLast,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx'; // ← Added for .xls / .xlsx support

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoUploadRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null); // ← NEW

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

  // Logo update state
  const [logoUrlInput, setLogoUrlInput] = useState('');

  // Close mobile menu on tab change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Apply dynamic theme color
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', brandSettings.primaryColor);
    document.documentElement.style.setProperty('--primary-color-light', `${brandSettings.primaryColor}20`);
    setLogoUrlInput(brandSettings.logoUrl);
  }, [brandSettings.primaryColor, brandSettings.logoUrl]);

  // Load data from Hybrid API Service
  useEffect(() => {
    if (!user) {
      setIsInitializing(false);
      return;
    }
    
    const skipTimer = setTimeout(() => setShowSkipButton(true), 2500);
    const hardLimitTimer = setTimeout(() => setIsInitializing(false), 6000);
    
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
        if (brandData) setBrandSettings(brandData as BrandSettings);
        
        if (user.role === 'staff' && user.employeeId) {
          const self = (Array.isArray(empData) ? empData : []).find(e => e.id === user.employeeId);
          if (self) setSelectedEmployee(self);
        }
      } catch (error) {
        console.error("Critical Data Load Error:", error);
        setDbStatus('error');
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
    setShowSkipButton(false);
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedBrand: BrandSettings = {
      entityName: formData.get('entityName') as string,
      logoUrl: logoUrlInput,
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

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrlInput(base64);
    };
    reader.readAsDataURL(file);
  };

  const accessibleEmployees = useMemo(() => {
    let filtered = employees.filter(e => e.isActive !== false);
    if (user?.role === 'admin' || user?.role === 'tax' || user?.role === 'manager') return filtered;
    return filtered.filter(e => e.id === user?.employeeId);
  }, [employees, user]);

  const filteredEmployeesList = useMemo(() => {
    if (!employeeSearchQuery) return accessibleEmployees;
    const term = employeeSearchQuery.toLowerCase();
    return accessibleEmployees.filter(emp => 
      emp.firstName.toLowerCase().includes(term) ||
      emp.lastName.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term) ||
      emp.kraPin.toLowerCase().includes(term) ||
      emp.payrollNumber.toLowerCase().includes(term)
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
      totalGross: currentMonthPayroll.reduce((acc, curr) => acc + (curr.grossSalary as number), 0),
      totalNet: currentMonthPayroll.reduce((acc, curr) => acc + (curr.netSalary as number), 0),
      totalPaye: currentMonthPayroll.reduce((acc, curr) => acc + (curr.paye as number), 0),
      totalNssf: currentMonthPayroll.reduce((acc, curr) => acc + (curr.nssf as number), 0),
      totalSha: currentMonthPayroll.reduce((acc, curr) => acc + (curr.sha as number), 0),
      totalHousing: currentMonthPayroll.reduce((acc, curr) => acc + (curr.housingLevy as number), 0),
    };
  }, [accessiblePayroll]);

  const filteredPayroll = useMemo(() => {
    let result = [...accessiblePayroll];
    if (payrollMonthFilter !== 'all') result = result.filter(r => r.month === parseInt(payrollMonthFilter));
    if (payrollYearFilter !== 'all') result = result.filter(r => r.year === parseInt(payrollYearFilter));
    if (payrollEmployeeFilter !== 'all') result = result.filter(r => r.employeeId === payrollEmployeeFilter);
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

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this employee from the system? This action is irreversible.')) return;
    
    setIsLoading(true);
    try {
      await apiService.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      if (selectedEmployee?.id === id) {
        setSelectedEmployee(null);
        setShowDetailModal(false);
      }
      if (user) {
        await apiService.saveAuditLog({
          id: Math.random().toString(36).substr(2, 9),
          performedBy: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          action: 'Employee Removed',
          details: `Employee ID ${id} was permanently removed from the ledger.`,
          timestamp: new Date().toISOString()
        });
      }
      alert('Employee successfully removed.');
    } catch (error) {
      alert('Failed to remove employee.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminateEmployee = async (employeeId: string) => {
    if (!window.confirm('Terminate this employee? This will deactivate their record but preserve history.')) return;

    const reason = window.prompt('Enter termination reason (optional):') || null;

    setIsLoading(true);
    try {
      await apiService.terminateEmployee(employeeId, reason);

      setEmployees(prev => prev.map(e => 
        e.id === employeeId 
          ? { ...e, isActive: false, terminatedAt: new Date().toISOString(), terminationReason: reason }
          : e
      ));

      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee(prev => prev ? { ...prev, isActive: false, terminatedAt: new Date().toISOString(), terminationReason: reason } : null);
      }

      if (user) {
        await apiService.saveAuditLog({
          id: Math.random().toString(36).substr(2, 9),
          performedBy: `${user.firstName} ${user.lastName}`,
          userRole: user.role,
          action: 'Employee Terminated',
          details: `Employee ID ${employeeId} terminated. Reason: ${reason || 'Not specified'}.`,
          timestamp: new Date().toISOString()
        });
      }

      alert('Employee terminated successfully.');
    } catch (err: any) {
      alert(`Failed to terminate employee: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRequestSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !user.employeeId) return;
    const formData = new FormData(e.currentTarget);
    const request: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      reason: formData.get('reason') as string,
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
      setIsLoading(false);
    }
  };

  const handleLeaveStatusUpdate = async (id: string, status: 'approved' | 'rejected', employeeId: string, startDate: string, endDate: string) => {
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    try {
      setIsLoading(true);
      await apiService.updateLeaveStatus(id, status, employeeId, diffDays);
      setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      if (status === 'approved') {
        setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, remainingLeaveDays: e.remainingLeaveDays - diffDays } : e));
      }
      await apiService.saveAuditLog({
        id: Math.random().toString(36).substr(2, 9),
        performedBy: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: `Leave ${status.toUpperCase()}`,
        details: `${status.charAt(0).toUpperCase() + status.slice(1)} leave for ${employeeId}.`,
        timestamp: new Date().toISOString()
      });
      alert(`Leave request ${status}.`);
    } catch (error) {
      alert("Failed to update leave request.");
    } finally {
      setIsLoading(false);
    }
  };

  const processPayrollRun = async () => {
    if (!user) return;
    setIsLoading(true);
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthName = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][month];
    
    const runRef = `PAY-${monthName}-${year}-${brandSettings.entityName.substring(0, 3).toUpperCase()}`;

    const newRecords: PayrollRecord[] = accessibleEmployees.map(emp => ({
      ...calculatePayroll(emp.basicSalary, emp.benefits),
      id: Math.random().toString(36).substr(2, 9),
      employeeId: emp.id,
      payrollRef: runRef,
      month,
      year,
      processedAt: now.toISOString()
    }));
    try {
      await apiService.savePayrollRun(newRecords);
      setPayrollHistory(prev => [...newRecords, ...prev]);
      alert(`Processed ${newRecords.length} records. Batch Ref: ${runRef}`);
    } catch (err) { alert("Error."); } finally { setIsLoading(false); }
  };

  const handleExportEmployees = () => downloadCSV(accessibleEmployees, `Employees_${new Date().toISOString()}.csv`);
  const handleExportPayroll = () => downloadCSV(filteredPayroll, `Payroll_${new Date().toISOString()}.csv`);
  const handleImportCSVClick = () => fileInputRef.current?.click();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const importedData = parseEmployeeCSV(e.target?.result as string);
      if (importedData.length === 0) return alert("No valid data.");
      setIsLoading(true);
      for (const entry of importedData) {
        try { await apiService.saveEmployee(entry as Employee); } catch (err) {}
      }
      setIsLoading(false);
      setEmployees(await apiService.getEmployees());
    };
    reader.readAsText(file);
  };

  // ────────────────────────────────────────────────
  // Excel (.xls / .xlsx) import handler – improved with debug + new array ref
  // ────────────────────────────────────────────────
  const handleExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("No data");

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length < 2) {
          alert("Excel file has no data rows.");
          return;
        }

        const headers = (json[0] as string[]).map(h => 
          h?.toString().trim().toLowerCase().replace(/\s+/g, '') || ''
        );

        const rows = json.slice(1);

        const imported: Partial<Employee>[] = rows.map((row: any[]) => {
          const obj: Record<string, any> = {};
          headers.forEach((key, i) => { if (key) obj[key] = row[i]; });

          return {
            payrollNumber: obj.payrollnumber || obj.payrollno || obj.id || obj.staffid || obj['payroll number'] || '',
            firstName: obj.firstname || obj['first name'] || obj['firstname'] || '',
            lastName: obj.lastname || obj['last name'] || obj['lastname'] || '',
            email: obj.email || obj['email address'] || obj.emailaddress || '',
            kraPin: obj.krapin || obj['kra pin'] || obj.pin || obj.kra || obj['tax pin'] || '',
            nssfNumber: obj.nssf || obj.nssfnumber || obj['nssf number'] || '',
            nhifNumber: obj.nhif || obj.sha || obj['sha number'] || obj.nhifnumber || obj['health number'] || '',
            basicSalary: Number(obj.basicsalary || obj['basic salary'] || obj.salary || obj.basicsal || 0),
            benefits: Number(obj.benefits || obj.allowances || obj['other benefits'] || obj.benefit || 0),
            totalLeaveDays: Number(obj.totalleavedays || obj['total leave'] || obj.leavedays || obj['leave days'] || 21),
            remainingLeaveDays: Number(obj.remainingleavedays || obj['remaining leave'] || obj.leavebalance || obj['leave balance'] || 21),
            joinedDate: obj.joineddate || obj['date joined'] || obj.hiredate || obj['join date'] || new Date().toISOString(),
          };
        }).filter(e => {
          const payroll = String(e.payrollNumber || '').trim();
          return Boolean(e.firstName?.trim()) && Boolean(e.lastName?.trim()) && payroll !== '';
        });

        if (imported.length === 0) {
          alert(
            "No valid employee records found.\n\n" +
            "The file was read successfully, but no rows had all three required fields:\n" +
            "• First Name (or similar column)\n" +
            "• Last Name (or similar)\n" +
            "• Payroll Number / Staff ID (or similar)\n\n" +
            "Please check your column headers and make sure these fields exist and are filled."
          );
          return;
        }

        // Debug: show first imported record
        console.debug("[Excel Import] First parsed record:", imported[0]);

        let successCount = 0;
        for (const data of imported) {
          try {
            const emp: Employee = {
              ...data as Employee,
              id: Math.random().toString(36).substr(2, 9),
              isActive: true,
            };
            await apiService.saveEmployee(emp);
            successCount++;
          } catch (err) {
            console.warn("One employee failed:", err);
          }
        }

        const freshEmployees = await apiService.getEmployees();
        console.debug("[Excel Import] Fresh employees after save:", {
          count: freshEmployees?.length || 0,
          sample: freshEmployees?.slice(0, 2) || []
        });

        // Use spread to force new array reference → breaks memo equality
        setEmployees([...(freshEmployees || [])]);

        alert(
          `Successfully imported ${successCount} of ${imported.length} employees from Excel file.\n\n` +
          `If new employees don't appear in the table, check the browser console (F12) for debug output.\n` +
          `Try refreshing the page (F5) if needed.`
        );
      } catch (err) {
        console.error("Excel import error:", err);
        alert("Failed to read Excel file. Please ensure it's a valid .xls or .xlsx file.");
      } finally {
        setIsLoading(false);
        if (excelInputRef.current) excelInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // ────────────────────────────────────────────────
  // Popup-based print handler (unchanged)
  // ────────────────────────────────────────────────
  const handlePrintToPDF = () => {
    if (!selectedEmployee) {
      alert("Please select an employee first to generate the document.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocked. Please allow popups for this site and try again.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Payslip & P9 - ${selectedEmployee.firstName} ${selectedEmployee.lastName}</title>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: Arial, Helvetica, sans-serif; 
            background: white; 
            color: black; 
          }
          .print-content { 
            width: 100%; 
            max-width: 210mm; 
            margin: 0 auto; 
          }
          @media print {
            body { padding: 0; margin: 0; }
            .print-content { width: 210mm; margin: 0; }
            @page { size: A4 portrait; margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="print-content">
          <!-- Content injected here -->
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1200); // Give time for content to render
          };
        </script>
      </body>
      </html>
    `);

    const contentElement = document.querySelector('.print-content');
    if (contentElement) {
      const cloned = contentElement.cloneNode(true) as HTMLElement;
      cloned.querySelectorAll('button, select, input, .no-print').forEach(el => el.remove());
      printWindow.document.querySelector('.print-content')?.appendChild(cloned);
    } else {
      printWindow.document.body.innerHTML += '<h2 style="text-align:center; color:red; margin-top:50px;">Error: Printable content not found</h2>';
    }

    printWindow.document.close();
  };

  const Sidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`h-full flex flex-col ${isMobile ? 'bg-slate-900 w-full' : 'bg-slate-900 w-64'}`}>
      <div className="p-8">
        <h1 className="text-xl font-bold flex items-center gap-3 tracking-tight text-white">
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
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <>
            <NavItem icon={<Users size={20}/>} label="Personnel" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
            <NavItem icon={<Receipt size={20}/>} label="Monthly Run" active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} />
          </>
        )}
        <NavItem icon={<PlaneTakeoff size={20}/>} label="Leave Requests" active={activeTab === 'leave'} onClick={() => setActiveTab('leave')} />
        {(user?.role === 'admin' || user?.role === 'tax' || user?.role === 'manager') && (
          <NavItem icon={<FileText size={20}/>} label={user?.role === 'admin' || user?.role === 'manager' ? "Reports & Compliance" : "Compliance Hub"} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
        )}
        {user?.role === 'admin' && (
          <NavItem icon={<Settings size={20}/>} label="Branding" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        )}
        {user?.role === 'staff' && <NavItem icon={<FileText size={20}/>} label="Documents" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />}
      </nav>
      <div className="px-6 py-6 border-t border-slate-800 bg-slate-950/20 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0"><UserIcon size={20} /></div>
          <div className="overflow-hidden">
            <div className="text-sm font-black truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-[10px] custom-theme-text font-black uppercase tracking-widest">{user?.role}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-400 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"><LogOut size={14} /> Log Out</button>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500/30">
        <style>{`:root { --primary-color: ${brandSettings.primaryColor}; } .custom-theme-bg { background-color: var(--primary-color); }`}</style>
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl custom-theme-bg shadow-2xl mb-6">
              {brandSettings.logoUrl ? <img src={brandSettings.logoUrl} className="w-10 h-10 object-contain" /> : <Receipt className="text-white" size={32} />}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{brandSettings.entityName}</h1>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-6 md:p-10 rounded-[30px] md:rounded-[40px] shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Mail size={18} /></div>
                  <input name="email" type="email" required placeholder="admin@payrollpro.com" className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 transition-all font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Token</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Lock size={18} /></div>
                  <input name="password" type="password" required placeholder="password123" className="w-full bg-slate-950/50 border-2 border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 transition-all font-bold" />
                </div>
              </div>
              {authError && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">{authError}</div>}
              <button type="submit" disabled={isLoggingIn} className="w-full custom-theme-bg hover:opacity-90 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />} Authorize
              </button>
            </form>
          </div>
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

        @media print {
          body > *:not(.print-content) { display: none !important; }
          .print-content, .print-content * {
            visibility: visible !important;
            display: block !important;
            position: static !important;
            transform: none !important;
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 8px 0 !important;
            box-sizing: border-box;
          }
          .no-print { display: none !important; }
          header, aside, nav, footer, button, select { display: none !important; }
          .overflow-x-auto, .overflow-hidden { overflow: visible !important; }
          .min-w-[400px], .min-w-[600px] { min-width: 100% !important; width: auto !important; }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}</style>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
      <input type="file" ref={excelInputRef} onChange={handleExcelImport} accept=".xls,.xlsx" className="hidden" />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[1000] lg:hidden animate-in fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar isMobile />
            <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-6 right-[-50px] p-2 text-white bg-slate-900 rounded-full shadow-xl"><X size={24}/></button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col no-print shrink-0 shadow-2xl bg-slate-900">
        <Sidebar />
      </aside>

      <main className="flex-1 overflow-y-auto relative flex flex-col h-full">
        {/* Top Navbar for Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-[100] no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-50 rounded-xl text-slate-600 active:bg-slate-100 transition-all"><Menu size={24} /></button>
            <div className="font-black text-slate-800 tracking-tight text-sm truncate max-w-[150px]">{brandSettings.entityName}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1 border ${dbStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              <Zap size={8} className={dbStatus === 'online' ? 'fill-emerald-600' : ''} /> {dbStatus === 'online' ? 'Online' : 'Local'}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-10 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                  <h2 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{(user.role !== 'staff') ? 'Organization Pulse' : `Hello, ${user.firstName}`}</h2>
                  <p className="text-slate-500 text-sm md:text-lg mt-1">{(user.role !== 'staff') ? 'Payroll and compliance monitoring.' : 'Personal earnings summary.'}</p>
                </div>
                {user.role !== 'staff' && (
                  <div className="bg-white px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-blue-50 p-2 md:p-3 rounded-xl font-black text-blue-600 text-xs md:text-base">KES</div>
                    <div><div className="text-[8px] md:text-[10px] text-slate-400 uppercase font-black">Gross Liability</div><div className="text-lg md:text-2xl font-black text-slate-800">{stats.totalGross.toLocaleString()}</div></div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Income Tax (PAYE)" value={stats.totalPaye} color="text-red-600" bgColor="bg-red-50" icon={<Scale size={16}/>} />
                <StatCard title="NSSF (Security)" value={stats.totalNssf} color="custom-theme-text" bgColor="bg-blue-50" icon={<ShieldCheck size={16}/>} />
                <StatCard title="SHA (Health)" value={stats.totalSha} color="text-emerald-600" bgColor="bg-emerald-50" icon={<Activity size={16}/>} />
                <StatCard title="Housing Levy" value={stats.totalHousing} color="text-violet-600" bgColor="bg-violet-50" icon={<Building2 size={16}/>} />
              </div>

              {(user.role !== 'staff') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                   <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-6 md:mb-8">
                         <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-2"><History className="custom-theme-text" /> Audit Ledger</h3>
                         <button onClick={() => apiService.getAuditLogs().then(setAuditLogs)} className="text-[10px] font-black uppercase custom-theme-text bg-blue-50 px-3 py-2 rounded-lg">Refresh</button>
                      </div>
                      <div className="space-y-4">
                         {auditLogs.length > 0 ? auditLogs.slice(0, 5).map(log => (
                           <div key={log.id} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-50 hover:bg-slate-50 transition-all">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0"><Activity size={16} /></div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start mb-1">
                                    <div className="font-bold text-xs md:text-sm text-slate-800 truncate pr-2">{log.action}</div>
                                    <div className="text-[8px] md:text-[10px] text-slate-400 font-bold shrink-0">{new Date(log.timestamp).toLocaleDateString()}</div>
                                 </div>
                                 <div className="text-[10px] md:text-xs text-slate-500 font-medium mb-1 line-clamp-1">{log.details}</div>
                              </div>
                           </div>
                         )) : <div className="py-12 text-center text-slate-400 font-bold italic">No records.</div>}
                      </div>
                   </div>
                   <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl hidden md:block">
                      <div className="absolute top-0 right-0 p-10 opacity-10 custom-theme-text"><ShieldCheck size={180} /></div>
                      <h3 className="text-xl font-bold mb-4 relative">Security</h3>
                      <p className="text-slate-300 text-sm font-medium mb-8 relative leading-relaxed">Encrypted audit trails and tiered RBAC systems ensure data integrity.</p>
                      <div className="space-y-4 relative">
                         {['Sync Active', 'Audit Encrypted', 'SHA Validated'].map(item => (
                           <div key={item} className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"></div>
                              <div className="text-[10px] font-black uppercase tracking-widest">{item}</div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leave' && (
            <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3"><PlaneTakeoff className="custom-theme-text" /> Leave Management</h2>
                {user.role === 'staff' && (
                  <button onClick={() => setShowLeaveRequestModal(true)} className="custom-theme-bg text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 shadow-xl font-bold w-full md:w-auto">
                    <Plus size={20} /> Request Leave
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                <div className="lg:col-span-2 bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">
                      {user.role === 'staff' ? 'My Requests' : 'All Leave Requests'}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black">
                          <th className="py-4 px-6">Personnel</th>
                          <th className="py-4 px-6">Period</th>
                          <th className="py-4 px-6">Status</th>
                          {(user.role === 'admin' || user.role === 'manager') && <th className="py-4 px-6">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.length > 0 ? leaveRequests.map(req => (
                          <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all">
                            <td className="py-5 px-6">
                              <div className="font-bold text-slate-800 text-sm">{req.firstName} {req.lastName}</div>
                              <div className="text-[9px] text-slate-400 font-bold">ID: #{req.employeeId}</div>
                            </td>
                            <td className="py-5 px-6">
                              <div className="text-xs font-bold text-slate-600">
                                {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-5 px-6">
                              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                                req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            {(user.role === 'admin' || user.role === 'manager') && (
                              <td className="py-5 px-6">
                                {req.status === 'pending' ? (
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleLeaveStatusUpdate(req.id, 'approved', req.employeeId, req.startDate, req.endDate)} 
                                      className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                                    >
                                      <ThumbsUp size={14}/>
                                    </button>
                                    <button 
                                      onClick={() => handleLeaveStatusUpdate(req.id, 'rejected', req.employeeId, req.startDate, req.endDate)} 
                                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                    >
                                      <ThumbsDown size={14}/>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-300 italic">Closed</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={(user.role === 'admin' || user.role === 'manager') ? 4 : 3} className="py-12 text-center text-slate-400 italic">
                              No leave requests found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
                    <PlaneTakeoff size={140} className="absolute top-0 right-0 opacity-10" />
                    <h3 className="text-lg font-bold mb-4 relative">Entitlement</h3>
                    {user.role === 'staff' && selectedEmployee ? (
                      <div className="relative space-y-4">
                        <div className="text-[10px] text-slate-400 font-black uppercase">Remaining Balance</div>
                        <div className="text-4xl md:text-5xl font-black">{selectedEmployee.remainingLeaveDays} <span className="text-sm text-slate-500 uppercase">Days</span></div>
                      </div>
                    ) : (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10 relative text-center">
                        <div className="text-[10px] text-slate-400 font-black uppercase mb-2">Pending Approvals</div>
                        <div className="text-3xl font-black">{leaveRequests.filter(r => r.status === 'pending').length}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'employees' && (user?.role === 'admin' || user?.role === 'manager') && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 duration-500">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800">Personnel Roster</h2>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 md:gap-4">
                  <button onClick={handleImportCSVClick} className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"><Upload size={16} /> Import CSV</button>
                  
                  <button 
                    onClick={() => excelInputRef.current?.click()} 
                    className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    <Upload size={16} /> Import Excel (.xls/.xlsx)
                  </button>

                  <button onClick={handleExportEmployees} className="bg-white border border-slate-200 text-slate-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"><Download size={16} /> Export</button>
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <button onClick={() => { setEditingEmployee(null); setShowAddEmployee(true); }} className="custom-theme-bg text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl font-bold col-span-2 text-xs">
                      <Plus size={18} /> Onboard Personnel
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                  <div className="p-2"><Search className="text-slate-400" size={18} /></div>
                  <input type="text" placeholder="Search by name, PIN or Payroll No..." className="bg-transparent border-none focus:outline-none w-full text-sm font-medium" value={employeeSearchQuery} onChange={(e) => setEmployeeSearchQuery(e.target.value)} />
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black">
                          <th className="py-4 px-6">Payroll No.</th>
                          <th className="py-4 px-6">Personnel</th>
                          <th className="py-4 px-6">Identity (KRA)</th>
                          <th className="py-4 px-6">Gross Pay</th>
                          <th className="py-4 px-6">Leave</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployeesList.length > 0 ? filteredEmployeesList.map(emp => (
                          <tr key={emp.id} className="border-b border-slate-50 last:border-0 hover:bg-blue-50/30 transition-all cursor-pointer" onClick={() => { setSelectedEmployee(emp); setShowDetailModal(true); }}>
                            <td className="py-4 px-6 text-xs font-black custom-theme-text">{emp.payrollNumber}</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg custom-theme-bg flex items-center justify-center text-white text-xs font-bold shrink-0">{emp.firstName[0]}</div>
                                <div className="min-w-0"><div className="font-bold text-slate-800 text-xs truncate">{emp.firstName} {emp.lastName}</div><div className="text-[10px] text-slate-400 truncate">{emp.email}</div></div>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-xs font-bold text-slate-600">{emp.kraPin}</td>
                            <td className="py-4 px-6 text-xs font-bold text-slate-800">KES {(emp.basicSalary + (emp.benefits || 0)).toLocaleString()}</td>
                            <td className="py-4 px-6"><span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${emp.remainingLeaveDays < 5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{emp.remainingLeaveDays} Days</span></td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${emp.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {emp.isActive !== false ? 'Active' : 'Terminated'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <Eye size={16} className="text-slate-300" />
                                {(user.role === 'admin' || user.role === 'manager') && emp.isActive !== false && (
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleTerminateEmployee(emp.id); 
                                    }} 
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-700 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )) : <tr><td colSpan={7} className="py-20 text-center text-slate-400 italic">No records found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (user?.role === 'admin' || user?.role === 'manager') && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-slate-200 p-6 md:p-12 text-center space-y-6 md:space-y-8">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto shadow-inner"><Receipt size={32} /></div>
                <div><h2 className="text-xl md:text-2xl font-black text-slate-800">Execute Monthly Ledger</h2><p className="text-slate-500 text-sm md:text-base">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p></div>
                <button onClick={processPayrollRun} className="custom-theme-bg text-white px-8 py-4 md:px-12 md:py-5 rounded-2xl font-black text-sm md:text-lg shadow-2xl transition-all uppercase w-full md:w-auto">Process Payroll</button>
              </div>
              
              <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <h3 className="text-lg md:text-xl font-black text-slate-800">Payroll History</h3>
                  <div className="flex overflow-x-auto pb-2 w-full md:w-auto gap-2 scrollbar-hide">
                    <select value={payrollMonthFilter} onChange={(e) => setPayrollMonthFilter(e.target.value)} className="bg-slate-50 text-[10px] font-black uppercase p-2 rounded-lg border border-slate-100 min-w-[100px] shrink-0">
                      <option value="all">Months</option>{["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={payrollYearFilter} onChange={(e) => setPayrollYearFilter(e.target.value)} className="bg-slate-50 text-[10px] font-black uppercase p-2 rounded-lg border border-slate-100 min-w-[80px] shrink-0">
                      <option value="all">Years</option>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-black">
                        <th className="py-4 px-6">Batch Ref</th>
                        <th className="py-4 px-6">Personnel</th>
                        <th className="py-4 px-6 text-center">Period</th>
                        <th className="py-4 px-6 text-right">Net Payable</th>
                        <th className="py-4 px-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayroll.length > 0 ? filteredPayroll.map(record => {
                        const emp = employees.find(e => e.id === record.employeeId);
                        const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][record.month];
                        return (
                          <tr key={record.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all group">
                            <td className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter">{record.payrollRef}</td>
                            <td className="py-4 px-6 min-w-[150px]"><div className="font-bold text-slate-800 text-xs truncate">{emp ? `${emp.firstName} ${emp.lastName}` : 'System User'}</div></td>
                            <td className="py-4 px-6 text-center text-[10px] font-bold text-slate-600">{monthName} {record.year}</td>
                            <td className="py-4 px-6 text-right text-xs font-black custom-theme-text">KES {record.netSalary.toLocaleString()}</td>
                            <td className="py-4 px-6 text-right"><button onClick={() => { setSelectedEmployee(emp || null); setActiveTab('reports'); }} className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-all"><Eye size={14} /></button></td>
                          </tr>
                        );
                      }) : <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">No history found.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
              <style>{`
                @media print {
                  body > *:not(.print-content) { display: none !important; }
                  .print-content, .print-content * {
                    visibility: visible !important;
                    display: block !important;
                    position: static !important;
                    transform: none !important;
                    overflow: visible !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 8px 0 !important;
                    box-sizing: border-box;
                  }
                  .no-print { display: none !important; }
                  header, aside, nav, footer, button, select { display: none !important; }
                  .overflow-x-auto, .overflow-hidden { overflow: visible !important; }
                  .min-w-[400px], .min-w-[600px] { min-width: 100% !important; width: auto !important; }
                  @page {
                    size: A4 portrait;
                    margin: 1.5cm;
                  }
                }
              `}</style>

              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800">Compliance Center</h2>
                <div className="flex flex-wrap gap-2">
                  {(user.role === 'admin' || user.role === 'manager') && (
                    <button 
                      onClick={() => setShowShareModal(true)} 
                      disabled={!selectedEmployee} 
                      className="flex items-center justify-center gap-2 custom-theme-bg text-white px-4 py-3 rounded-xl font-bold shadow-xl disabled:opacity-50 text-xs no-print"
                    >
                      <Share2 size={16} /> Share
                    </button>
                  )}
                  <button 
                    onClick={handlePrintToPDF}
                    className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl font-bold shadow-xl text-xs no-print"
                  >
                    <Printer size={16} /> Export PDF
                  </button>
                </div>
              </div>

              <div className="print-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 print:grid-cols-1">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 print:shadow-none print:border-0">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 print:text-base">
                      <Receipt size={20} className="custom-theme-text" /> Payslip Viewer
                    </h3>
                    {user.role !== 'staff' && (
                      <select 
                        className="w-full border border-slate-200 rounded-xl p-3 mb-6 font-bold text-slate-700 text-xs no-print" 
                        onChange={(e) => { 
                          const emp = employees.find(emp => emp.id === e.target.value); 
                          if (emp) setSelectedEmployee(emp); 
                        }} 
                        value={selectedEmployee?.id || ""}
                      >
                        <option value="" disabled>Select Employee</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.payrollNumber})</option>)}
                      </select>
                    )}
                    {selectedEmployee ? (
                      <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-2 md:p-4 print:border-0 print:bg-white print:p-0">
                        <div className="w-full print:w-full">
                          <Payslip 
                            employee={selectedEmployee} 
                            record={latestSelectedEmployeeRecord || { 
                              ...calculatePayroll(selectedEmployee.basicSalary, selectedEmployee.benefits), 
                              id: 'STUB', 
                              employeeId: selectedEmployee.id, 
                              payrollRef: 'PREVIEW-STUB', 
                              month: new Date().getMonth(), 
                              year: new Date().getFullYear(), 
                              processedAt: new Date().toISOString() 
                            } as PayrollRecord} 
                            brand={brandSettings} 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center text-slate-400 text-xs italic print:py-10">
                        Select a member to view.
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 print:shadow-none print:border-0">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 print:text-base">
                      <FileText size={20} className="text-indigo-500" /> P9 Tax Summary
                    </h3>
                    {selectedEmployee ? (
                      <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-2 md:p-4 print:border-0 print:bg-white print:p-0">
                        <div className="w-full print:w-full">
                          <P9Form 
                            employee={selectedEmployee} 
                            records={accessiblePayroll.filter(r => r.employeeId === selectedEmployee.id)} 
                            brand={brandSettings} 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center text-slate-400 text-xs italic print:py-10">
                        Personnel selection required.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && user?.role === 'admin' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="mb-8"><h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3"><Palette className="custom-theme-text" /> Branding</h2></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl md:rounded-[40px] shadow-sm border border-slate-100 p-6 md:p-10 space-y-8">
                  <div className="space-y-6">
                    <FormField label="Legal Entity Name" name="entityName" required defaultValue={brandSettings.entityName} />
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo Identity</label>
                      <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-100 rounded-2xl">
                         <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                            {logoUrlInput ? <img src={logoUrlInput} className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-200" size={24} />}
                         </div>
                         <button type="button" onClick={() => logoUploadRef.current?.click()} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"><Upload size={14} /> Local File</button>
                         <input type="file" ref={logoUploadRef} onChange={handleLogoFileChange} accept="image/*" className="hidden" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Color</label><div className="flex gap-2 mt-2"><input name="primaryColor" type="color" defaultValue={brandSettings.primaryColor} className="h-12 w-12 p-1 rounded-xl bg-slate-50 border-2 border-slate-100 cursor-pointer" /><input type="text" value={brandSettings.primaryColor} readOnly className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 text-xs font-mono font-bold text-slate-400 uppercase" /></div></div>
                    </div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label><textarea name="address" rows={2} required defaultValue={brandSettings.address} className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-blue-500 resize-none text-sm" /></div>
                  </div>
                  <button type="submit" className="w-full custom-theme-bg text-white font-black py-4 md:py-5 rounded-2xl shadow-xl transition-all hover:opacity-90 uppercase tracking-widest text-xs md:text-sm">Deploy Brand</button>
                </form>
                <div className="hidden lg:block space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 ml-2">Live Preview</h3>
                  <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-2xl scale-95 origin-top p-6">
                    <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl custom-theme-bg flex items-center justify-center text-white">{logoUrlInput ? <img src={logoUrlInput} className="w-6 h-6 object-contain" /> : <Building2 size={20} />}</div><div className="font-black text-slate-800">{brandSettings.entityName}</div></div>
                    <div className="space-y-4"><div className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl"></div><div className="w-full h-24 border-4 border-dashed border-slate-100 rounded-3xl flex items-center justify-center text-[10px] font-black uppercase text-slate-300">Layout Block</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {showAddEmployee && (user?.role === 'admin' || user?.role === 'manager') && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
            <div className="bg-white rounded-t-[30px] md:rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 flex flex-col h-[95vh] md:max-h-[90vh]">
              <div className="bg-slate-900 p-6 md:p-10 text-white flex justify-between items-center relative shrink-0">
                <div><h3 className="text-xl md:text-3xl font-black">{editingEmployee ? 'Update Profile' : 'Onboard User'}</h3><p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[9px] md:text-[11px]">Secure System Entry</p></div>
                <button onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); }} className="text-slate-400 hover:text-white text-3xl">×</button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const totalLeave = parseInt(fd.get('totalLeaveDays') as string) || 21;
                const emp: Employee = {
                  id: editingEmployee ? editingEmployee.id : Math.random().toString(36).substr(2, 9),
                  payrollNumber: fd.get('payrollNumber') as string,
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
                  setIsLoading(true);
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
                } catch (err) { alert("Error."); } finally { setIsLoading(false); }
              }} className="p-5 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 bg-white overflow-y-auto flex-1">
                <div className="md:col-span-2">
                  <FormField label="Staff / Payroll Number" name="payrollNumber" required defaultValue={editingEmployee?.payrollNumber} placeholder="e.g. EMP-001" />
                </div>
                <FormField label="First Name" name="firstName" required defaultValue={editingEmployee?.firstName} />
                <FormField label="Last Name" name="lastName" required defaultValue={editingEmployee?.lastName} />
                <FormField label="Email" name="email" type="email" defaultValue={editingEmployee?.email} />
                <FormField label="KRA Tax PIN" name="kraPin" required defaultValue={editingEmployee?.kraPin} />
                <FormField label="NSSF Reference" name="nssfNumber" required defaultValue={editingEmployee?.nssfNumber} />
                <FormField label="SHA Identity" name="nhifNumber" required defaultValue={editingEmployee?.nhifNumber} />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
                  <FormField label="Monthly Base Salary" name="basicSalary" type="number" required defaultValue={editingEmployee?.basicSalary} />
                  <FormField label="Allowances" name="benefits" type="number" defaultValue={editingEmployee?.benefits} />
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 md:p-6 bg-blue-50 rounded-2xl md:rounded-3xl border border-blue-100">
                  <FormField label="Leave Entitlement" name="totalLeaveDays" type="number" defaultValue={editingEmployee?.totalLeaveDays || 21} />
                  <FormField label="Remaining" name="remainingLeaveDays" type="number" defaultValue={editingEmployee?.remainingLeaveDays || 21} />
                </div>
                <div className="md:col-span-2 flex flex-col md:flex-row justify-end gap-3 mt-4 pt-6 border-t border-slate-100">
                  <button type="button" onClick={() => { setShowAddEmployee(false); setEditingEmployee(null); }} className="w-full md:w-auto px-8 py-4 rounded-xl border-2 border-slate-100 font-bold text-slate-500 text-sm">Cancel</button>
                  <button type="submit" className="w-full md:w-auto px-8 py-4 rounded-xl custom-theme-bg text-white font-black shadow-xl uppercase tracking-widest text-xs">{editingEmployee ? 'Update Ledger' : 'Commit Entry'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetailModal && selectedEmployee && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1500] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
            <div className="bg-white rounded-t-[30px] md:rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 flex flex-col h-[95vh] md:max-h-[90vh]">
              <div className="bg-slate-900 p-6 md:p-8 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 md:w-16 md:h-16 custom-theme-bg rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-3xl font-black shrink-0">{selectedEmployee.firstName[0]}</div>
                   <div className="min-w-0">
                      <h3 className="text-lg md:text-2xl font-black truncate">{selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
                      <div className="text-slate-400 text-[10px] font-bold mt-1">Payroll No: {selectedEmployee.payrollNumber}</div>
                   </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 md:p-10 space-y-6 md:space-y-8 bg-slate-50/50">
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                   <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><UserIcon size={12}/> Personal</h4>
                      <div className="space-y-2 md:space-y-3">
                         <DetailRow label="Name" value={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`} />
                         <DetailRow label="Payroll Number" value={selectedEmployee.payrollNumber} />
                         <DetailRow label="KRA PIN" value={selectedEmployee.kraPin} />
                         <DetailRow label="Email" value={selectedEmployee.email} />
                      </div>
                   </div>
                   <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Briefcase size={12}/> Compensation</h4>
                      <div className="space-y-2 md:space-y-3">
                         <DetailRow label="Base" value={`KES ${selectedEmployee.basicSalary.toLocaleString()}`} />
                         <DetailRow label="Benefits" value={`KES ${(selectedEmployee.benefits || 0).toLocaleString()}`} />
                         <DetailRow label="NSSF" value={selectedEmployee.nssfNumber} />
                      </div>
                   </div>
                </section>
                <section className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><PlaneTakeoff size={12}/> Leave Balance</h4>
                   <div className="grid grid-cols-3 gap-2 md:gap-6">
                      <div className="text-center p-2 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl">
                         <div className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Total</div>
                         <div className="text-base md:text-2xl font-black text-slate-800">{selectedEmployee.totalLeaveDays}</div>
                      </div>
                      <div className="text-center p-2 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl">
                         <div className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Used</div>
                         <div className="text-base md:text-2xl font-black text-slate-800">{selectedEmployee.totalLeaveDays - selectedEmployee.remainingLeaveDays}</div>
                      </div>
                      <div className="text-center p-2 md:p-4 custom-theme-bg rounded-xl md:rounded-2xl text-white shadow-lg">
                         <div className="text-[7px] md:text-[9px] font-black opacity-70 uppercase mb-1">Net</div>
                         <div className="text-base md:text-2xl font-black">{selectedEmployee.remainingLeaveDays}</div>
                      </div>
                   </div>
                </section>
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><BrainCircuit size={14} className="custom-theme-text" /> AI Intelligence</h4>
                   <div className="grid grid-cols-3 gap-2">
                     <button onClick={() => getAiTaxAdvice(selectedEmployee)} disabled={loadingAi} className="bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-[8px] md:text-[10px] uppercase shadow-sm flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2">
                        {loadingAi ? <Loader2 className="animate-spin" size={12} /> : <Info size={12} />} <span>Analytic</span>
                     </button>
                     <button onClick={() => handleGetTaxOptimization(selectedEmployee)} disabled={loadingTaxAdvice} className="bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-[8px] md:text-[10px] uppercase shadow-sm flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2">
                        {loadingTaxAdvice ? <Loader2 className="animate-spin" size={12} /> : <Lightbulb size={12} />} <span>Savings</span>
                     </button>
                     <button 
                       onClick={() => handleGenerateP9Breakdown(selectedEmployee)} 
                       disabled={loadingP9Breakdown} 
                       className="custom-theme-bg text-white py-3 rounded-xl font-bold text-[8px] md:text-[10px] uppercase shadow-lg flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2"
                     >
                        {loadingP9Breakdown ? <Loader2 className="animate-spin" size={12} /> : <FileSearch size={12} />} <span>Tax Audit</span>
                     </button>
                   </div>
                   {(aiInsight || taxOptimizationAdvice || p9Breakdown) && (
                     <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                        {aiInsight && <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm text-[10px] md:text-xs text-slate-600 leading-relaxed italic">"{aiInsight}"</div>}
                        {taxOptimizationAdvice && <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl text-[10px] md:text-xs text-indigo-900 leading-relaxed whitespace-pre-wrap">{taxOptimizationAdvice}</div>}
                        {p9Breakdown && <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-[10px] md:text-[11px] text-emerald-900 leading-relaxed whitespace-pre-wrap font-mono">{p9Breakdown}</div>}
                     </div>
                   )}
                </section>
              </div>
              <div className="p-4 md:p-8 border-t border-slate-100 bg-white grid grid-cols-2 md:flex gap-3 md:gap-4 shrink-0">
                <button onClick={() => { setShowPayslipModal(true); setShowDetailModal(false); }} className="bg-slate-900 text-white font-black py-4 rounded-xl md:rounded-2xl uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2"><FileIcon size={16} /> Payslip</button>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <>
                    <button onClick={() => { setEditingEmployee(selectedEmployee); setShowAddEmployee(true); setShowDetailModal(false); }} className="bg-slate-100 text-slate-600 font-black py-4 rounded-xl md:rounded-2xl uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2"><Edit2 size={16} /> Edit</button>
                    {selectedEmployee?.isActive !== false && (
                      <button 
                        onClick={() => handleTerminateEmployee(selectedEmployee.id)} 
                        className="bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl md:rounded-2xl uppercase tracking-widest text-[9px] md:text-xs flex items-center justify-center gap-2 shadow-xl"
                      >
                        <Trash2 size={16} /> Terminate
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setShowDetailModal(false)} className="col-span-2 custom-theme-bg text-white font-black py-4 rounded-xl md:rounded-2xl shadow-xl uppercase tracking-widest text-[9px] md:text-xs">Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (<button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 font-bold text-sm tracking-tight ${active ? 'custom-theme-bg text-white shadow-xl translate-x-1' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}>{icon} <span className="truncate">{label}</span></button>);
const StatCard = ({ title, value, color, bgColor, icon }: any) => (<div className={`p-6 md:p-8 rounded-2xl md:rounded-[32px] border border-slate-100 shadow-sm transition-all hover:shadow-xl ${bgColor}`}><div className="flex items-center justify-between mb-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400"><div>{title}</div><div className={`p-1.5 rounded-lg bg-white/50 ${color}`}>{icon}</div></div><div className={`text-xl md:text-3xl font-black ${color} truncate`}>KES {Number(value || 0).toLocaleString()}</div></div>);
const DetailRow = ({ label, value }: any) => (<div className="flex justify-between items-center text-xs py-3 border-b border-slate-50 last:border-0"><span className="text-slate-400 font-bold uppercase tracking-widest text-[8px] md:text-[10px]">{label}</span><span className="font-bold text-slate-800 truncate ml-2 max-w-[60%]">{value}</span></div>);
const FormField = ({ label, name, type = "text", required = false, placeholder = "", defaultValue }: any) => (<div className="space-y-2"><label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label><input type={type} name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} className="w-full border-2 border-slate-100 rounded-xl md:rounded-2xl px-5 py-3 md:py-4 bg-slate-50 focus:bg-white focus:custom-theme-border outline-none transition-all font-bold text-slate-700 text-sm" /></div>);

export default App;