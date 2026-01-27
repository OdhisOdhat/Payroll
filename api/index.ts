import 'dotenv/config';
import express, { Request, Response } from 'express';
import pg from 'pg';
import cors from 'cors';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
});

const app = express();
app.use(express.json());
app.use(cors());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: !!process.env.POSTGRES_URL_NON_POOLING });
});

app.post('/api/login', (req: Request, res: Response): any => {
  const { email, password } = req.body;
  const userEmail = email?.toLowerCase();

  // 1. ADMIN BYPASS
  if (userEmail === "admin@payrollpro.com" && password === "password123") {
    return res.json({
      id: 'admin-001',
      email: "admin@payrollpro.com",
      role: "admin",
      firstName: "System",
      lastName: "Admin"
    });
  }

  // 2. MANAGER BYPASS
  if (userEmail === "manager@payrollpro.com" && password === "manager123") {
    return res.json({
      id: 'mgr-001',
      email: "manager@payrollpro.com",
      role: "manager",
      firstName: "Operations",
      lastName: "Manager"
    });
  }
  
  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

app.get('/api/employees', async (_req: Request, res: Response): Promise<any> => {
  try {
    const { rows } = await pool.query('SELECT * FROM employees');
    return res.json(rows);
  } catch (err: any) {
    return res.status(200).json([]); 
  }
});

export default app;