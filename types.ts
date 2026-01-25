
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
  joinedDate: string;
}

export interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number; // 0-11
  year: number;
  grossSalary: number;
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

export interface PayrollSummary {
  totalGross: number;
  totalNet: number;
  totalPaye: number;
  totalNssf: number;
  totalSha: number;
  totalHousingLevy: number;
  employeeCount: number;
}
