export type UserRole = 'admin' | 'staff' | 'tax' | 'manager'

export interface User {
  id: string;
  email: string;
  role: UserRole;
  employeeId?: string; // Linked employee record for staff
  firstName: string;
  lastName: string;
}

export interface Employee {
  id: string;
  payrollNumber: string; // Unique employee payroll/staff nu
  firstName: string;
  lastName: string;
  email: string;
  kraPin: string;
  nssfNumber: string;
  nhifNumber: string;
  basicSalary: number;
  benefits: number;
  totalLeaveDays: number;
  remainingLeaveDays: number;
  joinedDate: string;

  // === EMPLOYEE DESIGNATION FIELDS (CRITICAL ADDITION) ===
  designation?: string; // PRIMARY: Employee role title (fro
  position?: string;    // BACKEND COMPAT: Maps to designati

  // === Termination Management ===
  isActive: boolean;
  terminatedAt?: string;      // ISO date string
  terminationReason?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payrollRef: string; // e.g. PAY-202501-EMP0047
  month: number; // 0-11 (JavaScript Date months - matches A
  year: number;
  grossSalary: number;
  benefits: number;
  nssf: number;
  taxableIncome: number;
  paye: number;
  personalRelief: number;
  housingLevy: number;
  sha: number;
  nita: number;
  netSalary: number;
  processedAt: string;
}

export interface PayrollAudit {
  id: string;
  performedBy: string;
  userRole: string;
  action: string;
  entityType?: string; // e.g. 'employee', 'payroll'
  entityId?: string;   // Reference to the affected recor
  details: string;
  timestamp: string;
}

export interface BrandSettings {
  entityName: string;   // ✅ OFFICIAL COMPANY NAME FIELD
  logoUrl: string;
  primaryColor: string;
  address: string;
}

export interface PayrollSummary {
  totalGross: number;
  totalNet: number;
  totalPaye: number;
  totalNssf: number;
  totalSha: number;
  totalHousingLevy: number;
  employeeCount: number;
}