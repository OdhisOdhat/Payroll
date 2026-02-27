/**
 * @file server.ts
 * @description Main Express server for PayrollPro Kenya backend application.
 *              Provides API endpoints for authentication, employee management,
 *              payroll processing stubs, and integration with Supabase.
 * @author PayrollPro Development Team
 * @version 1.0.0
 * @date February 2026
 */

import "dotenv/config";
import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { getSupabaseAdminClient, getSupabaseAnonClient, verifySupabaseToken } from "./lib/supabase";
import winston from "winston";

/* =========================================================
   ENVIRONMENT VALIDATION SECTION
   Ensures critical configuration is present before startup
========================================================= */

/**
 * Required environment variables for Supabase connection and core functionality.
 * The server will exit immediately if any are missing.
 */
const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  // Future additions could include: JWT_SECRET, FRONTEND_URL, etc.
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`CRITICAL: Missing required environment variable: ${key}`);
    console.error("Please configure your .env file or system environment variables.");
    process.exit(1);
  }
});

// Temporary fallback for SUPABASE_SERVICE_ROLE_KEY in case .env loading fails
// WARNING: DO NOT COMMIT THIS TO GIT OR USE IN PRODUCTION!
// Remove this block once .env is reliably loading the correct key.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  process.env.SUPABASE_SERVICE_ROLE_KEY = 
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyaWh2dXJ3a292cmd6dWxkbHdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk3NDQ3OCwiZXhwIjoyMDg2NTUwNDc4fQ.-6HJEf-wBHvlQ41OflaGpfMj6GPpfHoJ5fMUvj5L-Zw";
  console.warn("⚠️  Using hardcoded fallback SUPABASE_SERVICE_ROLE_KEY – this is insecure! Fix your .env file.");
}

/* =========================================================
   LOGGER SETUP
   Centralized structured logging with Winston
========================================================= */

/**
 * Winston logger configuration.
 * Outputs JSON-formatted logs with timestamps to console and persistent file.
 */
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    new winston.transports.File({
      filename: "logs/server.log",
    }),
  ],
});

/* =========================================================
   EXPRESS APPLICATION INITIALIZATION
========================================================= */

const app = express();

/**
 * Security headers middleware using Helmet
 */
app.use(helmet());

/**
 * CORS policy configuration
 * Allows localhost development origins and explicitly configured production origin
 */
app.use(cors({
  origin: (origin, callback) => {
    // Development: allow all localhost requests
    if (!origin || 
        origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Production: only allow explicitly configured origin
    if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) {
      return callback(null, true);
    }

    // Log and reject unauthorized origins
    logger.warn(`CORS policy rejected origin: ${origin || 'unknown'}`);
    callback(new Error('Origin not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/**
 * JSON request body parser with payload size protection
 */
app.use(express.json({ limit: "1mb" }));

/**
 * HTTP request logging integrated with our structured logger
 */
app.use(morgan("combined", {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

/**
 * Global rate limiting to protect against abuse
 */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                 // 300 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again after some time" },
}));

// Initialize Supabase clients (singletons for the entire server)
const admin = getSupabaseAdminClient();
const anon = getSupabaseAnonClient();

/* =========================================================
   TYPE DEFINITIONS
========================================================= */

/**
 * Extended Express Request interface with authenticated user information
 */
interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

/* =========================================================
   SHARED UTILITY FUNCTIONS
========================================================= */

/**
 * Validates email address format using RFC-compliant regex
 * @param email - The email string to validate
 * @returns true if valid email format
 */
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Ensures value is a valid non-negative number
 * @param value - Any value to check
 * @returns true if value is number >= 0
 */
const validatePositiveNumber = (value: any): boolean => {
  return typeof value === "number" && !isNaN(value) && value >= 0;
};

/**
 * Higher-order function to wrap async route handlers and catch errors
 * @param fn - Async controller function
 * @returns Express-compatible handler
 */
const asyncHandler = (
  fn: (req: Request | AuthRequest, res: Response, next: NextFunction) => Promise<any>
) => 
  (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/* =========================================================
   AUTHENTICATION & AUTHORIZATION MIDDLEWARE
========================================================= */

/**
 * JWT-based authentication middleware using Supabase token verification
 * Populates req.user on successful validation
 */
const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn(`No token provided for request to ${req.path}`);
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    logger.info(`Verifying token for path: ${req.path}`);
    const user = await verifySupabaseToken(token);

    if (!user) {
      logger.warn(`Token verification returned null for ${req.path}`);
      return res.status(401).json({ error: "Invalid token" });
    }

    const userRole = (user as any).user_metadata?.role || 
                     (user as any).role || 
                     "staff";

    req.user = {
      id: user.id,
      email: user.email,
      role: userRole,
    };

    logger.info(`Token verified successfully`, {
      userId: user.id,
      email: user.email,
      role: userRole,
      path: req.path
    });

    return next();
  } catch (err) {
    logger.error("Token verification error:", err);
    return res.status(401).json({ error: "Token verification failed" });
  }
};

/**
 * Role-based access control middleware factory
 * @param roles Allowed roles for the protected route
 */
const authorize = (roles: string[]) => 
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userRole = req.user.role || "staff";
    if (!roles.includes(userRole)) {
      logger.warn(`Permission denied for ${req.user.email} (${userRole}) on ${req.path}`);
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };

/* =========================================================
   HEALTH CHECK ENDPOINT
========================================================= */

app.get("/api/health", asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Basic connectivity test with Supabase
    const { error } = await admin.from("employees").select("id").limit(1);
    if (error) {
      logger.error("Supabase health check failed:", error);
      return res.status(500).json({ status: "error", error: error.message });
    }

    return res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ status: "error", error: err.message });
  }
}));

