import { TAX_CONSTANTS } from '../constants';
import { PayrollRecord } from '../types';

export const calculatePayroll = (basicSalary: number, benefits: number = 0): Omit<PayrollRecord, 'id' | 'employeeId' | 'month' | 'year' | 'processedAt'> => {
  const grossSalary = basicSalary + benefits;

  // 1. NSSF Calculation (Total 6% capped at Tier levels)
  // Tier I: 6% of pensionable earnings up to 7,000 (Max 420)
  // Tier II: 6% of earnings above 7,000 up to 36,000 (Max 1,740)
  let nssf = 0;
  if (grossSalary > 0) {
    const tierI = Math.min(grossSalary * 0.06, TAX_CONSTANTS.NSSF_TIER_I_MAX);
    const tierII = Math.min(Math.max(0, Math.min(grossSalary, 36000) - 7000) * 0.06, TAX_CONSTANTS.NSSF_TIER_II_MAX);
    nssf = tierI + tierII;
  }

  // 2. Taxable Income (NSSF is tax-deductible in Kenya)
  const taxableIncome = Math.max(0, grossSalary - nssf);

  // 3. PAYE Calculation
  let remainingIncome = taxableIncome;
  let payeBeforeRelief = 0;
  
  for (const bracket of TAX_CONSTANTS.PAYE_BRACKETS) {
    const chunk = Math.min(remainingIncome, bracket.limit);
    payeBeforeRelief += chunk * bracket.rate;
    remainingIncome -= chunk;
    if (remainingIncome <= 0) break;
  }

  // 4. Affordable Housing Levy (1.5% of Gross) - Not tax deductible
  const housingLevy = grossSalary * TAX_CONSTANTS.HOUSING_LEVY_RATE;

  // 5. SHA (Social Health Authority - 2.75% of Gross)
  const sha = grossSalary * TAX_CONSTANTS.SHA_RATE;

  // 6. Reliefs
  // Personal Relief (2,400)
  // Insurance Relief (15% of SHA/NHIF contributions)
  const insuranceRelief = sha * TAX_CONSTANTS.INSURANCE_RELIEF_PERCENT;
  const totalRelief = TAX_CONSTANTS.PERSONAL_RELIEF + insuranceRelief;
  
  const paye = Math.max(0, payeBeforeRelief - totalRelief);

  // 7. NITA (Industrial Training Levy - employer cost, but shown for compliance)
  const nita = TAX_CONSTANTS.NITA_LEVY;

  // 8. Net Salary
  // Net = Gross - NSSF - PAYE - Housing Levy - SHA
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