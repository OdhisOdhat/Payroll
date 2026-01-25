
import { Employee, PayrollRecord } from '../types';

// Use localhost for development, but support relative paths if proxied
const API_BASE = 'http://localhost:3001/api';

/**
 * Safe Storage Wrapper to handle environments where localStorage is blocked
 */
const memoryStore: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Storage access denied for key "${key}", falling back to memory.`);
      return memoryStore[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      memoryStore[key] = value;
    }
  }
};

/**
 * Local Store acts as a persistent fallback if the Turso backend is unreachable.
 * This mimics the database schema and uses safeStorage to prevent access errors.
 */
const localStore = {
  getEmployees: (): Employee[] => {
    try {
      return JSON.parse(safeStorage.getItem('payroll_employees') || '[]');
    } catch {
      return [];
    }
  },
  setEmployees: (data: Employee[]) => safeStorage.setItem('payroll_employees', JSON.stringify(data)),
  getPayroll: (): PayrollRecord[] => {
    try {
      return JSON.parse(safeStorage.getItem('payroll_history') || '[]');
    } catch {
      return [];
    }
  },
  setPayroll: (data: PayrollRecord[]) => safeStorage.setItem('payroll_history', JSON.stringify(data)),
};

export const apiService = {
  isLocalMode: false,

  async checkBackend(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/employees`, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
      this.isLocalMode = !res.ok;
      return res.ok;
    } catch (e) {
      this.isLocalMode = true;
      return false;
    }
  },

  async getEmployees(): Promise<Employee[]> {
    if (this.isLocalMode) return localStore.getEmployees();
    try {
      const res = await fetch(`${API_BASE}/employees`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (error) {
      console.warn("Backend unreachable, falling back to local storage.");
      this.isLocalMode = true;
      return localStore.getEmployees();
    }
  },

  async saveEmployee(employee: Employee): Promise<Employee> {
    if (this.isLocalMode) {
      const emps = localStore.getEmployees();
      const updated = [employee, ...emps];
      localStore.setEmployees(updated);
      return employee;
    }
    try {
      const res = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
      });
      if (!res.ok) throw new Error('Failed to save');
      return await res.json();
    } catch (error) {
      this.isLocalMode = true;
      return this.saveEmployee(employee);
    }
  },

  async getPayrollHistory(): Promise<PayrollRecord[]> {
    if (this.isLocalMode) return localStore.getPayroll();
    try {
      const res = await fetch(`${API_BASE}/payroll`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch (error) {
      this.isLocalMode = true;
      return localStore.getPayroll();
    }
  },

  async savePayrollRun(records: PayrollRecord[]): Promise<void> {
    if (this.isLocalMode) {
      const history = localStore.getPayroll();
      localStore.setPayroll([...records, ...history]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch (error) {
      this.isLocalMode = true;
      await this.savePayrollRun(records);
    }
  }
};