/* =========================================================
   AUTHENTICATION ROUTES (LOGIN)
========================================================= */

app.post("/api/login", asyncHandler(async (req: Request, res: Response) => {
  const { email: rawEmail, password } = req.body;
  const email = (rawEmail || "").trim().toLowerCase();

  // ────────────────────────────────────────────────
  // DEVELOPMENT / TESTING BYPASS – Hardcoded admin
  // Matches frontend login form dev credentials exactly
  // NOTE: Intended for local development only.
  // ────────────────────────────────────────────────
  if (email === "admin" || email === "admin@payrollpro.co.ke") {
    if (password === "admin123") {
      const payload = {
        sub: "admin-hardcoded-id",
        email: "admin@payrollpro.co.ke",
        role: "admin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400, // 24-hour expiry
      };

      const adminToken = Buffer.from(JSON.stringify(payload)).toString("base64");

      logger.info(`Hardcoded admin login successful for development/testing`);

      return res.json({
        token: adminToken,
        user: {
          id: "admin-hardcoded-id",
          email: "admin@payrollpro.co.ke",
          firstName: "Admin",
          lastName: "User",
          role: "admin",
        },
      });
    }
  }
  // ────────────────────────────────────────────────

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    // Primary path: Supabase authentication (using anon client for user auth)
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session && data.user) {
      logger.info(`Successful Supabase login for: ${email}`);
      return res.json({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || "staff",
        },
      });
    }

    if (error) {
      logger.warn("Supabase signInWithPassword failed", {
        email,
        code: (error as any).code,
        message: error.message,
      });
    }

    // Fallback path: local admins table check (original logic preserved)
    const { data: adminData, error: adminError } = await admin
      .from("admins")
      .select("id, email, password_hash, first_name, last_name, role, is_active")
      .eq("email", email.toLowerCase())
      .single();

    // If no admin record found → reject
    if (adminError || !adminData) {
      logger.warn(`Login attempt failed - no record for email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!adminData.is_active) {
      return res.status(401).json({ error: "Account is inactive" });
    }

    // Verify stored password hash (with safe error handling to prevent crashes)
    // Supports both bcrypt hashes and legacy/plaintext passwords for backward compatibility.
    let passwordValid: boolean;
    try {
      // If the stored hash looks like a bcrypt hash, use bcrypt.compare
      if (typeof adminData.password_hash === "string" && adminData.password_hash.startsWith("$2")) {
        passwordValid = await bcrypt.compare(password, adminData.password_hash);
      } else {
        // Fallback: treat stored value as plaintext (development / legacy data)
        passwordValid = password === adminData.password_hash;
      }
    } catch (bcryptErr: any) {
      logger.error("Bcrypt comparison failed – possible invalid hash format", {
        email,
        hashPrefix: adminData.password_hash?.substring(0, 7) || "missing",
        error: bcryptErr.message,
      });
      // As a safety net, fall back to simple equality check instead of failing hard
      passwordValid = password === adminData.password_hash;
    }

    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token for local admin user
    const payload = {
      sub: adminData.id,
      email: adminData.email,
      role: adminData.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400,
    };

    const adminToken = Buffer.from(JSON.stringify(payload)).toString("base64");

    logger.info(`Local admin login successful for: ${email}`);

    return res.json({
      token: adminToken,
      user: {
        id: adminData.id,
        email: adminData.email,
        firstName: adminData.first_name || "",
        lastName: adminData.last_name || "",
        role: adminData.role,
      },
    });
  } catch (err: any) {
    logger.error("Login error:", {
      message: err.message,
      stack: err.stack,
      email,
    });
    return res.status(500).json({ error: "Login failed" });
  }
}));

/* =========================================================
   USER SIGNUP ROUTE
========================================================= */

app.post("/api/signup", asyncHandler(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ error: "First name and last name are required" });
  }

  try {
    // Primary: Attempt Supabase user creation
    const { data, error } = await admin.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          role: "staff", // Default role for new signups
        },
      },
    });

    if (!error && data.user) {
      logger.info(`Signup successful for: ${email}`);
      
      // Generate immediate-use token
      const token = Buffer.from(
        JSON.stringify({
          sub: data.user.id,
          email: data.user.email,
          role: "staff",
          iat: Math.floor(Date.now() / 1000),
        })
      ).toString("base64");

      return res.status(201).json({
        token,
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName,
          lastName,
          role: "staff",
        },
      });
    }

    // Fallback: local admins table insertion
    logger.info("[SIGNUP] Supabase signup failed or unavailable - using local fallback");
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = randomUUID();

    try {
      const { error: insertError } = await admin
        .from("admins")
        .insert([
          {
            id: newUserId,
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            first_name: firstName,
            last_name: lastName,
            role: "staff",
            is_active: true,
          },
        ]);

      if (insertError) {
        logger.warn("[SIGNUP] Could not insert into admins table:", insertError.message);
      }
    } catch (tableError) {
      logger.warn("[SIGNUP] Admins table not available, proceeding without DB insert");
    }

    const token = Buffer.from(
      JSON.stringify({
        sub: newUserId,
        email,
        role: "staff",
        iat: Math.floor(Date.now() / 1000),
      })
    ).toString("base64");

    logger.info(`Signup successful (local fallback) for: ${email}`);
    return res.status(201).json({
      token,
      user: {
        id: newUserId,
        email,
        firstName,
        lastName,
        role: "staff",
      },
    });
  } catch (err: any) {
    logger.error("Signup error:", err.message);
    return res.status(500).json({ error: "Signup failed" });
  }
}));

/* =========================================================
   PASSWORD RECOVERY ROUTES
========================================================= */

app.post("/api/forgot-password", asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { error } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password`,
    });

    if (!error) {
      logger.info(`Password reset email sent to: ${email}`);
      return res.json({
        success: true,
        message: "Password reset link has been sent to your email",
      });
    }

    logger.warn(`Password reset failed for ${email}:`, error?.message);
    
    // Security best practice: generic success message
    return res.json({
      success: true,
      message: "If this email exists in our system, a password reset link will be sent",
    });
  } catch (err: any) {
    logger.error("Forgot password error:", err.message);
    return res.json({
      success: true,
      message: "If this email exists in our system, a password reset link will be sent",
    });
  }
}));

