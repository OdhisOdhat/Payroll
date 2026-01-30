
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  /**
   * Generates a tax deduction explanation using Gemini.
   */
  async explainDeductions(salary: number, results: any) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Explain the payroll deductions for a monthly gross salary of KES ${salary.toLocaleString()}. 
        The calculated values are: PAYE: ${results.paye}, NSSF: ${results.nssf}, SHA: ${results.sha}, Housing Levy: ${results.housingLevy}. 
        Provide a concise, professional explanation of why these amounts are charged based on current Kenyan tax laws (2024). Keep it under 150 words.`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Explanation Error:", error);
      return "Could not generate AI explanation at this time.";
    }
  }

  /**
   * Provides personalized tax optimization advice for a Kenyan employee.
   */
  async getTaxOptimizationAdvice(salary: number, benefits: number, results: any) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Using pro for better reasoning
        contents: `Act as a senior Kenyan tax consultant. Analyze this employee's monthly figures:
        Basic Salary: KES ${salary.toLocaleString()}
        Benefits: KES ${benefits.toLocaleString()}
        PAYE Tax: KES ${results.paye.toLocaleString()}
        NSSF: KES ${results.nssf.toLocaleString()}
        
        Provide 3-4 specific, actionable tips for tax optimization or compliance in Kenya (2024). 
        Mention specific instruments like Voluntary Pension contributions, Life Insurance relief, or Home Ownership Savings Plans (HOSP) where applicable. 
        Format as clear bullet points. Keep it professional and strictly Kenyan context. Max 120 words.`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Advice Error:", error);
      return "Unable to retrieve tax optimization insights at this moment.";
    }
  }

  /**
   * Generates a detailed AI breakdown of P9 form components and their tax implications.
   */
  async generateP9Breakdown(employeeName: string, salary: number, benefits: number, results: any) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Act as an expert Kenyan Tax Auditor. Provide a detailed P9 Form breakdown for ${employeeName} based on these monthly figures:
        Gross Salary: KES ${(salary + benefits).toLocaleString()}
        PAYE: KES ${results.paye.toLocaleString()}
        NSSF (Tax Exempt): KES ${results.nssf.toLocaleString()}
        Personal Relief: KES ${results.personalRelief.toLocaleString()}
        SHA: KES ${results.sha.toLocaleString()}
        Housing Levy: KES ${results.housingLevy.toLocaleString()}

        Explain:
        1. How 'Defined Contribution' (NSSF) reduces taxable income.
        2. The impact of the 'Personal Relief' on the final PAYE.
        3. The implications of mandatory levies (SHA & Housing) as non-tax-deductible items.
        4. A brief summary of how this looks on an annual P9 card.
        
        Format as professional technical notes with clear headings. Max 200 words.`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini P9 Breakdown Error:", error);
      return "The AI tax auditor is currently unavailable. Please try again later.";
    }
  }

  /**
   * Drafts a professional email for sharing a payslip.
   */
  async draftShareEmail(employeeName: string, month: string, year: number) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Draft a very brief, highly professional email body to accompany a payslip being sent to ${employeeName} for the period of ${month} ${year}. 
        Mention that the document is confidential and the link provided is secure. Do not include subject line, just the body. Max 60 words.`,
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Drafting Error:", error);
      return `Please find attached your payslip for ${month} ${year}. This is a confidential document.`;
    }
  }
}

export const geminiService = new GeminiService();
