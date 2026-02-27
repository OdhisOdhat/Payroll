// src/services/apiService.ts
import { Employee, PayrollRecord, PayrollAudit, User, BrandSettings, LeaveRequest, LeaveStatus, PayrollRunParams } from '../types';
import { getSupabaseClient } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// =========== TOKEN & SESSION CACHE (optimized) ===========
let cachedToken: string | null = null;
let cachedUser: User | null = null;
let tokenRefreshPromise: Promise<string> | null = null;

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

// Efficient token getter with in-memory cache
const getToken = (): string => {
  if (cachedToken) return cachedToken;
  cachedToken = safeStorage.getItem('payroll_token') || '';
  return cachedToken;
};

const setToken = (token: string): void => {
  cachedToken = token;
  safeStorage.setItem('payroll_token', token);
};

// =========== REQUEST DEDUPLICATION (reduce redundant calls) ===========
const requestCache = new Map<string, { data: any; expiry: number }>();
const pendingRequests = new Map<string, Promise<any>>();

const getCacheKey = (method: string, url: string): string => `${method}:${url}`;

const withRequestDedup = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  cacheTTL: number = 5000 // 5 second default cache
): Promise<T> => {
  // Return cached result if still valid
  const cached = requestCache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Return existing pending request (avoid duplicate in-flight requests)
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Create new request
  const promise = fetcher().then(data => {
    requestCache.set(key, { data, expiry: Date.now() + cacheTTL });
    pendingRequests.delete(key);
    return data;
  }).catch(err => {
    pendingRequests.delete(key);
    throw err;
  });

  pendingRequests.set(key, promise);
  return promise;
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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 7000, retryCount: number = 0): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    // Add cached token to headers (avoid repeated localStorage reads)
    const headers = {
      ...((options.headers as Record<string, string>) || {}),
    } as Record<string, string>;

    const token = getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(id);

    // Auto-retry on 401 (unauthorized) - token may have expired
    if (response.status === 401 && retryCount === 0) {
      cachedToken = null; // Clear stale cache
      const refreshed = await refreshTokenIfNeeded();
      if (refreshed) {
        // Retry once with fresh token
        return fetchWithTimeout(url, options, timeout, 1);
      }
    }

    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