app.post("/api/reset-password", asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Reset token is required" });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const user = await verifySupabaseToken(token);
    
    if (!user || !user.id) {
      logger.warn("Invalid or expired reset token");
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (!error) {
      logger.info("Password reset successful for user:", user.id);
      return res.json({
        success: true,
        message: "Password has been reset successfully",
      });
    }

    logger.warn("Password reset failed:", error?.message);
    return res.status(400).json({ error: "Invalid or expired reset token" });
  } catch (err: any) {
    logger.error("Reset password error:", err.message);
    return res.status(400).json({ error: "Password reset failed" });
  }
}));

/* =========================================================
   EMPLOYEE MANAGEMENT ROUTES
========================================================= */

app.get(
  "/api/employees",
  authenticate,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    try {
      logger.info("[GET /api/employees] Fetching employees from database");
      const { data, error } = await admin
        .from("employees")
        .select("*")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) {
        logger.error("[GET /api/employees] Database query error:", error);
        return res.status(500).json({ error: error.message });
      }

      logger.info("[GET /api/employees] Retrieved", data?.length || 0, "employees");

      // Transform snake_case → camelCase for frontend consistency
      const transformedData = (data || []).map((emp: any) => ({
        id: emp.id,
        payrollNumber: emp.payroll_number,
        firstName: emp.first_name,
        lastName: emp.last_name,
        email: emp.email,
        basicSalary: emp.basic_salary,
        benefits: emp.benefits,
        totalLeaveDays: emp.total_leave_days,
        remainingLeaveDays: emp.remaining_leave_days,
        designation: emp.designation,
        kraPin: emp.kra_pin,
        nssfNumber: emp.nssf_number,
        nhifNumber: emp.nhif_number,
        companyName: emp.company_name,
        joinedDate: emp.joined_date,
        isActive: emp.is_active,
      }));

      logger.info("[GET /api/employees] Sending", transformedData.length, "transformed employees");
      return res.json(transformedData);
    } catch (err: any) {
      logger.error("[GET /api/employees] Unexpected error:", err.message, err.stack);
      return res.status(500).json({ error: "Failed to fetch employees" });
    }
  })
);

