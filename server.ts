import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Initialize the database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const app = express();

// Fix: Use any cast to resolve middleware type mismatch with express app.use overloads in TypeScript
app.use(express.json() as any);
app.use(cors() as any);

// Test connection
(async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Successfully connected to PostgreSQL');
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    if (client) client.release();
  }
})();

// ────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings');
    const settings: Record<string, string> = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value',
        [key, value as string]
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ────────────────────────────────────────────────
// Employees
// ────────────────────────────────────────────────
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY joined_date DESC');
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const e = req.body;
    await pool.query(
      `INSERT INTO employees (
        id, first_name, last_name, email, kra_pin, nssf_number, nhif_number,
        basic_salary, benefits, total_leave_days, remaining_leave_days, joined_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        e.id,
        e.firstName,
        e.lastName,
        e.email,
        e.kraPin,
        e.nssfNumber,
        e.nhifNumber,
        e.basicSalary,
        e.benefits,
        e.totalLeaveDays ?? 21,
        e.remainingLeaveDays ?? 21,
        e.joinedDate
      ]
    );
    res.status(201).json(e);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const e = req.body;
    await pool.query(
      `UPDATE employees SET
        first_name = $1, last_name = $2, email = $3, kra_pin = $4,
        nssf_number = $5, nhif_number = $6, basic_salary = $7, benefits = $8,
        total_leave_days = $9, remaining_leave_days = $10
      WHERE id = $11`,
      [
        e.firstName,
        e.lastName,
        e.email,
        e.kraPin,
        e.nssfNumber,
        e.nhifNumber,
        e.basicSalary,
        e.benefits,
        e.totalLeaveDays,
        e.remainingLeaveDays,
        id
      ]
    );
    res.json(e);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ────────────────────────────────────────────────
// Payroll
// ────────────────────────────────────────────────
app.get('/api/payroll', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payroll_records ORDER BY processed_at DESC');
    const records = result.rows.map(row => ({
      ...row,
      employeeId: row.employee_id,
      grossSalary: parseFloat(row.gross_salary),
      netSalary: parseFloat(row.net_salary),
      taxableIncome: parseFloat(row.taxable_income),
      processedAt: row.processed_at
    }));
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payroll', async (req, res) => {
  const client = await pool.connect();
  try {
    const records = req.body;
    await client.query('BEGIN');

    const query = `
      INSERT INTO payroll_records (
        id, employee_id, month, year, gross_salary, benefits, nssf,
        taxable_income, paye, personal_relief, housing_levy, sha, nita,
        net_salary, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;

    for (const r of records) {
      await client.query(query, [
        r.id,
        r.employeeId,
        r.month,
        r.year,
        r.grossSalary,
        r.benefits || 0,
        r.nssf,
        r.taxableIncome,
        r.paye,
        r.personalRelief,
        r.housingLevy,
        r.sha,
        r.nita,
        r.netSalary,
        r.processedAt
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// ────────────────────────────────────────────────
// Leave Requests
// ────────────────────────────────────────────────
app.get('/api/leave-requests', async (req, res) => {
  try {
    const { employeeId } = req.query;
    let result;
    if (employeeId) {
      result = await pool.query(
        'SELECT lr.*, e.first_name, e.last_name FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id WHERE lr.employee_id = $1 ORDER BY lr.requested_at DESC',
        [employeeId]
      );
    } else {
      result = await pool.query(
        'SELECT lr.*, e.first_name, e.last_name FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id ORDER BY lr.requested_at DESC'
      );
    }
    res.json(result.rows.map(row => ({
      ...row,
      employeeId: row.employee_id,
      firstName: row.first_name,
      lastName: row.last_name,
      startDate: row.start_date,
      endDate: row.end_date,
      requestedAt: row.requested_at
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leave-requests', async (req, res) => {
  try {
    const r = req.body;
    await pool.query(
      'INSERT INTO leave_requests (id, employee_id, start_date, end_date, reason, status, requested_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [r.id, r.employeeId, r.startDate, r.endDate, r.reason, r.status, r.requestedAt]
    );
    res.status(201).json(r);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/leave-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, employeeId, daysToSubtract } = req.body;
    await pool.query('UPDATE leave_requests SET status = $1 WHERE id = $2', [status, id]);
    if (status === 'approved' && daysToSubtract > 0) {
      await pool.query('UPDATE employees SET remaining_leave_days = remaining_leave_days - $1 WHERE id = $2', [daysToSubtract, employeeId]);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ────────────────────────────────────────────────
// Audits
// ────────────────────────────────────────────────
app.get('/api/audits', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payroll_audits ORDER BY timestamp DESC');
    res.json(result.rows.map(row => ({
      ...row,
      performedBy: row.performed_by,
      userRole: row.user_role
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audits', async (req, res) => {
  try {
    const a = req.body;
    await pool.query(
      'INSERT INTO payroll_audits (id, performed_by, user_role, action, details, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
      [a.id, a.performedBy, a.userRole, a.action, a.details, a.timestamp]
    );
    res.status(201).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ────────────────────────────────────────────────
// Share Payslip
// ────────────────────────────────────────────────
app.post('/api/share-payslip', async (req, res) => {
  try {
    const { email, employeeId, recordId, message } = req.body;
    console.log(`Payslip shared: Employee ${employeeId} to ${email}. Message: ${message}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PayrollPro Engine active on port ${PORT}`);
});