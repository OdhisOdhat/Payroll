// Add this line at the top
export const API_URL = 'http://localhost:3001/api';

export const TAX_CONSTANTS = {
  PERSONAL_RELIEF: 2400,
  INSURANCE_RELIEF_PERCENT: 0.15,
  HOUSING_LEVY_RATE: 0.015,
  SHA_RATE: 0.0275, 
  NITA_LEVY: 50,
  
  // 2024 NSSF Rates
  NSSF_TIER_I_MAX: 420,
  NSSF_TIER_II_MAX: 1740,
  
  PAYE_BRACKETS: [
    { limit: 24000, rate: 0.10 },
    { limit: 8333, rate: 0.25 },
    { limit: 467667, rate: 0.30 },
    { limit: 300000, rate: 0.325 },
    { limit: Infinity, rate: 0.35 }
  ]
};