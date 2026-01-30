import { Employee, PayrollRecord, PayrollAudit, User, BrandSettings, LeaveRequest } from '../types';

const API_BASE = 'http://localhost:4000/api';  // ← Changed to direct backend URL to avoid proxy confusion
// Alternative (if using Vite proxy): const API_BASE = '/api';

const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch (e) { return memoryStore[key] || null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch (e) { memoryStore[key] = value; }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch (e) { delete memoryStore[key]; }
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
    try { return JSON.parse(safeStorage.getItem('payroll_employees') || '[]'); } catch { return []; }
  },
  setEmployees: (data: Employee[]) => safeStorage.setItem('payroll_employees', JSON.stringify(data)),

  getPayroll: (): PayrollRecord[] => {
    try { return JSON.parse(safeStorage.getItem('payroll_history') || '[]'); } catch { return []; }
  },
  setPayroll: (data: PayrollRecord[]) => safeStorage.setItem('payroll_history', JSON.stringify(data)),

  getAudits: (): PayrollAudit[] => {
    try { return JSON.parse(safeStorage.getItem('payroll_audits') || '[]'); } catch { return []; }
  },
  setAudits: (data: PayrollAudit[]) => safeStorage.setItem('payroll_audits', JSON.stringify(data)),

  getBrand: (): BrandSettings => {
    try { return JSON.parse(safeStorage.getItem('payroll_brand') || JSON.stringify(DEFAULT_BRAND)); } catch { return DEFAULT_BRAND; }
  },
  setBrand: (data: BrandSettings) => safeStorage.setItem('payroll_brand', JSON.stringify(data)),

  getLeaveRequests: (): LeaveRequest[] => {
    try { return JSON.parse(safeStorage.getItem('payroll_leaves') || '[]'); } catch { return []; }
  },
  setLeaveRequests: (data: LeaveRequest[]) => safeStorage.setItem('payroll_leaves', JSON.stringify(data)),
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

