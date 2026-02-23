import "dotenv/config";
import express, { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
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
    logger.warn("No token provided in request to", req.path);
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    logger.info("Verifying token for request to", req.path);
    const user = await verifySupabaseToken(token);
    if (!user) {
      logger.warn("Token verification returned null for request to", req.path);
      return res.status(401).json({ error: "Invalid token" });
    }

    const userRole = (user as any).user_metadata?.role || (user as any).role || "staff";
    req.user = {
      id: user.id,
      email: user.email,
      role: userRole,
    };

    logger.info("Token verified successfully, user role:", userRole, "for user", user.email);
    return next();
  } catch (err) {
    logger.error("Token verification error:", err);
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

// Attach authentication/authorization middleware to routes below.
// (Removed the temporary TS workaround which referenced them without use.)

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
    try {
      logger.info("[GET /api/employees] Fetching employees from database");
      const { data, error } = await supabaseAdmin
        .from("employees")
        .select("*")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) {
        logger.error("[GET /api/employees] Database query error:", error);
        return res.status(500).json({ error: error.message });
      }

      logger.info("[GET /api/employees] Retrieved", data?.length || 0, "employees");

      // Transform snake_case from Supabase to camelCase for frontend
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
        // Backend authoritative: always generate payroll_number for new employees
        // to avoid frontend-generated collisions. We compute the next EMP-####
        // based on the highest existing EMP- value.
        let finalPayrollNumber: string;
        try {
          const { data: pnData, error: pnError } = await supabaseAdmin
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
      logger.info("[POST /api/employees] Inserting employee", { newEmployeeId, payrollNumber, firstName, lastName });
      const { data, error } = await supabaseAdmin
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
          logger.warn("[POST /api/employees] Duplicate payroll number:", finalPayrollNumber);
          // Attempt to recover by appending random suffixes to guarantee uniqueness
          let retryCount = 0;
          let retryResult: any = null;
          const basePayrollNumber = finalPayrollNumber;
          
          while (retryCount < 3) {
            retryCount += 1;
            try {
              // On each retry, append a new random suffix to guarantee uniqueness
              const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
              finalPayrollNumber = `${basePayrollNumber}-${suffix}`;
              
              logger.info("[POST /api/employees] Retry attempt", retryCount, "with payroll number:", finalPayrollNumber);

              const { data: retryData, error: retryError } = await supabaseAdmin
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

              // If error was not duplicate, break and surface it
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
            // proceed as if initial insert succeeded
            const createdEmployee = retryResult;
            logger.info('[POST /api/employees] Employee successfully created after retry', { employeeId: createdEmployee?.id, payrollNumber: createdEmployee?.payroll_number });
            // Log audit
            if (req.user?.id && createdEmployee?.id) {
              await supabaseAdmin.from('audits').insert([
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

      // Log audit
      if (req.user?.id && createdEmployee?.id) {
        await supabaseAdmin.from("audits").insert([
          {
            id: randomUUID(),
            action: "CREATE_EMPLOYEE",
            employee_id: createdEmployee.id,
            performed_by: req.user.id,
          },
        ]);
      }

      // Transform snake_case from Supabase to camelCase for frontend
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
      const { data, error } = await supabaseAdmin
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

      // Transform snake_case from Supabase to camelCase for frontend
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
  authorize(['admin']),
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
   STUB ROUTES (For missing endpoints)
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

// Payroll stub
app.get(
  "/api/payroll",
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json([]);
  })
);

// Settings stub
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

// Payroll run
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

      // Fetch employees to generate payroll
      const { data: employees, error: fetchError } = await supabaseAdmin
        .from("employees")
        .select("*")
        .eq("is_active", true);

      if (fetchError) {
        logger.error("[POST /api/payroll/run] Error fetching employees:", fetchError);
        return res.status(500).json({ error: "Failed to fetch employees" });
      }

      // Filter by employeeIds if provided
      const selectedEmployees = employeeIds && employeeIds.length > 0
        ? (employees || []).filter(e => employeeIds.includes(e.id))
        : (employees || []);

      // Generate payroll records
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

      // Return array of payroll records
      return res.json(payrollRecords);
    } catch (err: any) {
      logger.error("[POST /api/payroll/run] Error:", err);
      return res.status(500).json({ error: "Failed to execute payroll run" });
    }
  })
);

// Payroll history
app.get(
  "/api/payroll/history",
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    return res.json([]);
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
