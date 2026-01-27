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

// The underscore (_) tells TypeScript we know the variable isn't used yet
pool.connect((err, _client, release) => {
  if (err) console.error('❌ DB Fail:', err.message);
  else {
    console.log('✅ DB Connected');
    release();
  }
});

app.post('/api/login', (req: Request, res: Response): any => {
  const { email, password } = req.body;
  if (email === "admin@payroll.com" && password === "password123") {
    return res.json({ success: true, user: { role: "admin" }, token: "bypass" });
  }
  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

export default app;