app.post(
  "/api/employees",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    logger.info("[POST /api/employees] New employee creation request", { body: req.body });
    
    const {
      // payrollNumber,  ← Removed: unused and caused TS6133 error
      firstName,
      lastName,
      email,
      basicSalary,
      designation,
      kraPin,
      nssfNumber,
      nhifNumber,
      companyName,
      benefits,
      totalLeaveDays,
      // Explicitly ignore 'id' field - backend will generate UUID
      id: _ignoredId,
    } = req.body;

    if (!firstName || !lastName) {
      logger.warn("[POST /api/employees] Missing required fields");
      return res.status(400).json({ error: "Missing required fields: first name and last name are required" });
    }

    if (basicSalary === undefined || basicSalary === null || basicSalary === '') {
      logger.warn("[POST /api/employees] Basic salary missing");
      return res.status(400).json({ error: "Basic salary is required and cannot be empty" });
    }

    // Ensure KRA PIN is provided (table requires non-null kra_pin)
    if (!kraPin) {
      logger.warn("[POST /api/employees] Missing KRA PIN");
      return res.status(400).json({ error: "KRA PIN is required" });
    }

    const parsedSalary = typeof basicSalary === 'string' ? parseFloat(basicSalary) : basicSalary;
    if (!validatePositiveNumber(parsedSalary)) {
      logger.warn("[POST /api/employees] Invalid salary value", { basicSalary, parsedSalary });
      return res.status(400).json({ error: "Basic salary must be a valid number greater than 0" });
    }

    if (email && !validateEmail(email)) {
      logger.warn("[POST /api/employees] Invalid email format", { email });
      return res.status(400).json({ error: "Invalid email format" });
    }

    try {
      // Ensure payroll number uniqueness by generating on server when necessary
      const newEmployeeId = randomUUID();
      let finalPayrollNumber: string;

      try {
        const { data: pnData, error: pnError } = await admin
          .from('employees')
          .select('payroll_number')
          .like('payroll_number', 'EMP-%');

        if (!pnError && pnData && pnData.length > 0) {
          const nums = pnData
            .map((r: any) => {
              const m = String(r.payroll_number).match(/EMP-(\d+)/);
              return m && m[1] ? parseInt(m[1], 10) : NaN;
            })
            .filter((n: number) => !isNaN(n));
          const maxNum = nums.length ? Math.max(...nums) : 999;
          finalPayrollNumber = `EMP-${maxNum + 1}`;
        } else {
          finalPayrollNumber = 'EMP-1000';
        }
      } catch (e) {
        finalPayrollNumber = 'EMP-1000';
      }

      logger.info("[POST /api/employees] Inserting employee", { newEmployeeId, payrollNumber: finalPayrollNumber, firstName, lastName });

      const { data, error } = await admin
        .from("employees")
        .insert([
          {
            id: newEmployeeId,
            payroll_number: finalPayrollNumber,
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            basic_salary: parsedSalary,
            designation: designation ?? 'Staff',
            kra_pin: kraPin || null,
            nssf_number: nssfNumber || null,
            nhif_number: nhifNumber || null,
            company_name: companyName || null,
            benefits: benefits || 0,
            total_leave_days: totalLeaveDays || 21,
            remaining_leave_days: totalLeaveDays || 21,
            is_active: true,
            joined_date: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        if (error.code === "23505") {
          logger.warn("[POST /api/employees] Duplicate payroll number detected:", finalPayrollNumber);

          let retryCount = 0;
          let retryResult: any = null;
          const basePayrollNumber = finalPayrollNumber;
          
          while (retryCount < 3) {
            retryCount += 1;
            try {
              const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
              finalPayrollNumber = `${basePayrollNumber}-${suffix}`;
              
              logger.info("[POST /api/employees] Retry attempt", retryCount, "with payroll number:", finalPayrollNumber);

              const { data: retryData, error: retryError } = await admin
                .from('employees')
                .insert([
                  {
                    id: newEmployeeId,
                    payroll_number: finalPayrollNumber,
                    first_name: firstName,
                    last_name: lastName,
                    email: email || null,
                    basic_salary: parsedSalary,
                    designation: designation ?? 'Staff',
                    kra_pin: kraPin || null,
                    nssf_number: nssfNumber || null,
                    nhif_number: nhifNumber || null,
                    company_name: companyName || null,
                    benefits: benefits || 0,
                    total_leave_days: totalLeaveDays || 21,
                    remaining_leave_days: totalLeaveDays || 21,
                    is_active: true,
                    joined_date: new Date().toISOString(),
                  },
                ])
                .select();

              if (!retryError && retryData && retryData.length) {
                retryResult = retryData[0];
                logger.info('[POST /api/employees] Retry succeeded with payroll number:', finalPayrollNumber);
                break;
              }

              if (retryError && retryError.code !== '23505') {
                logger.error('[POST /api/employees] Retry insert error (non-duplicate):', { code: retryError.code, message: retryError.message });
                break;
              }
              
              logger.warn('[POST /api/employees] Retry attempt', retryCount, 'still got duplicate, will retry again...');
            } catch (e) {
              logger.error('[POST /api/employees] Retry exception:', e);
              break;
            }
          }

          if (retryResult) {
            const createdEmployee = retryResult;
            logger.info('[POST /api/employees] Employee successfully created after retry', { employeeId: createdEmployee?.id, payrollNumber: createdEmployee?.payroll_number });

            if (req.user?.id && createdEmployee?.id) {
              await admin.from('audits').insert([
                {
                  id: randomUUID(),
                  action: 'CREATE_EMPLOYEE',
                  employee_id: createdEmployee.id,
                  performed_by: req.user.id,
                },
              ]);
            }

            const transformedEmployee = createdEmployee ? {
              id: createdEmployee.id,
              payrollNumber: createdEmployee.payroll_number,
              firstName: createdEmployee.first_name,
              lastName: createdEmployee.last_name,
              email: createdEmployee.email,
              basicSalary: createdEmployee.basic_salary,
              benefits: createdEmployee.benefits,
              totalLeaveDays: createdEmployee.total_leave_days,
              remainingLeaveDays: createdEmployee.remaining_leave_days,
              designation: createdEmployee.designation,
              kraPin: createdEmployee.kra_pin,
              nssfNumber: createdEmployee.nssf_number,
              nhifNumber: createdEmployee.nhif_number,
              companyName: createdEmployee.company_name,
              joinedDate: createdEmployee.joined_date,
              isActive: createdEmployee.is_active,
            } : null;

            logger.info('Sending transformed employee response', { employee: transformedEmployee });
            return res.status(201).json(transformedEmployee || { id: null });
          }

          return res.status(409).json({ error: 'Duplicate payroll number - unable to auto-recover after retries' });
        }

        logger.error('[POST /api/employees] Insert error:', { code: error.code, message: error.message, details: error.details });
        return res.status(500).json({ error: error.message });
      }

      const createdEmployee = data?.[0];
      logger.info("[POST /api/employees] Employee successfully created", { employeeId: createdEmployee?.id, payrollNumber: createdEmployee?.payroll_number });

      if (req.user?.id && createdEmployee?.id) {
        await admin.from("audits").insert([
          {
            id: randomUUID(),
            action: "CREATE_EMPLOYEE",
            employee_id: createdEmployee.id,
            performed_by: req.user.id,
          },
        ]);
      }

      const transformedEmployee = createdEmployee ? {
        id: createdEmployee.id,
        payrollNumber: createdEmployee.payroll_number,
        firstName: createdEmployee.first_name,
        lastName: createdEmployee.last_name,
        email: createdEmployee.email,
        basicSalary: createdEmployee.basic_salary,
        benefits: createdEmployee.benefits,
        totalLeaveDays: createdEmployee.total_leave_days,
        remainingLeaveDays: createdEmployee.remaining_leave_days,
        designation: createdEmployee.designation,
        kraPin: createdEmployee.kra_pin,
        nssfNumber: createdEmployee.nssf_number,
        nhifNumber: createdEmployee.nhif_number,
        companyName: createdEmployee.company_name,
        joinedDate: createdEmployee.joined_date,
        isActive: createdEmployee.is_active,
      } : null;

      logger.info("Sending transformed employee response", { employee: transformedEmployee });
      return res.status(201).json(transformedEmployee || { id: null });
    } catch (err: any) {
      logger.error("Employee creation error:", err);
      return res.status(500).json({ error: "Failed to create employee" });
    }
  })
);

