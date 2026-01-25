
export const TAX_CONSTANTS = {
  PERSONAL_RELIEF: 2400,
  INSURANCE_RELIEF_PERCENT: 0.15,
  HOUSING_LEVY_RATE: 0.015, // 1.5% of Gross
  SHA_RATE: 0.0275, // 2.75% of Gross (Social Health Authority)
  NITA_LEVY: 50, // Per employee per month (Employer cost)
  
  // 2024 NSSF Rates (Lower Limit: 7,000, Upper Limit: 36,000)
  NSSF_TIER_I_MAX: 420, // 6% of 7,000
  NSSF_TIER_II_MAX: 1740, // 6% of (36,000 - 7,000)
  
  PAYE_BRACKETS: [
    { limit: 24000, rate: 0.10 },
    { limit: 8333, rate: 0.25 },
    { limit: 467667, rate: 0.30 },
    { limit: 300000, rate: 0.325 },
    { limit: Infinity, rate: 0.35 }
  ]
};
