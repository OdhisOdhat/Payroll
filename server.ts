
import express, { RequestHandler } from 'express';
import { createClient } from '@libsql/client';
import cors from 'cors';

const app = express();
// Fixed: cast to 'any' to avoid type mismatch with app.use overloads (RequestHandler vs PathParams)
app.use(express.json() as any);
app.use(cors() as any);

// Turso Client Initialization
// Note: In a production environment, these would be in process.env
const client = createClient({
  url: process.env.TURSO_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// GET all employees
app.get('/api/employees', async (req, res) => {
  try {
    const result = await client.execute("SELECT * FROM employees ORDER BY joined_date DESC");
    const employees = result.rows.map(row => ({
      id: row.id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      email: row.email as string,
      kraPin: row.kra_pin as string,
      nssfNumber: row.nssf_number as string,
      nhifNumber: row.nhif_number as string,
      basicSalary: row.basic_salary as number,
      benefits: row.benefits as number,
      joinedDate: row.joined_date as string
    }));
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST new employee
app.post('/api/employees', async (req, res) => {
  const e = req.body;
  try {
    await client.execute({
      sql: `INSERT INTO employees (id, first_name, last_name, email, kra_pin, nssf_number, nhif_number, basic_salary, benefits, joined_date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [e.id, e.firstName, e.lastName, e.email, e.kraPin, e.nssfNumber, e.nhifNumber, e.basicSalary, e.benefits, e.joinedDate]
    });
    res.status(201).json(e);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET payroll history
app.get('/api/payroll', async (req, res) => {
  try {
    const result = await client.execute("SELECT * FROM payroll_records ORDER BY processed_at DESC");
    const records = result.rows.map(row => ({
      id: row.id as string,
      employeeId: row.employee_id as string,
      month: row.month as number,
      year: row.year as number,
      grossSalary: row.gross_salary as number,
      nssf: row.nssf as number,
      taxableIncome: row.taxable_income as number,
      paye: row.paye as number,
      personalRelief: row.personal_relief as number,
      housingLevy: row.housing_levy as number,
      sha: row.sha as number,
      nita: row.nita as number,
      netSalary: row.net_salary as number,
      processedAt: row.processed_at as string
    }));
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST payroll run (batch)
app.post('/api/payroll', async (req, res) => {
  const records = req.body;
  try {
    for (const r of records) {
      await client.execute({
        sql: `INSERT INTO payroll_records (id, employee_id, month, year, gross_salary, nssf, taxable_income, paye, personal_relief, housing_levy, sha, nita, net_salary, processed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [r.id, r.employeeId, r.month, r.year, r.grossSalary, r.nssf, r.taxableIncome, r.paye, r.personalRelief, r.housingLevy, r.sha, r.nita, r.netSalary, r.processedAt]
      });
    }
    res.status(201).json({ message: "Payroll processed successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Payroll Backend running on port ${PORT}`);
});
