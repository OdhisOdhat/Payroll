
import { TAX_CONSTANTS } from '../constants';
import { PayrollRecord } from '../types';

export const calculatePayroll = (basicSalary: number, benefits: number = 0): Omit<PayrollRecord, 'id' | 'employeeId' | 'month' | 'year' | 'processedAt'> => {
  const grossSalary = basicSalary + benefits;

  // 1. NSSF Calculation (Total 6% capped at Tier levels)
  // Simplified: Tier I (max 360) + Tier II (max 1740) = 2100 total
  let nssf = 0;
  if (grossSalary > 0) {
    const tierI = Math.min(6000 * 0.06, TAX_CONSTANTS.NSSF_TIER_I_MAX);
    const tierII = Math.min(Math.max(0, grossSalary - 6000) * 0.06, TAX_CONSTANTS.NSSF_TIER_II_MAX);
    nssf = tierI + tierII;
  }

  // 2. Taxable Income
  const taxableIncome = grossSalary - nssf;

  // 3. PAYE Calculation
  let remainingIncome = taxableIncome;
  let payeBeforeRelief = 0;
  
  for (const bracket of TAX_CONSTANTS.PAYE_BRACKETS) {
    const chunk = Math.min(remainingIncome, bracket.limit);
    payeBeforeRelief += chunk * bracket.rate;
    remainingIncome -= chunk;
    if (remainingIncome <= 0) break;
  }

  const paye = Math.max(0, payeBeforeRelief - TAX_CONSTANTS.PERSONAL_RELIEF);

  // 4. Affordable Housing Levy (1.5% of Gross)
  const housingLevy = grossSalary * TAX_CONSTANTS.HOUSING_LEVY_RATE;

  // 5. SHA (Social Health Authority - 2.75% of Gross)
  const sha = grossSalary * TAX_CONSTANTS.SHA_RATE;

  // 6. NITA (Usually Employer cost, but we track it)
  const nita = TAX_CONSTANTS.NITA_LEVY;

  // 7. Net Salary
  const netSalary = grossSalary - nssf - paye - housingLevy - sha;

  return {
    grossSalary,
    benefits,
    nssf,
    taxableIncome,
    paye,
    personalRelief: TAX_CONSTANTS.PERSONAL_RELIEF,
    housingLevy,
    sha,
    nita,
    netSalary
  };
};
