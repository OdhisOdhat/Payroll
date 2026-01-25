
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const app = express();
app.use(express.json());
app.use(cors());

// Supabase PostgreSQL Connection
// DATABASE_URL should be in format: postgresql://postgres:WuoraPayroll123@db.[PROJ-ID].supabase.co:5432/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const sendEmailNotification = (to: string, subject: string, body: string) => {
  console.log(`[EMAIL NOTIFICATION] To: ${to} | Subject: ${subject}`);
};

app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM settings");
    const settings: Record<string, string> = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/settings', async (req, res) => {
  const settings = req.body; 
  try {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2) 
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value as string]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM employees ORDER BY joined_date DESC");
    const employees = result.rows.map(row => ({
      ...row,
      firstName: row.first_name,
      lastName: row.last_name,
      kraPin: row.kra_pin,
      nssfNumber: row.nssf_number,
      nhifNumber: row.nhif_number,
      basicSalary: parseFloat(row.basic_salary),
      benefits: parseFloat(row.benefits),
      totalLeaveDays: row.total_leave_days,
      remainingLeaveDays: row.remaining_leave_days,
      joinedDate: row.joined_date
    }));
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/employees', async (req, res) => {
  const e = req.body;
  try {
    await pool.query(
      `INSERT INTO employees (id, first_name, last_name, email, kra_pin, nssf_number, nhif_number, basic_salary, benefits, total_leave_days, remaining_leave_days, joined_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [e.id, e.firstName, e.lastName, e.email, e.kraPin, e.nssfNumber, e.nhifNumber, e.basicSalary, e.benefits, e.totalLeaveDays ?? 21, e.remainingLeaveDays ?? 21, e.joinedDate]
    );
    res.status(201).json(e);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const e = req.body;
  try {
    await pool.query(
      `UPDATE employees SET first_name = $1, last_name = $2, email = $3, kra_pin = $4, nssf_number = $5, nhif_number = $6, basic_salary = $7, benefits = $8, total_leave_days = $9, remaining_leave_days = $10 WHERE id = $11`,
      [e.firstName, e.lastName, e.email, e.kraPin, e.nssfNumber, e.nhifNumber, e.basicSalary, e.benefits, e.totalLeaveDays, e.remainingLeaveDays, id]
    );
    res.json(e);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/payroll', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM payroll_records ORDER BY processed_at DESC");
    const records = result.rows.map(row => ({
      ...row,
      employeeId: row.employee_id,
      grossSalary: parseFloat(row.gross_salary),
      netSalary: parseFloat(row.net_salary),
      taxableIncome: parseFloat(row.taxable_income),
      processedAt: row.processed_at
    }));
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/payroll', async (req, res) => {
  const records = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        `INSERT INTO payroll_records (id, employee_id, month, year, gross_salary, benefits, nssf, taxable_income, paye, personal_relief, housing_levy, sha, nita, net_salary, processed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [r.id, r.employeeId, r.month, r.year, r.grossSalary, r.benefits || 0, r.nssf, r.taxableIncome, r.paye, r.personalRelief, r.housingLevy, r.sha, r.nita, r.netSalary, r.processedAt]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
});

app.get('/api/leave-requests', async (req, res) => {
  const { employeeId } = req.query;
  try {
    let sql = `SELECT lr.*, e.first_name, e.last_name FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id ORDER BY lr.requested_at DESC`;
    const args = employeeId ? [employeeId] : [];
    if (employeeId) sql = `SELECT lr.*, e.first_name, e.last_name FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id WHERE lr.employee_id = $1 ORDER BY lr.requested_at DESC`;
    const result = await pool.query(sql