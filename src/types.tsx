// src/types.ts
/**
 * =====================================================
 * PAYROLLPRO KENYA - TYPE DEFINITIONS
 * =====================================================
 * Comprehensive type system for payroll management application
 * =====================================================
 */

// =====================================================
// AUTHENTICATION & USER TYPES
// =====================================================

export type UserRole = 'admin' | 'manager' | 'staff' | 'tax';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: string; // Links to employee record for staff users
  createdAt: string; // ISO date
  lastLogin?: string; // ISO date
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// =====================================================
// EMPLOYEE TYPES
// =====================================================

export interface Employee {
  id: string;
  payrollNumber: string; // Unique employee identifier (e.g., EMP-001)
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string; // Job title/role
  position?: string; // Alternative to designation
  kraPin: string; // Kenya Revenue Authority PIN
  nssfNumber: string; // National Social Security Fund number
  nhifNumber: string; // National Hospital Insurance Fund number
  basicSalary: number; // Monthly base salary in KES
  benefits?: number; // Allowances and other benefits
  totalLeaveDays: number; // Annual leave entitlement
  remainingLeaveDays: number; // Available leave balance
  joinedDate: string; // ISO date
  isActive: boolean; // Employment status
  terminatedAt?: string; // ISO date (if terminated)
  terminationReason?: string;
  department?: string;
  bankAccount?: string;
  bankName?: string;
  // Computed/derived fields
  name?: string; // `${firstName} ${lastName}`
  salary?: number; // Alias for basicSalary
  [key: string]: any; // For flexibility with API responses
}

// =====================================================
// PAYROLL TYPES
// =====================================================

export type PayrollStatus = 'completed' | 'processing' | 'failed';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string; // Denormalized for display
  employeeNumber: string; // Payroll number
  payPeriodStart: string; // ISO date (start of pay period)
  payPeriodEnd: string; // ISO date (end of pay period)
  // Earnings
  basicSalary: number;
  allowances: number; // Housing, transport, etc.
  overtime?: number;
  bonus?: number;
  commission?: number;
  grossPay: number; // Sum of all earnings
  // Deductions
  taxableIncome: number;
  paye: number; // Pay As You Earn tax
  personalRelief: number; // Tax relief
  nhif: number; // NHIF contribution
  nssf: number; // NSSF contribution (employee portion)
  helb?: number; // Higher Education Loans Board
  housingLevy?: number; // Affordable Housing Levy
  pension?: number; // Private pension scheme
  otherDeductions?: number;
  advance?: number; // Salary advance
  loanRepayment?: number;
  netPay: number; // Gross pay minus all deductions
  // Employer contributions
  employerNssf: number;
  employerNhif: number;
  // Metadata
  status: PayrollStatus;
  absentDays?: number; // Days absent without pay
  lateArrivals?: number; // Number of late arrivals
  createdAt: string; // ISO date
  updatedAt?: string; // ISO date
  processedBy?: string; // User ID who processed payroll
  notes?: string;
}

export interface PayrollStats {
  totalGross: number; // Total gross payroll for current period
  totalNet: number; // Total net payroll for current period
  totalTax: number; // Total PAYE collected
  totalNhif: number; // Total NHIF contributions
  totalNssf: number; // Total NSSF contributions
  totalRelief: number; // Total personal relief applied
  totalPaye: number; // Alias for totalTax
  employeeCount: number; // Number of employees processed
}

export interface PayrollRunParams {
  month: number; // 0-indexed (0 = January)
  year: number;
  employeeIds?: string[]; // Optional - if omitted, runs for all active employees
}

// =====================================================
// LEAVE MANAGEMENT TYPES
// =====================================================

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveType = 
  | 'Annual' 
  | 'Sick' 
  | 'Maternity' 
  | 'Paternity' 
  | 'Compassionate' 
  | 'Study' 
  | 'Unpaid';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  days: number; // Calculated duration
  type: LeaveType;
  reason: string; // Justification for leave
  status: LeaveStatus;
  submittedAt: string; // ISO date
  approvedAt?: string; // ISO date
  rejectedAt?: string; // ISO date
  cancelledAt?: string; // ISO date
  rejectionReason?: string; // If rejected
  approvedBy?: string; // User ID who approved
  notes?: string;
}

