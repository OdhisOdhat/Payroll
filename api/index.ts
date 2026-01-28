// server.ts (or index.ts)
import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import pg from 'pg';
import cors from 'cors';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : false,
  max: 20,                    // keep connection pool under control
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const app = express();

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: !!process.env.POSTGRES_URL_NON_POOLING,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Error handler (basic)
const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

// ────────────────────────────────────────────────
// Auth – temporary hardcoded bypass (for dev only)
// In production: replace with proper JWT / session / OAuth
// ────────────────────────────────────────────────
app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const userEmail = email.toLowerCase().trim();

    // === ADMIN BYPASS (development only) ===
    if (userEmail === 'admin@payrollpro.com' && password === 'password123') {
      return res.json({
        success: true,
        user: {
          id: 'admin-001',
          email: 'admin@payrollpro.com',
          role: 'admin',
          firstName: 'System',
          lastName: 'Admin',
          // token: '...' ← add JWT in real implementation
        }
      });
    }

    // === MANAGER BYPASS (development only) ===
    if (userEmail === 'manager@payrollpro.com' && password === 'manager123') {
      return res.json({
        success: true,
        user: {
          id: 'mgr-001',
          email: 'manager@payrollpro.com',
          role: 'manager',
          firstName: 'Operations',
          lastName: 'Manager',
          // token: '...' ← add JWT in real implementation
        }
      });
    }

    // Real DB login would go here (bcrypt + users table)
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ────────────────────────────────────────────────
// Employees – basic listing
// ────────────────────────────────────────────────
app.get('/api/employees', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        payroll_number,
        first_name,
        last_name,
        email,
        kra_pin,
        nssf_number,
        nhif_number,
        basic_salary,
        benefits,
        joined_date,
        created_at,
        updated_at
      FROM employees
      ORDER BY last_name, first_name
    `);

    return res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    console.error('Error fetching employees:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Add more protected routes later (with middleware)
// Example structure:
// app.get('/api/payroll/:year/:month', authenticate, authorize('manager'), ...)


// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} | Env: ${process.env.NODE_ENV || 'development'}`);
});

export default app;