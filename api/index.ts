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

// FIXED: Using _ underscore to tell TypeScript 'client' is intentionally unused
pool.connect((err, _client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// FIXED: Added return statements to all paths and explicit :any return type
app.post('/api/login', (req: Request, res: Response): any => {
  const { email, password } = req.body;
  
  if (email === "admin@payroll.com" && password === "password123") {
    return res.json({
      success: true,
      user: { id: 0, email, name: "System Admin", role: "admin" },
      token: "dev-token-bypass"
    });
  }
  
  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

// FIXED: Standardized error handling for the employees route
app.get('/api/employees', async (_req: Request, res: Response): Promise<any> => {
  try {
    const { rows } = await pool.query('SELECT * FROM employees');
    return res.json(rows);
  } catch (err: any) {
    console.error('Query Error:', err.message);
    return res.status(500).json({ error: 'Database query failed' });
  }
});

export default app;