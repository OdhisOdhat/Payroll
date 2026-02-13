import "dotenv/config";
import express, { Request, Response, NextFunction } from 'express';
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import { supabaseAdmin, verifySupabaseToken } from "./lib/supabase";
import winston from "winston";

/* =========================================================
   ENVIRONMENT VALIDATION
========================================================= */

const requiredEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
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
   EXPRESS APP SETUP
========================================================= */

const app = express();

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from localhost on any port, or from specified origin
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for now, restrict in production
    }
  },
  credentials: true,
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
    id: string;
    email?: string;
    role?: string;
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
   AUTHENTICATION MIDDLEWARE (Supabase)
========================================================= */

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const user = await verifySupabaseToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "staff",
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token verification failed" });
  }
};

const authorize = (roles: string[]) => 
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userRole = req.user.role || "staff";
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", asyncHandler(async (_req: Request, res: Response) => {
  try {
    // Test Supabase connection
    const { error } = await supabaseAdmin.from("employees").select("id").limit(1);
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
   AUTH ROUTES (Supabase Auth)
========================================================= */

app.post("/api/login", asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    // Try Supabase auth first
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session) {
      return res.json({
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || "staff",
        },
      });
    }

    // Fallback: check admin table (local admin users)
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from("admins")
      .select("id, email, password_hash, first_name, last_name, role, is_active")
      .eq("email", email.toLowerCase())
      .single();

    // If admins table doesn't exist or user not found, check for demo credentials
    if (adminError || !adminData) {
      // Demo user for testing - valid until schema is set up
      if (email.toLowerCase() === "demo@payroll.local" && password === "demo123") {
        const demoToken = Buffer.from(
          JSON.stringify({
            sub: "demo-user-id",
            email: "demo@payroll.local",
            role: "admin",
            iat: Math.floor(Date.now() / 1000),
          })
        ).toString("base64");

        logger.info(`Demo login successful`);
        return res.json({
          token: demoToken,
          user: {
            id: "demo-user-id",
            email: "demo@payroll.local",
            firstName: "Demo",
            lastName: "User",
            role: "admin",
          },
        });
      }

      logger.warn(`Login attempt failed for email: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!adminData.is_active) {
      return res.status(401).json({ error: "Account is inactive" });
    }

    // Verify password hash
    const passwordValid = await bcrypt.compare(password, adminData.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token for admin user (store in supabase as custom claim later)
    const adminToken = Buffer.from(
      JSON.stringify({
        sub: adminData.id,
        email: adminData.email,
        role: adminData.role,
        iat: Math.floor(Date.now() / 1000),
      })
    ).toString("base64");

    logger.info(`Admin login successful for: ${email}`);

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
    logger.error("Login error:", err.message);
    return res.status(500).json({ error: "Login failed" });
  }
}));

/* =========================================================
   EMPLOYEE ROUTES
========================================================= */

app.get(
  "/api/employees",
  authenticate,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("employees")
      .select("*")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      logger.error("Failed to fetch employees:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
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
      designation,
      kraPin,
      nssfNumber,
      nhifNumber,
      companyName,
      benefits,
      totalLeaveDays,
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

    try {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .insert([
          {
            payroll_number: payrollNumber,
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            basic_salary: basicSalary,
            designation: designation || null,
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
          return res.status(409).json({ error: "Duplicate payroll number" });
        }
        logger.error("Employee insert error:", error);
        return res.status(500).json({ error: error.message });
      }

      logger.info("Employee created", { employeeId: data?.[0]?.id });

      // Log audit
      if (req.user?.id && data?.[0]?.id) {
        await supabaseAdmin.from("audits").insert([
          {
            action: "CREATE_EMPLOYEE",
            employee_id: data[0].id,
            performed_by: req.user.id,
          },
        ]);
      }

      return res.status(201).json(data?.[0] || { id: null });
    } catch (err: any) {
      logger.error("Employee creation error:", err);
      return res.status(500).json({ error: "Failed to create employee" });
    }
  })
);

app.put(
  "/api/employees/:id",
  authenticate,
  authorize(["admin"]),
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
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (basicSalary !== undefined && !validatePositiveNumber(basicSalary)) {
      return res.status(400).json({ error: "Invalid salary" });
    }

    try {
      const { data, error } = await supabaseAdmin
        .from("employees")
        .update({
          ...(payrollNumber && { payroll_number: payrollNumber }),
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
          ...(email && { email }),
          ...(basicSalary && { basic_salary: basicSalary }),
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

      return res.json(data[0]);
    } catch (err: any) {
      logger.error("Employee update error:", err);
      return res.status(500).json({ error: "Failed to update employee" });
    }
  })
);

app.delete(
  "/api/employees/:id",
  authenticate,
  authorize(["admin"]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
      const { error } = await supabaseAdmin
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

/* =========================================================
   TERMINATION
========================================================= */

app.patch(
  "/api/employees/:id/terminate",
  authenticate,
  authorize(["admin"]),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
      const { data, error } = await supabaseAdmin
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

      // Log audit
      if (req.user?.id) {
        await supabaseAdmin.from("audits").insert([
          {
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
