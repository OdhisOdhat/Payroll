
export type UserRole = 'admin' | 'staff' | 'tax';

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
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number; // 0-11
  year: number;
  grossSalary: number;
  benefits: number; // Historical benefits for the specific run
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
