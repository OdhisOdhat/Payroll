
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  /**
   * Generates a tax deduction explanation using Gemini.
   * Following the latest @google/genai guidelines, we initialize with process.env.API_KEY.
   */
  async explainDeductions(salary: number, results: any) {
    // Correctly initialize with process.env.API_KEY as the hard requirement.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Explain the payroll deductions for a monthly gross salary of KES ${salary.toLocaleString()}. 
        The calculated values are: PAYE: ${results.paye}, NSSF: ${results.nssf}, SHA: ${results.sha}, Housing Levy: ${results.housingLevy}. 
        Provide a concise, professional explanation of why these amounts are charged based on current Kenyan tax laws (2024). Keep it under 150 words.`,
      });
      // Correctly access the .text property of GenerateContentResponse.
      return response.text;
    } catch (error) {
      console.error("Gemini Explanation Error:", error);
      return "Could not generate AI explanation at this time. Please check your connectivity or configuration.";
    }
  }
}

export const geminiService = new GeminiService();
