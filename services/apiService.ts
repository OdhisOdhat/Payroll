
import { Employee, PayrollRecord, PayrollAudit, User, BrandSettings, LeaveRequest } from '../types';

const API_BASE = '/api';

const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return memoryStore[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memoryStore[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryStore[key];
    }
  }
};

const DEFAULT_BRAND: BrandSettings = {
  entityName: 'PayrollPro Kenya',
  logoUrl: '',
  primaryColor: '#2563eb',
  address: '123 Nairobi, Kenya'
};

const localStore = {
  getEmployees: (): Employee[] => {
    try {
      return JSON.parse(safeStorage.getItem('payroll_employees') || '[]');
    } catch { return []; }
  },
  setEmployees: (data: Employee[]) => safeStorage.setItem('payroll_employees', JSON.stringify(data)),
  getPayroll: (): PayrollRecord[] => {
    try {
      return JSON.parse(safeStorage.getItem('payroll_history') || '[]');
    } catch { return []; }
  },
  setPayroll: (data: PayrollRecord[]) => safeStorage.setItem('payroll_history', JSON.stringify(data)),
  getAudits: (): PayrollAudit[] => {
    try {
      return JSON.parse(safeStorage.getItem('payroll_audits') || '[]');
    } catch { return []; }
  },
  setAudits: (data: PayrollAudit[]) => safeStorage.setItem('payroll_audits', JSON.stringify(data)),
  getBrand: (): BrandSettings => {
    try {
      return JSON.parse(safeStorage.getItem('payroll_brand') || JSON.stringify(DEFAULT_BRAND));
    } catch { return DEFAULT_BRAND; }
  },
  setBrand: (data: BrandSettings) => safeStorage.setItem('payroll_brand', JSON.stringify(data)),
  getLeaveRequests: (): LeaveRequest[] => {
    try {
      return JSON.parse(safeStorage.getItem('payroll_leaves') || '[]');
    } catch { return []; }
  },
  setLeaveRequests: (data: LeaveRequest[]) => safeStorage.setItem('payroll_leaves', JSON.stringify(data)),
};

export const apiService = {
  isLocalMode: false,

  async checkBackend(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/employees`, { method: 'HEAD' });
      this.isLocalMode = !res.ok;
      return res.ok;
    } catch (e) {
      this.isLocalMode = true;
      return false;
    }
  },

  async login(email: string, password: string): Promise<User> {
    await new Promise(r => setTimeout(r, 800));
    if (email === 'admin@payrollpro.com' && password === 'password123') {
      const user: User = { id: 'admin-001', email, role: 'admin', firstName: 'Admin', lastName: '' };
      safeStorage.setItem('payroll_user', JSON.stringify(user));
      return user;
    }
    const employees = await this.getEmployees();
    const staffMember = employees.find(e => e.email.toLowerCase() === email.toLowerCase());
    if (staffMember && password === 'password123') {
      const user: User = { 
        id: `user-${staffMember.id}`, 
        email: staffMember.email, 
        role: 'staff', 
        employeeId: staffMember.id,
        firstName: staffMember.firstName,
        lastName: staffMember.lastName
      };
      safeStorage.setItem('payroll_user', JSON.stringify(user));
      return user;
    }
    throw new Error("Invalid credentials.");
  },

  getCurrentUser(): User | null {
    const data = safeStorage.getItem('payroll_user');
    return data ? JSON.parse(data) : null;
  },

  logout() {
    safeStorage.removeItem('payroll_user');
  },

  async getEmployees(): Promise<Employee[]> {
    if (this.isLocalMode) return localStore.getEmployees();
    try {
      const res = await fetch(`${API_BASE}/employees`);
      return await res.json();
    } catch (error) {
      return localStore.getEmployees();
    }
  },

  async saveEmployee(employee: Employee): Promise<Employee> {
    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      localStore.setEmployees([employee, ...emps]);
      return employee;
    }
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    return await res.json();
  },

  async updateEmployee(employee: Employee): Promise<Employee> {
    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      localStore.setEmployees(emps.map(e => e.id === employee.id ? employee : e));
      return employee;
    }
    const res = await fetch(`${API_BASE}/employees/${employee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee),
    });
    return await res.json();
  },

  async getPayrollHistory(): Promise<PayrollRecord[]> {
    if (this.isLocalMode) return localStore.getPayroll();
    try {
      const res = await fetch(`${API_BASE}/payroll`);
      return await res.json();
    } catch (error) {
      return localStore.getPayroll();
    }
  },

  async savePayrollRun(records: PayrollRecord[]): Promise<void> {
    if (this.isLocalMode) {
      localStore.setPayroll([...records, ...localStore.getPayroll()]);
      return;
    }
    await fetch(`${API_BASE}/payroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    });
  },

  async getAuditLogs(): Promise<PayrollAudit[]> {
    if (this.isLocalMode) return localStore.getAudits();
    try {
      const res = await fetch(`${API_BASE}/audits`);
      return await res.json();
    } catch (error) {
      return localStore.getAudits();
    }
  },

  async saveAuditLog(audit: PayrollAudit): Promise<void> {
    if (this.isLocalMode) {
      localStore.setAudits([audit, ...localStore.getAudits()]);
      return;
    }
    await fetch(`${API_BASE}/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audit),
    });
  },

  async getBrandSettings(): Promise<BrandSettings> {
    if (this.isLocalMode) return localStore.getBrand();
    try {
      const res = await fetch(`${API_BASE}/settings`);
      const settings = await res.json();
      if (settings.brand) return JSON.parse(settings.brand);
      return localStore.getBrand();
    } catch (error) {
      return localStore.getBrand();
    }
  },

  async saveBrandSettings(brand: BrandSettings): Promise<void> {
    if (this.isLocalMode) {
      localStore.setBrand(brand);
      return;
    }
    await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: JSON.stringify(brand) }),
    });
  },

  async sharePayslip(email: string, employeeId: string, recordId: string, message: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/share-payslip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, employeeId, recordId, message }),
    });
    return await res.json();
  },

  async getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
    if (this.isLocalMode) {
      const leaves = localStore.getLeaveRequests();
      return employeeId ? leaves.filter(l => l.employeeId === employeeId) : leaves;
    }
    const url = employeeId ? `${API_BASE}/leave-requests?employeeId=${employeeId}` : `${API_BASE}/leave-requests`;
    const res = await fetch(url);
    return await res.json();
  },

  async submitLeaveRequest(request: LeaveRequest): Promise<LeaveRequest> {
    if (this.isLocalMode) {
      localStore.setLeaveRequests([request, ...localStore.getLeaveRequests()]);
      return request;
    }
    const res = await fetch(`${API_BASE}/leave-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return await res.json();
  },

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected', employeeId: string, daysToSubtract: number): Promise<void> {
    if (this.isLocalMode) {
      const leaves = localStore.getLeaveRequests();
      localStore.setLeaveRequests(leaves.map(l => l.id === id ? { ...l, status } : l));
      if (status === 'approved' && daysToSubtract > 0) {
        const emps = localStore.getEmployees();
        localStore.setEmployees(emps.map(e => e.id === employeeId ? { ...e, remainingLeaveDays: e.remainingLeaveDays - daysToSubtract } : e));
      }
      return;
    }
    await fetch(`${API_BASE}/leave-requests/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, employeeId, daysToSubtract }),
    });
  }
};
