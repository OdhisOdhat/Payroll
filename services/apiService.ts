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

// Helper for fetch with timeout
async function fetchWithTimeout(url: string, options: any = {}, timeout: number = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export const apiService = {
  isLocalMode: true, // Default to local mode for safety
  backendChecked: false,

  async checkBackend(): Promise<boolean> {
    if (this.backendChecked) return !this.isLocalMode;
    try {
      // Very aggressive check for speed
      const res = await fetchWithTimeout(`${API_BASE}/employees`, { method: 'HEAD' }, 1000);
      this.isLocalMode = !res.ok;
      this.backendChecked = true;
      return res.ok;
    } catch (e) {
      this.isLocalMode = true;
      this.backendChecked = true;
      return false;
    }
  },

  async login(email: string, password: string): Promise<User> {
    await new Promise(r => setTimeout(r, 400));
    
    if (email === 'admin@payrollpro.com' && password === 'password123') {
      const user: User = { id: 'admin-001', email, role: 'admin', firstName: 'Admin', lastName: '' };
      safeStorage.setItem('payroll_user', JSON.stringify(user));
      return user;
    }

    const localEmployees = localStore.getEmployees();
    const localStaff = localEmployees.find(e => e.email.toLowerCase() === email.toLowerCase());
    
    if (localStaff && password === 'password123') {
      const user: User = { 
        id: `user-${localStaff.id}`, 
        email: localStaff.email, 
        role: 'staff', 
        employeeId: localStaff.id,
        firstName: localStaff.firstName,
        lastName: localStaff.lastName
      };
      safeStorage.setItem('payroll_user', JSON.stringify(user));
      return user;
    }

    if (!this.backendChecked) {
      await this.checkBackend();
    }

    if (!this.isLocalMode) {
      try {
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
      } catch (err) {
        // Fall through to error
      }
    }

    throw new Error("Invalid credentials or account not found.");
  },

  getCurrentUser(): User | null {
    const data = safeStorage.getItem('payroll_user');
    return data ? JSON.parse(data) : null;
  },

  logout(): void {
    safeStorage.removeItem('payroll_user');
  },

  async getEmployees(): Promise<Employee[]> {
    if (this.isLocalMode) return localStore.getEmployees();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/employees`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (e) {
      return localStore.getEmployees();
    }
  },

  async saveEmployee(emp: Employee): Promise<Employee> {
    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      emps.push(emp);
      localStore.setEmployees(emps);
      return emp;
    }
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      });
      return await res.json();
    } catch (e) {
      return emp;
    }
  },

  async updateEmployee(emp: Employee): Promise<Employee> {
    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      const idx = emps.findIndex(e => e.id === emp.id);
      if (idx !== -1) emps[idx] = emp;
      localStore.setEmployees(emps);
      return emp;
    }
    try {
      const res = await fetch(`${API_BASE}/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emp)
      });
      return await res.json();
    } catch (e) {
      return emp;
    }
  },

  async getPayrollHistory(): Promise<PayrollRecord[]> {
    if (this.isLocalMode) return localStore.getPayroll();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/payroll`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (e) {
      return localStore.getPayroll();
    }
  },

  async savePayrollRun(records: PayrollRecord[]): Promise<void> {
    const history = localStore.getPayroll();
    localStore.setPayroll([...records, ...history]);
    if (!this.isLocalMode) {
      try {
        await fetch(`${API_BASE}/payroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(records)
        });
      } catch (e) {}
    }
  },

  async getAuditLogs(): Promise<PayrollAudit[]> {
    if (this.isLocalMode) return localStore.getAudits();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/audits`);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (e) {
      return localStore.getAudits();
    }
  },

  async saveAuditLog(log: PayrollAudit): Promise<void> {
    const logs = localStore.getAudits();
    localStore.setAudits([log, ...logs]);
    if (!this.isLocalMode) {
      try {
        await fetch(`${API_BASE}/audits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log)
        });
      } catch (e) {}
    }
  },

  async getBrandSettings(): Promise<BrandSettings> {
    if (this.isLocalMode) return localStore.getBrand();
    try {
      const res = await fetchWithTimeout(`${API_BASE}/settings`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      return {
        entityName: data.entityName || DEFAULT_BRAND.entityName,
        logoUrl: data.logoUrl || DEFAULT_BRAND.logoUrl,
        primaryColor: data.primaryColor || DEFAULT_BRAND.primaryColor,
        address: data.address || DEFAULT_BRAND.address,
      };
    } catch (e) {
      return localStore.getBrand();
    }
  },

  async saveBrandSettings(settings: BrandSettings): Promise<void> {
    localStore.setBrand(settings);
    if (!this.isLocalMode) {
      try {
        await fetch(`${API_BASE}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
      } catch (e) {}
    }
  },

  async getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
    if (this.isLocalMode) {
      const leaves = localStore.getLeaveRequests();
      if (employeeId) return leaves.filter(l => l.employeeId === employeeId);
      return leaves;
    }
    try {
      const url = employeeId ? `${API_BASE}/leave-requests?employeeId=${employeeId}` : `${API_BASE}/leave-requests`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error();
      return await res.json();
    } catch (e) {
      const leaves = localStore.getLeaveRequests();
      if (employeeId) return leaves.filter(l => l.employeeId === employeeId);
      return leaves;
    }
  },

  async submitLeaveRequest(request: LeaveRequest): Promise<void> {
    const leaves = localStore.getLeaveRequests();
    localStore.setLeaveRequests([request, ...leaves]);
    if (!this.isLocalMode) {
      try {
        await fetch(`${API_BASE}/leave-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        });
      } catch (e) {}
    }
  },

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected', employeeId: string, daysToSubtract: number): Promise<void> {
    const leaves = localStore.getLeaveRequests();
    const updated = leaves.map(l => l.id === id ? { ...l, status } : l);
    localStore.setLeaveRequests(updated);
    
    if (status === 'approved') {
      const emps = localStore.getEmployees();
      const updatedEmps = emps.map(e => e.id === employeeId ? { ...e, remainingLeaveDays: e.remainingLeaveDays - daysToSubtract } : e);
      localStore.setEmployees(updatedEmps);
    }

    if (!this.isLocalMode) {
      try {
        await fetch(`${API_BASE}/leave-requests/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, employeeId, daysToSubtract })
        });
      } catch (e) {}
    }
  },

  async sharePayslip(email: string, employeeId: string, recordId: string, message: string): Promise<void> {
    if (!this.isLocalMode) {
      try {
        await fetch(`${API_BASE}/share-payslip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, employeeId, recordId, message })
        });
      } catch (e) {}
    }
  }
};