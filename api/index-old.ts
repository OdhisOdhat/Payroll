import "dotenv/config";
import express, { Request, Response, NextFunction } from 'express';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Pool, PoolClient } from "pg";
import winston from "winston";

/* =========================================================
   ENVIRONMENT VALIDATION
========================================================= */

const requiredEnv = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME", "JWT_SECRET"];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

/* =========================================================
   LOGGER CONFIGURATION
========================================================= */

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "server.log" }),
  ],
});

/* =========================================================
   DATABASE CONFIGURATION
========================================================= */

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

/* =========================================================
   EXPRESS APP SETUP
========================================================= */

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
}));

app.use(express.json({ limit: "1mb" }));

app.use(morgan("combined", {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

/* =========================================================
   TYPES
========================================================= */

interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePositiveNumber = (value: any): boolean => {
  return typeof value === "number" && value >= 0;
};

const asyncHandler = (fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/* =========================================================
   AUTHENTICATION
========================================================= */

const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; role: string };
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const authorize = (roles: string[]) => 
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", asyncHandler(async (_req: Request, res: Response) => {
  await pool.query("SELECT 1");
  return res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}));

/* =========================================================
   AUTH ROUTES
========================================================= */

app.post("/api/login", asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const result = await pool.query(
    "SELECT id, email, password, role FROM users WHERE email = $1",
    [email]
  );

  if (!result.rows.length) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: "8h" }
  );

  return res.json({ token });
}));

/* =========================================================
   EMPLOYEE ROUTES
========================================================= */

app.get(
  "/api/employees",
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await pool.query(`
      SELECT id, payroll_number, first_name, last_name,
             email, basic_salary, is_active,
             terminated_at
      FROM employees
      ORDER BY last_name ASC, first_name ASC
    `);

    return res.json(result.rows);
  })
);

app.post(
  "/api/employees",
  authenticate,
  authorize(["admin"]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      payrollNumber,
      firstName,
      lastName,
      email,
      basicSalary,
    } = req.body;

    if (!payrollNumber || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!validatePositiveNumber(basicSalary)) {
      return res.status(400).json({ error: "Invalid salary" });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const client: PoolClient = await pool.connect();

    try {
      await client.query("BEGIN");

      const insertEmployee = `
        INSERT INTO employees (
          payroll_number,
          first_name,
          last_name,
          email,
          basic_salary,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,true)
        RETURNING id
      `;

      const employeeResult = await client.query(insertEmployee, [
        payrollNumber,
        firstName,
        lastName,
        email || null,
        basicSalary,
      ]);

      const employeeId = employeeResult.rows[0].id;

      await client.query(
        `INSERT INTO audits(action, employee_id, performed_by)
         VALUES ($1,$2,$3)`,
        ["CREATE_EMPLOYEE", employeeId, req.user!.id]
      );

      await client.query("COMMIT");

      logger.info("Employee created", { employeeId });

      return res.status(201).json({ id: employeeId });

    } catch (error: any) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return res.status(409).json({ error: "Duplicate payroll number" });
      }

      throw error;
    } finally {
      client.release();
    }
  })
);

/* =========================================================
   TERMINATION
========================================================= */

app.patch(
  "/api/employees/:id/terminate",
  authenticate,
  authorize(["admin"]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `UPDATE employees
         SET is_active = false,
             terminated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Employee not found" });
      }

      await client.query(
        `INSERT INTO audits(action, employee_id, performed_by)
         VALUES ($1,$2,$3)`,
        ["TERMINATE_EMPLOYEE", id, req.user!.id]
      );

      await client.query("COMMIT");

      logger.info("Employee terminated", { employeeId: id });

      return res.json({ success: true });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
  });

  return res.status(500).json({
    error: "Internal server error",
  });
});

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

const shutdown = async () => {
  logger.info("Shutting down server...");
  await pool.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* =========================================================
   SERVER START
========================================================= */

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});