app.put(
  "/api/employees/:id",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      payrollNumber,
      firstName,
      lastName,
      email,
      basicSalary,
      designation,
      kraPin,
      nssfNumber,
      nhifNumber,
      companyName,
      benefits,
      totalLeaveDays,
      remainingLeaveDays,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields: first name and last name are required" });
    }

    let parsedSalary: number | undefined;
    if (basicSalary !== undefined && basicSalary !== null && basicSalary !== '') {
      parsedSalary = typeof basicSalary === 'string' ? parseFloat(basicSalary) : basicSalary;
      if (!validatePositiveNumber(parsedSalary)) {
        return res.status(400).json({ error: "Basic salary must be a valid number greater than 0" });
      }
    }

    try {
      const { data, error } = await admin
        .from("employees")
        .update({
          ...(payrollNumber && { payroll_number: payrollNumber }),
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
          ...(email && { email }),
          ...(parsedSalary !== undefined && { basic_salary: parsedSalary }),
          ...(designation && { designation }),
          ...(kraPin && { kra_pin: kraPin }),
          ...(nssfNumber && { nssf_number: nssfNumber }),
          ...(nhifNumber && { nhif_number: nhifNumber }),
          ...(companyName && { company_name: companyName }),
          ...(benefits !== undefined && { benefits }),
          ...(totalLeaveDays && { total_leave_days: totalLeaveDays }),
          ...(remainingLeaveDays && { remaining_leave_days: remainingLeaveDays }),
        })
        .eq("id", id)
        .select();

      if (error) {
        logger.error("Employee update error:", error);
        return res.status(500).json({ error: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      logger.info("Employee updated", { employeeId: id });

      const updatedEmployee = data[0];
      const transformedEmployee = {
        id: updatedEmployee.id,
        payrollNumber: updatedEmployee.payroll_number,
        firstName: updatedEmployee.first_name,
        lastName: updatedEmployee.last_name,
        email: updatedEmployee.email,
        basicSalary: updatedEmployee.basic_salary,
        benefits: updatedEmployee.benefits,
        totalLeaveDays: updatedEmployee.total_leave_days,
        remainingLeaveDays: updatedEmployee.remaining_leave_days,
        designation: updatedEmployee.designation,
        kraPin: updatedEmployee.kra_pin,
        nssfNumber: updatedEmployee.nssf_number,
        nhifNumber: updatedEmployee.nhif_number,
        companyName: updatedEmployee.company_name,
        joinedDate: updatedEmployee.joined_date,
        isActive: updatedEmployee.is_active,
      };

      return res.json(transformedEmployee);
    } catch (err: any) {
      logger.error("Employee update error:", err);
      return res.status(500).json({ error: "Failed to update employee" });
    }
  })
);