// =====================================================
// BRAND SETTINGS TYPES
// =====================================================

export type ColorScheme = 
  | 'corporate'      // Professional blue/gray
  | 'modern'         // Clean minimal
  | 'vibrant'        // Bold colors
  | 'minimalist'     // Monochrome
  | 'custom';        // User-defined

export interface BrandSettings {
  companyName: string; // Display name (e.g., "PayrollPro Kenya")
  companyTagline: string; // Short description
  primaryColor: string; // Main brand color (hex, e.g., "#2563eb")
  secondaryColor: string; // Dark accent color (hex)
  accentColor: string; // Highlight color (hex)
  logoUrl: string; // CDN URL to logo image
  faviconUrl: string; // URL to favicon
  primaryFont: string; // CSS font stack (e.g., "Inter, sans-serif")
  secondaryFont: string; // CSS font stack
  showCompanyName: boolean; // Show in sidebar/header
  showTagline: boolean; // Show tagline in UI
  colorScheme: ColorScheme; // Active preset scheme
  entityName?: string; // Legal entity name (for documents)
  lastUpdated: string; // ISO timestamp
}

export interface ColorSchemePreset {
  name: ColorScheme;
  label: string; // Display name (e.g., "Corporate Professional")
  description: string; // Short description
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  previewImage?: string; // Optional preview image URL
}

export interface LogoUploadResult {
  url: string; // CDN URL of uploaded logo
  fileName: string; // Original file name
  size: number; // File size in bytes
  mimeType: string; // MIME type (e.g., "image/png")
  uploadedAt: string; // ISO timestamp
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string; // ISO timestamp
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export type ISODateString = string; // Format: "YYYY-MM-DDTHH:mm:ss.sssZ"

export interface AuditLog {
  id: string;
  userId: string;
  action: string; // e.g., "EMPLOYEE_CREATED", "PAYROLL_RUN"
  resourceType: string; // e.g., "employee", "payroll"
  resourceId?: string;
  changes?: Record<string, any>; // Before/after values
  ipAddress?: string;
  userAgent?: string;
  timestamp: string; // ISO date
}

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO date
  actionUrl?: string; // URL to navigate on click
}

// =====================================================
// CALCULATION TYPES (for utils/calculations.ts)
// =====================================================

export interface TaxCalculationResult {
  taxableIncome: number;
  paye: number;
  personalRelief: number;
  netTax: number;
  nhif: number;
  nssf: number;
  housingLevy: number;
  helb: number;
  netPay: number;
}

export interface KenyaTaxBrackets {
  [key: number]: {
    rate: number; // Percentage as decimal (e.g., 0.1 for 10%)
    relief?: number; // Personal relief amount
  };
}

// =====================================================
// EXPORT TYPES
// =====================================================

export type ExportFormat = 'csv' | 'pdf' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
  fileName?: string;
  filters?: Record<string, any>;
}

// =====================================================
// ERROR TYPES
// =====================================================