export const apiService = {
  isLocalMode: false,
  backendChecked: false,

  async checkBackend(): Promise<boolean> {
    try {
      console.log("[apiService] Checking backend health →", `${API_BASE}/health`);
      const res = await fetchWithTimeout(`${API_BASE}/health`, { method: 'GET' }, 3000);
      console.log("[apiService] Health check status:", res.status, res.statusText);
      this.isLocalMode = !res.ok;
      this.backendChecked = true;
      return res.ok;
    } catch (e: any) {
      console.warn("[apiService] Backend health check failed:", e.message);
      this.isLocalMode = true;
      this.backendChecked = true;
      return false;
    }
  },

  async login(email: string, password: string): Promise<User> {
    const userEmail = email.toLowerCase();

    // Hardcoded admin/manager for development/testing
    if (userEmail === 'admin@payrollpro.com' && password === 'password123') {
      const user: User = { id: 'admin-001', email, role: 'admin', firstName: 'Admin', lastName: 'System' };
      safeStorage.setItem('payroll_user', JSON.stringify(user));
      return user;
    }
    if (userEmail === 'manager@payrollpro.com' && password === 'manager123') {
      const user: User = { id: 'mgr-001', email, role: 'manager', firstName: 'Operations', lastName: 'Manager' };
      safeStorage.setItem('payroll_user', JSON.stringify(user));
      return user;
    }

    // Try real backend login
    try {
      const res = await fetchWithTimeout(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        safeStorage.setItem('payroll_user', JSON.stringify(data.user || data));
        // If backend returns token → store it
        if (data.token) {
          safeStorage.setItem('payroll_token', data.token);
        }
        return data.user || data;
      }

      if (res.status === 401) throw new Error("Invalid email or password.");
      throw new Error(`Login failed: ${res.status} ${res.statusText}`);
    } catch (err: any) {
      if (err.message.includes('Invalid email or password')) throw err;
      console.warn("[apiService] Backend login failed, falling back to local check");
    }

    // Fallback: check local employees for staff login
    const localEmployees = localStore.getEmployees();
    const localStaff = localEmployees.find(e => e.email.toLowerCase() === userEmail);
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

    throw new Error("Login failed. Please check your credentials.");
  },

  getCurrentUser(): User | null {
    const data = safeStorage.getItem('payroll_user');
    return data ? JSON.parse(data) : null;
  },

  logout(): void {
    safeStorage.removeItem('payroll_user');
    safeStorage.removeItem('payroll_token');
  },

  async getEmployees(): Promise<Employee[]> {
    if (this.isLocalMode) {
      console.log("[apiService] Local mode active → returning local employees");
      return localStore.getEmployees();
    }

    try {
      console.log("[apiService] Fetching employees from:", `${API_BASE}/employees`);

      const token = safeStorage.getItem('payroll_token') || '';

      const res = await fetchWithTimeout(`${API_BASE}/employees`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!res.ok) {
        let errorBody = '';
        try { errorBody = await res.text(); } catch {}
        console.error(`[apiService] GET /employees failed`, {
          status: res.status,
          statusText: res.statusText,
          responseBody: errorBody || '(empty body)',
          url: res.url
        });
        return localStore.getEmployees();
      }

      const data = await res.json();
      console.log(`[apiService] Loaded ${data.length} employees from backend`);
      localStore.setEmployees(data); // sync to local for offline use
      return data;
    } catch (err: any) {
      console.error("[apiService] Network error fetching employees:", err.message);
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
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`${API_BASE}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(emp)
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(no message)');
        throw new Error(`Save employee failed: ${res.status} - ${errorText}`);
      }

      return await res.json();
    } catch (e: any) {
      console.error("[apiService] saveEmployee error:", e.message);
      return emp; // optimistic return
    }
  },

  async updateEmployee(emp: Employee): Promise<Employee> {
    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      const index = emps.findIndex(e => e.id === emp.id);
      if (index !== -1) {
        emps[index] = emp;
        localStore.setEmployees(emps);
      }
      return emp;
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`${API_BASE}/employees/${emp.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(emp)
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(no message)');
        throw new Error(`Update employee failed: ${res.status} - ${errorText}`);
      }

      return await res.json();
    } catch (e: any) {
      console.error("[apiService] updateEmployee error:", e.message);
      return emp;
    }
  },

  async terminateEmployee(employeeId: string, reason: string | null = null) {
    const terminationData = {
      isActive: false,
      terminatedAt: new Date().toISOString(),
      terminationReason: reason
    };

    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      const index = emps.findIndex(e => e.id === employeeId);
      if (index !== -1) {
        emps[index] = { ...emps[index], ...terminationData };
        localStore.setEmployees(emps);
        return { success: true, data: emps[index] };
      }
      throw new Error('Employee not found in local storage');
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const response = await fetchWithTimeout(`${API_BASE}/employees/${employeeId}/terminate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(terminationData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Terminate failed: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      console.error('[apiService] terminateEmployee error:', err.message);
      throw err;
    }
  },

  async getPayrollHistory(): Promise<PayrollRecord[]> {
    if (this.isLocalMode) return localStore.getPayroll();

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`${API_BASE}/payroll`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) return localStore.getPayroll();
      const data = await res.json();
      localStore.setPayroll(data);
      return data;
    } catch (e) {
      return localStore.getPayroll();
    }
  },

  async savePayrollRun(records: PayrollRecord[]): Promise<void> {
    const history = localStore.getPayroll();
    localStore.setPayroll([...records, ...history]);

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      await fetchWithTimeout(`${API_BASE}/payroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(records)
      });
    } catch (e) {
      console.warn("[apiService] savePayrollRun to backend failed", e);
    }
  },

  async getAuditLogs(): Promise<PayrollAudit[]> {
    if (this.isLocalMode) return localStore.getAudits();

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`${API_BASE}/audits`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) return localStore.getAudits();
      const data = await res.json();
      localStore.setAudits(data);
      return data;
    } catch (e) {
      return localStore.getAudits();
    }
  },

  async saveAuditLog(log: PayrollAudit): Promise<void> {
    const logs = localStore.getAudits();
    localStore.setAudits([log, ...logs]);

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      await fetchWithTimeout(`${API_BASE}/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(log)
      });
    } catch (e) {}
  },

  async getBrandSettings(): Promise<BrandSettings> {
    if (this.isLocalMode) return localStore.getBrand();

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`${API_BASE}/settings`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      localStore.setBrand(data);
      return data;
    } catch (e) {
      return localStore.getBrand();
    }
  },

  async saveBrandSettings(settings: BrandSettings): Promise<void> {
    localStore.setBrand(settings);

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      await fetchWithTimeout(`${API_BASE}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(settings)
      });
    } catch (e) {}
  },

  async getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
    if (this.isLocalMode) {
      const leaves = localStore.getLeaveRequests();
      return employeeId ? leaves.filter(l => l.employeeId === employeeId) : leaves;
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const url = employeeId 
        ? `${API_BASE}/leave-requests?employeeId=${encodeURIComponent(employeeId)}`
        : `${API_BASE}/leave-requests`;

      const res = await fetchWithTimeout(url, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) return localStore.getLeaveRequests();
      const data = await res.json();
      localStore.setLeaveRequests(data);
      return data;
    } catch (e) {
      return localStore.getLeaveRequests();
    }
  },

  async submitLeaveRequest(request: LeaveRequest): Promise<void> {
    const leaves = localStore.getLeaveRequests();
    localStore.setLeaveRequests([request, ...leaves]);

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      await fetchWithTimeout(`${API_BASE}/leave-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(request)
      });
    } catch (e) {}
  },

  async updateLeaveStatus(id: string, status: 'approved' | 'rejected', employeeId: string, daysToSubtract: number): Promise<void> {
    const leaves = localStore.getLeaveRequests();
    localStore.setLeaveRequests(leaves.map(l => l.id === id ? { ...l, status } : l));

    if (status === 'approved') {
      const emps = localStore.getEmployees();
      localStore.setEmployees(emps.map(e => 
        e.id === employeeId ? { ...e, remainingLeaveDays: e.remainingLeaveDays - daysToSubtract } : e
      ));
    }

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      await fetchWithTimeout(`${API_BASE}/leave-requests/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ status, employeeId, daysToSubtract })
      });
    } catch (e) {}
  },

  async sharePayslip(email: string, employeeId: string, recordId: string, message: string): Promise<void> {
    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      await fetchWithTimeout(`${API_BASE}/share-payslip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ email, employeeId, recordId, message })
      });
    } catch (e) {}
  }
};