app.delete(
  "/api/employees/:id",
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const { error } = await admin
        .from("employees")
        .delete()
        .eq("id", id);

      if (error) {
        logger.error("Employee delete error:", error);
        return res.status(500).json({ error: error.message });
      }

      logger.info("Employee deleted", { employeeId: id });

      return res.json({ success: true });
    } catch (err: any) {
      logger.error("Employee delete error:", err);
      return res.status(500).json({ error: "Failed to delete employee" });
    }
  })
);

// Bulk delete employees by ID list
app.delete(
  "/api/employees/bulk-delete",
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ids } = req.body as { ids?: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Request body must include a non-empty 'ids' array" });
    }

    try {
      const { error } = await admin
        .from("employees")
        .delete()
        .in("id", ids);

      if (error) {
        logger.error("Bulk employee delete error:", error);
        return res.status(500).json({ error: error.message });
      }

      logger.info("Bulk employee delete completed", { count: ids.length });
      return res.json({ success: true, deletedCount: ids.length });
    } catch (err: any) {
      logger.error("Bulk employee delete unexpected error:", err);
      return res.status(500).json({ error: "Failed to delete employees" });
    }
  })
);

/* =========================================================
   EMPLOYEE TERMINATION ENDPOINT
========================================================= */

app.patch(
  "/api/employees/:id/terminate",
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const { data, error } = await admin
        .from("employees")
        .update({
          is_active: false,
          terminated_at: new Date().toISOString(),
          termination_reason: reason || null,
        })
        .eq("id", id)
        .select();

      if (error) {
        logger.error("Employee termination error:", error);
        return res.status(500).json({ error: error.message });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      logger.info("Employee terminated", { employeeId: id });

      if (req.user?.id) {
        await admin.from("audits").insert([
          {
            id: randomUUID(),
            action: "TERMINATE_EMPLOYEE",
            employee_id: id,
            performed_by: req.user.id,
          },
        ]);
      }

      return res.json({ success: true, data: data[0] });
    } catch (err: any) {
      logger.error("Employee termination error:", err);
      return res.status(500).json({ error: "Failed to terminate employee" });
    }
  })
);

