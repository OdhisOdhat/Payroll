import { TAX_CONSTANTS } from '../constants';
import { PayrollRecord } from '../src/types';

interface NSSFConfig {
  lowerEarningsLimit: number;
  upperEarningsLimit: number;
}

/**
 * Calculates Kenyan payroll deductions accurately per 2026 rules.
 * - PAYE on taxable income AFTER NSSF + SHIF + AHL deductions.
 * - SHIF: 2.75% of gross (min 300).
 * - AHL: 1.5% of gross (employee portion).
 * - Personal relief: KES 2,400/month.
 * - NSSF: 6% phased limits (configurable for Jan vs Feb 2026 transition).
 * - Assumes resident employee; no extra reliefs (pension, mortgage, insurance).
 */
export const calculatePayroll = (
  basicSalary: number,
  benefits: number = 0,
  options: {
    roundToWhole?: boolean;                   // round final amounts to nearest KES
    nssfConfig?: NSSFConfig;                  // override for Jan 2026 vs Feb+
  } = {}
): Omit<
  PayrollRecord,
  'id' | 'employeeId' | 'month' | 'year' | 'processedAt' | 'payrollRef'
> => {
  const { roundToWhole = true, nssfConfig } = options;

  // ────────────────────────────────────────────────
  // Core calculations – use let only for values we might round later
  // ────────────────────────────────────────────────
  let grossSalary = basicSalary + benefits;

  // 1. NSSF Employee contribution (6% phased)
  const nssfLimits = nssfConfig || {
    lowerEarningsLimit: 9000,     // default to Feb 2026+
    upperEarningsLimit: 108000,
  };

  let nssf = 0;
  if (grossSalary > 0) {
    const pensionablePay = Math.min(grossSalary, nssfLimits.upperEarningsLimit);
    const tierI = Math.min(pensionablePay, nssfLimits.lowerEarningsLimit) * 0.06;
    const tierIIBase = Math.max(pensionablePay - nssfLimits.lowerEarningsLimit, 0);
    const tierII = tierIIBase * 0.06;
    nssf = tierI + tierII;
  }

  // 2. SHIF (Social Health Insurance Fund) – 2.75% of gross, min 300
  let sha = grossSalary * TAX_CONSTANTS.SHA_RATE; // 0.0275
  sha = Math.max(sha, 300);

  // 3. Affordable Housing Levy – 1.5% of gross (employee)
  const housingLevy = grossSalary * TAX_CONSTANTS.HOUSING_LEVY_RATE; // 0.015

  // 4. Taxable income = Gross − (NSSF + SHIF + AHL)
  let taxableIncome = Math.max(0, grossSalary - nssf - sha - housingLevy);

  // 5. PAYE – progressive bands on taxable income
  let grossTax = 0;

  if (taxableIncome > 0) {
    grossTax += Math.min(taxableIncome, 24000) * 0.10;

    if (taxableIncome > 24000) {
      grossTax += Math.min(taxableIncome - 24000, 8333) * 0.25;
    }

    if (taxableIncome > 32333) {
      grossTax += Math.min(taxableIncome - 32333, 467667) * 0.30;
    }

    if (taxableIncome > 500000) {
      grossTax += Math.min(taxableIncome - 500000, 300000) * 0.325;
    }

    if (taxableIncome > 800000) {
      grossTax += (taxableIncome - 800000) * 0.35;
    }
  }

  const personalRelief = TAX_CONSTANTS.PERSONAL_RELIEF; // 2400
  let paye = Math.max(0, grossTax - personalRelief);

  // 6. Net salary (before other voluntary deductions)
  // ────────────────────────────────────────────────
  // Removed NITA_LEVY subtraction since it's not shown in the payslip
  // and was causing the total deductions to be 50 higher than visible sum
  let netSalary = grossSalary - paye - nssf - housingLevy - sha;

  // ────────────────────────────────────────────────
  // Optional rounding – create rounded versions instead of mutating originals
  // ────────────────────────────────────────────────
  if (roundToWhole) {
    grossSalary = Math.round(grossSalary);
    // benefits is input → usually no need to round unless you want to
    // benefits = Math.round(benefits);
    nssf = Math.round(nssf);
    sha = Math.round(sha);
    // housingLevy is exact percentage → usually already integer
    // housingLevy = Math.round(housingLevy);
    taxableIncome = Math.round(taxableIncome);
    grossTax = Math.round(grossTax);
    paye = Math.round(paye);
    netSalary = Math.round(netSalary);
  }

  return {
    grossSalary,
    benefits,
    taxableIncome,
    paye,
    personalRelief,
    nssf,
    housingLevy,
    sha,
    nita: TAX_CONSTANTS.NITA_LEVY,
    netSalary,
  };
};