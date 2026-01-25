
export const TAX_CONSTANTS = {
  PERSONAL_RELIEF: 2400,
  INSURANCE_RELIEF_PERCENT: 0.15,
  HOUSING_LEVY_RATE: 0.015,
  SHA_RATE: 0.0275, // 2.75%
  NITA_LEVY: 50, // Per employee per month (employer cost, usually)
  NSSF_TIER_I_MAX: 360,
  NSSF_TIER_II_MAX: 1740,
  PAYE_BRACKETS: [
    { limit: 24000, rate: 0.10 },
    { limit: 8333, rate: 0.25 },
    { limit: 467667, rate: 0.30 },
    { limit: 300000, rate: 0.325 },
    { limit: Infinity, rate: 0.35 }
  ]
};