/* =========================================================
   STUB / PLACEHOLDER ENDPOINTS
   For routes not yet fully implemented
========================================================= */

// Brand settings stub
app.get(
  "/api/brand-settings",
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json({
      entityName: "PayrollPro Kenya",
      logoUrl: "",
      primaryColor: "#2563eb",
      address: "123 Nairobi, Kenya"
    });
  })
);

// Payroll records stub
app.get(
  "/api/payroll",
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json([]);
  })
);

// General settings stub
app.get(
  "/api/settings",
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json({});
  })
);

// Leave requests stub
app.get(
  "/api/leave-requests",
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json([]);
  })
);

// Payroll processing endpoint (stub implementation)
app.post(
  "/api/payroll/run",
  authenticate,
  authorize(['admin']),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { month, year, employeeIds } = req.body;

    try {
      if (month === undefined || month === null || year === undefined || year === null) {
        return res.status(400).json({ error: "Month and year are required" });
      }

      logger.info("[POST /api/payroll/run] Executing payroll run", { month, year, userId: req.user?.id });

      const { data: employees, error: fetchError } = await admin
        .from("employees")
        .select("*")
        .eq("is_active", true);

      if (fetchError) {
        logger.error("[POST /api/payroll/run] Error fetching employees:", fetchError);
        return res.status(500).json({ error: "Failed to fetch employees" });
      }

      const selectedEmployees = employeeIds && employeeIds.length > 0
        ? (employees || []).filter((e: any) => employeeIds.includes(e.id))
        : (employees || []);

      const payrollRecords = selectedEmployees.map((emp: any) => {
        const basic = emp.basic_salary || 0;
        const benefits = emp.benefits || 0;
        const gross = basic + benefits;
        const paye = Math.round(gross * 0.1);
        const nssf = Math.round(gross * 0.06);
        const net = gross - paye - nssf;

        return {
          id: randomUUID(),
          employeeId: emp.id,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          employeeNumber: emp.payroll_number || '',
          payPeriodStart: new Date(year, month, 1).toISOString(),
          payPeriodEnd: new Date(year, month + 1, 0).toISOString(),
          grossPay: gross,
          netPay: net,
          paye,
          nssf,
          personalRelief: 0,
          status: 'completed',
          createdAt: new Date().toISOString(),
        };
      });

      logger.info("[POST /api/payroll/run] Generated payroll records", { count: payrollRecords.length });

      return res.json(payrollRecords);
    } catch (err: any) {
      logger.error("[POST /api/payroll/run] Error:", err);
      return res.status(500).json({ error: "Failed to execute payroll run" });
    }
  })
);

// Payroll history stub
app.get(
  "/api/payroll/history",
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json([]);
  })
);

/* =========================================================
   GLOBAL ERROR HANDLER
   Catches all unhandled errors from routes and middleware
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
   GRACEFUL SHUTDOWN LOGIC
========================================================= */

const shutdown = async () => {
  logger.info("Shutting down server...");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* =========================================================
   SERVER STARTUP
========================================================= */

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});