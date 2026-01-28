import { TAX_CONSTANTS } from '../constants';
import { PayrollRecord } from '../types';

/**
 * Calculates Kenyan payroll deductions correctly
 * per Income Tax Act (Cap 470) and statutory levies.
 */
export const calculatePayroll = (
  basicSalary: number,
  benefits: number = 0
): Omit<
  PayrollRecord,
  'id' | 'employeeId' | 'month' | 'year' | 'processedAt' | 'payrollRef'
> => {
  /** 1. Gross taxable pay */
  const grossSalary = basicSalary + benefits;

  /** 2. PAYE – calculated on GROSS (not reduced by NSSF) */
  let tax = 0;

  // Band 1: First 24,000 @ 10%
  tax += Math.min(grossSalary, 24000) * 0.10;

  // Band 2: Next 8,333 @ 25%
  tax += Math.min(
    Math.max(grossSalary - 24000, 0),
    8333
  ) * 0.25;

  // Band 3: Next 467,667 @ 30%
  tax += Math.min(
    Math.max(grossSalary - 32333, 0),
    467667
  ) * 0.30;

  // Band 4: Next 300,000 @ 32.5%
  tax += Math.min(
    Math.max(grossSalary - 500000, 0),
    300000
  ) * 0.325;

  // Band 5: Above 800,000 @ 35%
  tax += Math.max(grossSalary - 800000, 0) * 0.35;

  /** 3. Personal Relief (fixed) */
  const personalRelief = TAX_CONSTANTS.PERSONAL_RELIEF; // 2,400
  const paye = Math.max(0, tax - personalRelief);

  /** 4. NSSF – employee contribution (post-tax deduction) */
  let nssf = 0;
  if (grossSalary > 0) {
    const tierI = Math.min(7000 * 0.06, TAX_CONSTANTS.NSSF_TIER_I_MAX);
    const tierIIBand = Math.max(
      Math.min(grossSalary, 36000) - 7000,
      0
    );
    const tierII = Math.min(
      tierIIBand * 0.06,
      TAX_CONSTANTS.NSSF_TIER_II_MAX
    );
    nssf = tierI + tierII;
  }

  /** 5. Statutory levies (on gross) */
  const housingLevy = grossSalary * TAX_CONSTANTS.HOUSING_LEVY_RATE; // 1.5%
  const sha = grossSalary * TAX_CONSTANTS.SHA_RATE; // 2.75%

  /** 6. Net salary */
  const netSalary =
    grossSalary - paye - nssf - housingLevy - sha;

  return {
    grossSalary,
    benefits,
    taxableIncome: grossSalary,
    paye,
    personalRelief,
    nssf,
    housingLevy,
    sha,
    nita: TAX_CONSTANTS.NITA_LEVY,
    netSalary
  };
};