async function refreshTokenIfNeeded(): Promise<boolean> {
  try {
    // Use Supabase to refresh the session
    const client = getSupabaseClient();
    const { data, error } = await client.auth.refreshSession();
    
    if (!error && data.session?.access_token) {
      setToken(data.session.access_token);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Token refresh failed:', err);
    return false;
  }
}

export const apiService = {
  isLocalMode: false,
  backendChecked: false,

  // Check backend once and cache result
  async checkBackend(): Promise<boolean> {
    if (this.backendChecked) {
      return !this.isLocalMode; // Return cached result
    }

    try {
      console.log("[apiService] Checking backend health");
      const res = await fetchWithTimeout(`/api/health`, { method: 'GET' }, 3000);
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

  // Optimized login with session caching
  async login(email: string, password: string): Promise<User> {
    try {
      const res = await fetchWithTimeout(`/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }, 10000);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Invalid email or password.");
      }

      const data = await res.json();
      
      const user: User = {
        id: data.user.id,
        email: data.user.email || email,
        role: data.user.role || 'staff',
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
      };

      // Update both caches
      cachedUser = user;
      setToken(data.token);
      safeStorage.setItem('payroll_user', JSON.stringify(user));

      return user;
    } catch (err: any) {
      throw new Error(err?.message || "Login failed. Please check your credentials.");
    }
  },

  // Get user from memory cache first, then localStorage
  getCurrentUser(): User | null {
    if (cachedUser) return cachedUser;
    const data = safeStorage.getItem('payroll_user');
    if (data) {
      cachedUser = JSON.parse(data);
      return cachedUser;
    }
    return null;
  },

  // Logout and clear all caches
  logout(): void {
    cachedUser = null;
    cachedToken = null;
    requestCache.clear();
    pendingRequests.clear();
    safeStorage.removeItem('payroll_user');
    safeStorage.removeItem('payroll_token');
  },

  // Signup with email and password
  async signup(email: string, password: string, firstName: string, lastName: string): Promise<User> {
    try {
      const res = await fetchWithTimeout(`/api/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      }, 10000);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Signup failed");
      }

      const data = await res.json();
      
      const user: User = {
        id: data.user.id,
        email: data.user.email || email,
        role: data.user.role || 'staff',
        firstName: data.user.firstName || firstName,
        lastName: data.user.lastName || lastName,
      };

      // Update caches
      cachedUser = user;
      setToken(data.token);
      safeStorage.setItem('payroll_user', JSON.stringify(user));

      return user;
    } catch (err: any) {
      throw new Error(err?.message || "Signup failed");
    }
  },

  // Request password reset
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchWithTimeout(`/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }, 10000);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Password reset request failed");
      }

      return await res.json();
    } catch (err: any) {
      throw new Error(err?.message || "Password reset request failed");
    }
  },

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchWithTimeout(`/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      }, 10000);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Password reset failed");
      }

      return await res.json();
    } catch (err: any) {
      throw new Error(err?.message || "Password reset failed");
    }
  },

  async getEmployees(): Promise<Employee[]> {
    const cacheKey = getCacheKey('GET', '/api/employees');

    return withRequestDedup(cacheKey, async () => {
      if (this.isLocalMode) {
        console.log("[apiService] Local mode → returning local employees");
        return localStore.getEmployees();
      }

      try {
        const res = await fetchWithTimeout(`/api/employees`, { method: 'GET' }, 10000);

        if (!res.ok) {
          console.error(`[apiService] GET /employees failed: ${res.status}`);
          return localStore.getEmployees();
        }

        const raw = await res.json();
        const sourceArray = Array.isArray(raw) ? raw : (raw.value || raw.data || []);
        const data = (sourceArray || []).map((d: any) => ({
          id: d.id,
          payrollNumber: d.payroll_number || d.payrollNumber || '',
          firstName: d.first_name || d.firstName || '',
          lastName: d.last_name || d.lastName || '',
          email: d.email || '',
          kraPin: d.kra_pin || d.kraPin || '',
          nssfNumber: d.nssf_number || d.nssfNumber || '',
          nhifNumber: d.nhif_number || d.nhifNumber || '',
          basicSalary: d.basic_salary ?? d.basicSalary ?? 0,
          benefits: d.benefits ?? 0,
          totalLeaveDays: d.total_leave_days ?? d.totalLeaveDays ?? 21,
          remainingLeaveDays: d.remaining_leave_days ?? d.remainingLeaveDays ?? 21,
          joinedDate: d.joined_date || d.joinedDate || null,
          isActive: d.is_active !== undefined ? d.is_active : (d.isActive !== undefined ? d.isActive : true),
          designation: d.designation || d.position || 'Staff',
          companyName: d.company_name || d.companyName || '',
          payrollNumberRaw: d.payroll_number,
        }));

        console.log(`[apiService] Loaded ${data.length} employees`);
        localStore.setEmployees(data);
        return data;
      } catch (err: any) {
        console.error("[apiService] Network error fetching employees:", err.message);
        return localStore.getEmployees();
      }
    }, 10000); // Cache employees for 10 seconds
  },

  async saveEmployee(emp: Partial<Employee>): Promise<Employee> {
    const toSave = { ...(emp as Partial<Employee>), id: (emp as any).id || `emp-${Date.now()}` } as Employee;
    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      emps.push(toSave);
      localStore.setEmployees(emps);
      return toSave;
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      console.log('[apiService.saveEmployee] Sending POST to /api/employees with token present:', !!token, 'employee:', emp.firstName, emp.payrollNumber);
      
      // Exclude 'id' field for new employees - let backend generate UUID
      const { id, ...payloadWithoutId } = emp;
      
      const res = await fetchWithTimeout(`/api/employees/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(payloadWithoutId)
      });

      console.log('[apiService.saveEmployee] Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '(no message)');
        console.error('[apiService.saveEmployee] Error response:', errorText);
        throw new Error(`Save employee failed: ${res.status} - ${errorText}`);
      }

      const result = await res.json();
      console.log('[apiService.saveEmployee] Saved successfully, result:', result);
      return result;
    } catch (e: any) {
      console.error("[apiService] saveEmployee error:", e.message);
      return toSave; // optimistic return as complete Employee
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
      const res = await fetchWithTimeout(`/api/employees/${emp.id}`, {
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

  async deleteEmployee(id: string): Promise<void> {
    const emps = localStore.getEmployees();
    localStore.setEmployees(emps.filter(e => e.id !== id));

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/employees/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) throw new Error('Delete employee failed');
    } catch (err) {
      console.warn('[apiService] deleteEmployee failed', err);
      throw err;
    }
  },

  async deleteEmployeesBulk(ids: string[]): Promise<void> {
    if (!Array.isArray(ids) || ids.length === 0) return;

    // Optimistically update local cache
    const emps = localStore.getEmployees();
    localStore.setEmployees(emps.filter(e => !ids.includes(e.id)));

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/employees`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '(no message)');
        throw new Error(`Bulk delete employees failed: ${res.status} - ${errorText}`);
      }
    } catch (err) {
      console.warn('[apiService] deleteEmployeesBulk failed', err);
      throw err;
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
      const response = await fetchWithTimeout(`/api/employees/${employeeId}/terminate`, {
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
      const res = await fetchWithTimeout(`/api/payroll`, {
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
      await fetchWithTimeout(`/api/payroll`, {
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

  async runPayroll(params: PayrollRunParams): Promise<PayrollRecord[]> {
    if (this.isLocalMode) {
      const emps = params.employeeIds && params.employeeIds.length > 0
        ? localStore.getEmployees().filter(e => params.employeeIds!.includes(e.id))
        : localStore.getEmployees().filter(e => e.isActive !== false);

      const generated: PayrollRecord[] = emps.map(e => {
        const id = `local-${Date.now()}-${e.id}`;
        const payPeriodStart = new Date(params.year, params.month, 1).toISOString();
        const payPeriodEnd = new Date(params.year, params.month + 1, 0).toISOString();
        const basic = e.basicSalary || 0;
        const gross = basic + (e.benefits || 0);
        const paye = Math.round(gross * 0.1);
        const nssf = Math.round(gross * 0.06);
        const net = gross - paye - nssf;

        return {
          id,
          employeeId: e.id,
          employeeName: `${e.firstName} ${e.lastName}`,
          employeeNumber: e.payrollNumber || '',
          payPeriodStart,
          payPeriodEnd,
          grossPay: gross,
          netPay: net,
          paye,
          nssf,
          personalRelief: 0,
          status: 'completed',
          createdAt: new Date().toISOString(),
        } as PayrollRecord;
      });

      const history = localStore.getPayroll();
      localStore.setPayroll([...generated, ...history]);
      return generated;
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/payroll/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(params)
      });

      if (!res.ok) throw new Error(`Payroll run failed: ${res.status}`);
      const data = await res.json();
      const history = localStore.getPayroll();
      localStore.setPayroll([...data, ...history]);
      return data;
    } catch (err) {
      console.error('[apiService] runPayroll error', err);
      return localStore.getPayroll();
    }
  },

  async getAuditLogs(): Promise<PayrollAudit[]> {
    if (this.isLocalMode) return localStore.getAudits();

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/audits`, {
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
      await fetchWithTimeout(`/api/audits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(log)
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
        ? `/api/leave-requests?employeeId=${encodeURIComponent(employeeId)}`
        : `/api/leave-requests`;

      const res = await fetchWithTimeout(url, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) {
        console.warn(`[apiService] GET /leave-requests failed: ${res.status}`);
        return localStore.getLeaveRequests();
      }

      const data = await res.json();
      console.log(`[apiService] Loaded ${data.length} leave requests from backend`);
      localStore.setLeaveRequests(data);
      return data;
    } catch (err: any) {
      console.error("[apiService] Error fetching leave requests:", err.message);
      return localStore.getLeaveRequests();
    }
  },

  async submitLeaveRequest(request: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const leaves = localStore.getLeaveRequests();
    const saved: LeaveRequest = {
      ...(request as LeaveRequest),
      id: request.id || `lr-${Date.now()}`,
      createdAt: request.createdAt || new Date().toISOString(),
      status: (request as LeaveRequest).status || 'pending'
    } as LeaveRequest;
    localStore.setLeaveRequests([saved, ...leaves]);
    return saved;
  },

  async updateLeaveStatus(id: string, status: LeaveStatus, employeeId: string, daysToSubtract: number): Promise<void> {
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
      await fetchWithTimeout(`/api/leave-requests/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ status, employeeId, daysToSubtract })
      });
    } catch (e) {}
  },

  async getBrandSettings(): Promise<BrandSettings> {
    if (this.isLocalMode) return localStore.getBrand();

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/brand-settings`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (res.ok) {
        const data = await res.json();
        localStore.setBrand(data);
        return data;
      }

      // Fallback to /settings if /brand-settings 404s
      const fallbackRes = await fetchWithTimeout(`/api/settings`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!fallbackRes.ok) throw new Error();
      const data = await fallbackRes.json();
      localStore.setBrand(data);
      return data;
    } catch (e) {
      return localStore.getBrand();
    }
  },

  async saveBrandSettings(settings: BrandSettings): Promise<BrandSettings> {
    localStore.setBrand(settings);

    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/brand-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        const data = await res.json().catch(() => settings);
        localStore.setBrand(data);
        return data;
      }
    } catch (e) {}
    return settings;
  },

  async uploadLogo(file: File): Promise<{ url: string; filename?: string }> {
    if (this.isLocalMode) {
      return { url: '/default-logo.png', filename: file.name };
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetchWithTimeout(`/api/upload-logo`, {
        method: 'POST',
        body: fd,
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) throw new Error('Logo upload failed');
      const data = await res.json();
      return { url: data.url || '/default-logo.png', filename: data.filename };
    } catch (err) {
      console.error('[apiService] uploadLogo error', err);
      throw err;
    }
  },

  async generatePayslipPDF(recordId: string): Promise<Blob> {
    if (this.isLocalMode) {
      const sample = `%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
      return new Blob([sample], { type: 'application/pdf' });
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/payslips/${encodeURIComponent(recordId)}/pdf`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) throw new Error(`Payslip generation failed: ${res.status}`);
      return await res.blob();
    } catch (err) {
      console.error('[apiService] generatePayslipPDF error', err);
      const fallback = 'PDF not available';
      return new Blob([fallback], { type: 'application/pdf' });
    }
  },

  async generateP9Form(employeeId: string, year: number): Promise<Blob> {
    if (this.isLocalMode) {
      const sample = `P9 form for ${employeeId} - ${year}`;
      return new Blob([sample], { type: 'application/pdf' });
    }

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      const res = await fetchWithTimeout(`/api/p9/${encodeURIComponent(employeeId)}?year=${year}`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
      });

      if (!res.ok) throw new Error(`P9 generation failed: ${res.status}`);
      return await res.blob();
    } catch (err) {
      console.error('[apiService] generateP9Form error', err);
      const fallback = `P9 not available for ${employeeId} ${year}`;
      return new Blob([fallback], { type: 'application/pdf' });
    }
  },

  async sharePayslip(email: string, employeeId: string, recordId: string, message: string): Promise<void> {
    if (this.isLocalMode) return;

    try {
      const token = safeStorage.getItem('payroll_token') || '';
      await fetchWithTimeout(`/api/share-payslip`, {
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