// Source:
import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { GoogleGenerativeAI, GenerateContentResponse } from "@google/generative-ai";

/* ==========================
   DATABASE SETUP (Postgres)
   ========================== */
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error("❌ Database Connection Error:", err.message);
  } else {
    console.log("✅ Database Connected successfully to:", process.env.DB_NAME);
  }
});

/* ==========================
   FIELD MAPPING HELPERS
   ========================== */
const toDbFormat = (employee: any) => ({
  payroll_number: employee.payrollNumber,
  first_name: employee.firstName,
  last_name: employee.lastName,
  email: employee.email,
  kra_pin: employee.kraPin,
  nssf_number: employee.nssfNumber,
  nhif_number: employee.nhifNumber,
  basic_salary: employee.basicSalary,
  benefits: employee.benefits,
  total_leave_days: employee.totalLeaveDays,
  remaining_leave_days: employee.remainingLeaveDays,
  joined_date: employee.joinedDate,
  designation: employee.designation || employee.position || 'Staff',
  position: employee.position || employee.designation || 'Staff',
  is_active: employee.isActive !== false,
  terminated_at: employee.terminatedAt || null,
  termination_reason: employee.terminationReason || null
});

const toFrontendFormat = (row: any) => ({
  id: row.id,
  payrollNumber: row.payroll_number,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  kraPin: row.kra_pin,
  nssfNumber: row.nssf_number,
  nhifNumber: row.nhif_number,
  basicSalary: parseFloat(row.basic_salary) || 0,
  benefits: parseFloat(row.benefits) || 0,
  totalLeaveDays: parseInt(row.total_leave_days) || 21,
  remainingLeaveDays: parseInt(row.remaining_leave_days) || 21,
  joinedDate: row.joined_date,
  designation: row.designation || row.position || 'Staff',
  position: row.position || row.designation || 'Staff',
  isActive: row.is_active,
  terminatedAt: row.terminated_at,
  terminationReason: row.termination_reason
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    features: ["Employee Designation", "Company Name (Branding)"]
  });
});

/* ==========================
   EMPLOYEE ENDPOINTS
   ========================== */
app.get("/api/employees", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM employees ORDER BY last_name ASC, first_name ASC
    `);
    res.status(200).json(result.rows.map(toFrontendFormat));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

app.post("/api/employees", async (req, res) => {
  const { payrollNumber, firstName, lastName, basicSalary } = req.body;
  if (!firstName || !lastName || !payrollNumber || !basicSalary) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const dbFields = toDbFormat(req.body);
    const query = `INSERT INTO employees (...) VALUES ($1, ...) RETURNING *;`;
    const values = [dbFields.payroll_number, dbFields.first_name, dbFields.last_name, dbFields.email, dbFields.kra_pin, dbFields.nssf_number, dbFields.nhif_number, dbFields.basic_salary, dbFields.benefits, dbFields.total_leave_days || 21, dbFields.remaining_leave_days || 21, dbFields.joined_date || new Date().toISOString(), dbFields.designation, dbFields.position, dbFields.is_active];
    const result = await pool.query(query, values);
    res.status(201).json(toFrontendFormat(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save employee" });
  }
});

app.put("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const dbFields = toDbFormat(req.body);
    const query = `UPDATE employees SET ... WHERE id = $18 RETURNING *;`;
    const values = [dbFields.payroll_number, dbFields.first_name, dbFields.last_name, dbFields.email, dbFields.kra_pin, dbFields.nssf_number, dbFields.nhif_number, dbFields.basic_salary, dbFields.benefits, dbFields.total_leave_days, dbFields.remaining_leave_days, dbFields.joined_date, dbFields.designation, dbFields.position, dbFields.is_active, dbFields.terminated_at, dbFields.termination_reason, id];
    const result = await pool.query(query, values);
    res.status(200).json(toFrontendFormat(result.rows[0]));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update employee" });
  }
});

app.patch("/api/employees/:id/terminate", async (req, res) => {
  const { id } = req.params;
  const { terminationReason } = req.body;
  try {
    const query = `UPDATE employees SET is_active = false, terminated_at = NOW(), termination_reason = $1 WHERE id = $2 RETURNING *;`;
    const result = await pool.query(query, [terminationReason, id]);
    res.status(200).json({ success: true, employee: toFrontendFormat(result.rows[0]) });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to terminate employee" });
  }
});

/* ==========================
   BRAND SETTINGS
   ========================== */
app.get("/api/settings", async (_req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM brand_settings LIMIT 1`);
    if (result.rows.length === 0) {
      return res.status(200).json({ entityName: "PayrollPro Kenya", logoUrl: "", primaryColor: "#2563eb", address: "123 Nairobi, Kenya" });
    }
    res.status(200).json({ entityName: row.entity_name, logoUrl: row.logo_url, primaryColor: row.primary_color, address: row.address });
  } catch (error: any) {
    res.status(200).json({ entityName: "PayrollPro Kenya" });
  }
});

