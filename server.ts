import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. DATABASE CONFIGURATION ---
// We use POSTGRES_URL_NON_POOLING as identified from your Vercel Dashboard.
// 'ssl' is required for Supabase cloud connections.
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: {
    rejectUnauthorized: false, 
  }
});

const app = express();

// --- 2. MIDDLEWARE ---
app.use(express.json());
app.use(cors());

// --- 3. DATABASE CONNECTION TEST ---
// In serverless, this will run and log to your Vercel 'Logs' tab during execution.
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully via POSTGRES_URL_NON_POOLING');
    release();
  }
});

// --- 4. API ROUTES ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === "admin@payroll.com" && password === "password123") {
    return res.json({
      success: true,
      user: { id: 0, email, name: "System Admin", role: "admin" },
      token: "dev-token-bypass"
    });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

// Example endpoint to check your Supabase tables
app.get('/api/employees', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM employees');
    res.json(rows);
  } catch (err: any) {
    console.error('Query Error:', err.message);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// --- 5. STATIC ASSETS & SPA ROUTING ---
// Serve frontend files from the 'dist' directory created by Vite
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/*', (req, res) => {
  // Prevent returning index.html for missing images/scripts (avoids MIME errors)
  if (req.path.includes('.')) {
    return res.status(404).send('File not found');
  }
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

// --- 6. EXPORT & START ---
// CRITICAL for Vercel: The app must be exported to be treated as a function.
export default app;

// Only start the server locally. Vercel manages the listening process in production.
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Local dev server active on port ${PORT}`);
  });
}