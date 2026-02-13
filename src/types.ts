export type UserRole = 'admin' | 'staff' | 'tax' | 'manager';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  firstName: string;
  lastName: string;
}

export interface Employee {
  id: string;
  payrollNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  kraPin?: string;
  nssfNumber?: string;
  nhifNumber?: string;
  basicSalary?: number;
  benefits?: number;
  totalLeaveDays?: number;
  remainingLeaveDays?: number;
  joinedDate?: string;
  designation?: string;
  position?: string;
  isActive?: boolean;
  terminatedAt?: string;
  terminationReason?: string;
  companyName?: string;          // ← Added (camelCase – matches common frontend convention)
  // Alternative if you prefer exact DB match: company_name?: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  firstName?: string;
  lastName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  requestedAt?: string;
  submittedAt?: string;
  type?: string; // e.g. 'Annual', 'Sick'
  days?: number;
  createdAt?: string;
  updatedAt?: string;
  rejectionReason?: string;
  // legacy snake_case
  start_date?: string;
  end_date?: string;
  daysRequested?: number;
}

// Allow legacy snake_case fields and optional timestamps
export interface LeaveRequestRecord extends LeaveRequest {
  start_date?: string;
  end_date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PayrollStatus = 'processing' | 'completed' | 'failed' | 'pending';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeNumber?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossPay?: number;
  netPay?: number;
  paye?: number;
  nssf?: number;
  nhif?: number;
  personalRelief?: number;
  status?: PayrollStatus;
  createdAt?: string;
  // legacy/backwards-compatible fields
  payrollRef?: string;
  month?: number;
  year?: number;
  grossSalary?: number;
  netSalary?: number;
  benefits?: number;
  taxableIncome?: number;
  nita?: number;
  sha?: number;
  housingLevy?: number;
  absentDays?: number;
  lateArrivals?: number;
  processedAt?: string;
}

export interface PayrollAudit {
  id: string;
  performedBy: string;
  userRole: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  timestamp?: string;
}

export interface BrandSettings {
  entityName: string;
  logoUrl?: string;
  primaryColor?: string;
  address?: string;
  companyTagline?: string;
  showTagline?: boolean;
  // legacy/alternate names used across the UI
  companyName?: string;
  showCompanyName?: boolean;
  faviconUrl?: string;
  primaryFont?: string;
  secondaryFont?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export type ColorScheme = 'corporate' | 'modern' | 'minimal';

export interface ColorSchemePreset {
  name: string;
  label: string;
  description?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface LogoUploadResult {
  url: string;
  filename?: string;
}

// Backwards compatibility fields used across the UI
export interface BrandSettings extends Record<string, any> {}

export interface PayrollStats {
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalNhif: number;
  totalNssf: number;
  totalRelief: number;
  totalPaye: number;
  employeeCount: number;
  totalEmployees?: number;
}

export interface PayrollRunParams {
  employeeIds?: string[];
  month: number;
  year: number;
  includeInactive?: boolean;
}

export interface PayrollSummary {
  totalGross: number;
  totalNet: number;
  totalPaye: number;
  totalNssf: number;
  totalSha?: number;
  totalHousingLevy?: number;
  employeeCount: number;
}