app.post("/api/settings", async (req, res) => {
  const { entityName, logoUrl, primaryColor, address } = req.body;
  try {
    const query = `INSERT INTO brand_settings ... ON CONFLICT (id) DO UPDATE SET ... RETURNING *;`;
    const result = await pool.query(query, [entityName.trim(), logoUrl || "", primaryColor || "#2563eb", address || ""]);
    res.status(200).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

/* ==========================
   GEMINI SERVICE
   ========================== */
export class GeminiService {
  async explainDeductions(salary: number, results: any) {
    const ai = new GoogleGenerativeAI(process.env.API_KEY!);
    try {
      const response = await ai.getGenerativeModel({ model: 'gemini-3-flash-preview' }).generateContent(`Explain deductions...`);
      return response.response.text();
    } catch (error) { return "Error explaining deductions"; }
  }

  async getTaxOptimizationAdvice(salary: number, benefits: number) {
    const ai = new GoogleGenerativeAI(process.env.API_KEY!);
    try {
      const response = await ai.getGenerativeModel({ model: 'gemini-3-pro-preview' }).generateContent(`Tax consultant advice...`);
      return response.response.text();
    } catch (error) { return "Error retrieving tax advice"; }
  }

  async generateP9Breakdown(employeeName: string, salary: number) {
    const ai = new GoogleGenerativeAI(process.env.API_KEY!);
    try {
      const response = await ai.getGenerativeModel({ model: 'gemini-3-pro-preview' }).generateContent(`Kenyan Tax Auditor...`);
      return response.response.text();
    } catch (error) { return "AI tax auditor unavailable"; }
  }

  async draftShareEmail(employeeName: string, month: string) {
    const ai = new GoogleGenerativeAI(process.env.API_KEY!);
    try {
      const response = await ai.getGenerativeModel({ model: 'gemini-3-flash-preview' }).generateContent(`Draft professional email...`);
      return response.response.text();
    } catch (error) { return "Drafting error"; }
  }

  async draftExitEmail(employeeName: string, reason: string) {
    const ai = new GoogleGenerativeAI(process.env.API_KEY!);
    try {
      const response = await ai.getGenerativeModel({ model: 'gemini-3-flash-preview' }).generateContent(`Draft neutral offboarding email...`);
      return response.response.text();
    } catch (error) { return `Offboarding notice for ${employeeName}`; }
  }
}

export const geminiService = new GeminiService();

/* ==========================
   MINIMAL ENDPOINT STUBS
   ========================== */
app.get("/api/payroll", (_req, res) => res.json([]));
app.post("/api/payroll", (_req, res) => res.status(201).json({}));
app.get("/api/audits", (_req, res) => res.json([]));
app.get("/api/leave-requests", (_req, res) => res.json([]));

/* ==========================
   START SERVER
   ========================== */
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});