export class AppError extends Error {
  constructor(
    public message: string,
    public code?: string,
    public details?: any,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// =====================================================
// CONTEXT TYPES (for React Context)
// =====================================================

export interface ApiContextType {
  baseUrl: string;
  timeout: number;
  isAuthenticated: boolean;
  setAuthToken: (token: string | null) => void;
  clearAuth: () => void;
}

// =====================================================
// FILE UPLOAD TYPES
// =====================================================

export interface FileUploadConfig {
  maxSizeMB: number; // Maximum file size in MB
  allowedTypes: string[]; // MIME types (e.g., ['image/png', 'image/jpeg'])
  maxFiles?: number; // Maximum number of files
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number; // bytes
  type: string; // MIME type
  url: string; // CDN URL
  uploadedAt: string; // ISO date
  uploaderId: string;
}

// =====================================================
// KENYA-SPECIFIC CONSTANTS
// =====================================================

/**
 * Kenya statutory contribution rates and thresholds (2024)
 * Source: KRA, NSSF, NHIF official guidelines
 */
export const KENYA_STATUTORY = {
  // NSSF (National Social Security Fund)
  NSSF: {
    tier1: {
      lowerLimit: 0,
      upperLimit: 7000,
      employeeRate: 0.06,
      employerRate: 0.06,
    },
    tier2: {
      lowerLimit: 7001,
      upperLimit: 36000,
      employeeRate: 0.06,
      employerRate: 0.06,
    },
    maxContribution: 2160, // 6% of 36,000
  },
  // NHIF (National Hospital Insurance Fund)
  NHIF: {
    contributionTable: [
      { lower: 0, upper: 5999, employee: 150 },
      { lower: 6000, upper: 7999, employee: 300 },
      { lower: 8000, upper: 11999, employee: 400 },
      { lower: 12000, upper: 14999, employee: 500 },
      { lower: 15000, upper: 19999, employee: 600 },
      { lower: 20000, upper: 24999, employee: 750 },
      { lower: 25000, upper: 29999, employee: 850 },
      { lower: 30000, upper: 34999, employee: 900 },
      { lower: 35000, upper: 39999, employee: 950 },
      { lower: 40000, upper: 44999, employee: 1000 },
      { lower: 45000, upper: 49999, employee: 1100 },
      { lower: 50000, upper: 59999, employee: 1200 },
      { lower: 60000, upper: 69999, employee: 1300 },
      { lower: 70000, upper: 79999, employee: 1400 },
      { lower: 80000, upper: 89999, employee: 1500 },
      { lower: 90000, upper: 99999, employee: 1600 },
      { lower: 100000, upper: Infinity, employee: 1700 },
    ],
    employerContribution: 0, // Employer doesn't contribute to NHIF
  },
  // PAYE (Pay As You Earn) Tax Brackets
  PAYE: {
    brackets: [
      { lower: 0, upper: 24000, rate: 0.10 },
      { lower: 24001, upper: 32333, rate: 0.25 },
      { lower: 32334, upper: 500000, rate: 0.30 },
      { lower: 500001, upper: Infinity, rate: 0.35 },
    ],
    personalRelief: 2400, // Monthly relief amount (KES)
    insuranceRelief: 0.15, // 15% of insurance premiums (max 5,000)
  },
  // Affordable Housing Levy (AHL)
  HOUSING_LEVY: {
    rate: 0.015, // 1.5% of gross salary
    employerRate: 0.015, // 1.5% employer contribution
    threshold: 0, // No threshold - applies to all
  },
  // HELB (Higher Education Loans Board)
  HELB: {
    rate: 0.20, // 20% of amount above threshold
    threshold: 25000, // Monthly salary threshold (KES)
  },
  // Leave Entitlements
  LEAVE: {
    annualDays: 21, // Statutory annual leave days
    sickDays: 30, // Full pay sick leave days per year
    maternityDays: 98, // Maternity leave days
    paternityDays: 14, // Paternity leave days
  },
} as const;

// =====================================================
// TYPE GUARDS
// =====================================================

export function isEmployee(data: any): data is Employee {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.payrollNumber === 'string' &&
    typeof data.firstName === 'string' &&
    typeof data.lastName === 'string' &&
    typeof data.email === 'string' &&
    typeof data.kraPin === 'string' &&
    typeof data.basicSalary === 'number'
  );
}

export function isPayrollRecord(data: any): data is PayrollRecord {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.employeeId === 'string' &&
    typeof data.grossPay === 'number' &&
    typeof data.netPay === 'number' &&
    typeof data.paye === 'number'
  );
}

export function isLeaveRequest(data: any): data is LeaveRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    typeof data.employeeId === 'string' &&
    typeof data.startDate === 'string' &&
    typeof data.endDate === 'string' &&
    typeof data.status === 'string'
  );
}

// =====================================================
// EXPORT ALL TYPES
// =====================================================

export default {
  // Re-export for convenience
  UserRole,
  PayrollStatus,
  LeaveStatus,
  LeaveType,
  ColorScheme,
  ExportFormat,
};