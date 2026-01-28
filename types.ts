export type UserRole = 'admin' | 'staff' | 'tax' | 'manager';

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
  payrollNumber: string; // Unique employee payroll/staff number
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
  
  // --- New Onboarding/Termination Fields ---
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
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'withdrawn';
  requestedAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payrollRef: string; // e.g. PAY-202501-EMP0047
  month: number; // 1-12 (aligned with DB schema logic)
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
  entityId?: string;   // Reference to the affected record
  details: string;
  timestamp: string;
}

export interface BrandSettings {
  entityName: string;
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