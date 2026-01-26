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
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'payroll_db',
  password: String(process.env.DB_PASSWORD || ''), 
  port: Number(process.env.DB_PORT) || 5432,
});

const app = express();

// --- 2. MIDDLEWARE ---
app.use(express.json());
app.use(cors());

// --- 3. DATABASE CONNECTION TEST ---
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// --- 4. API ROUTES ---
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Admin Bypass Credentials
  if (email === "admin@payroll.com" && password === "password123") {
    return res.json({
      success: true,
      user: { id: 0, email, name: "System Admin", role: "admin" },
      token: "dev-token-bypass"
    });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

// --- 5. UPDATED STATIC & CATCH-ALL LOGIC ---

// Serve the 'dist' folder directly
app.use(express.static(path.join(__dirname, 'dist')));

// The correct way to serve your index.html in Express v5
app.get('/*splat', (req, res) => {
  // If the request is for a specific file (contains a dot) and 
  // express.static missed it, return 404 instead of index.html.
  // This prevents the "MIME type" error (index.html being sent as JS).
  if (req.path.includes('.')) {
    return res.status(404).send('File not found');
  }
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

// --- 6. START SERVER ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 PayrollPro Engine active on port ${PORT}`);
  console.log(`🔗 Access at http://localhost:${PORT}`);
});