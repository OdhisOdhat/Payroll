-- =============================================================================
-- Employees Table (Updated with designation + company_name)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id                   TEXT PRIMARY KEY,
    payroll_number       TEXT UNIQUE NOT NULL,
    first_name           TEXT NOT NULL,
    last_name            TEXT NOT NULL,
    email                TEXT UNIQUE,
    kra_pin              TEXT NOT NULL UNIQUE,
    nssf_number          TEXT UNIQUE,
    nhif_number          TEXT UNIQUE,
    
    basic_salary         REAL NOT NULL DEFAULT 0.00,
    benefits             REAL NOT NULL DEFAULT 0.00,
    
    total_leave_days     INTEGER NOT NULL DEFAULT 21,
    remaining_leave_days INTEGER NOT NULL DEFAULT 21,
    
    joined_date          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Status and Termination tracking
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    terminated_at        TIMESTAMP,
    termination_reason   TEXT,
    
    -- NEW: Designation (job title/position)
    designation          TEXT NOT NULL DEFAULT 'Staff',
    
    -- NEW: Company name (in case of multi-company setup in future)
    company_name         TEXT,
    
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (recommended for performance)
CREATE INDEX IF NOT EXISTS idx_employees_payroll_number ON employees(payroll_number);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_designation ON employees(designation);
CREATE INDEX IF NOT EXISTS idx_employees_last_name_first_name ON employees(last_name, first_name);


-- =============================================================================
-- Leave Requests (unchanged)
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id           TEXT PRIMARY KEY,
    employee_id  TEXT NOT NULL,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    reason       TEXT,
    status       TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);


-- =============================================================================
-- Payroll Records (unchanged)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_records (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT NOT NULL,
    payroll_ref     TEXT NOT NULL,
    month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year            INTEGER NOT NULL CHECK (year >= 2000),
    
    gross_salary    REAL NOT NULL,
    benefits        REAL NOT NULL DEFAULT 0.00,
    nssf            REAL NOT NULL DEFAULT 0.00,
    taxable_income  REAL NOT NULL,
    paye            REAL NOT NULL DEFAULT 0.00,
    personal_relief REAL NOT NULL DEFAULT 0.00,
    housing_levy    REAL NOT NULL DEFAULT 0.00,
    sha             REAL NOT NULL DEFAULT 0.00,
    nita            REAL NOT NULL DEFAULT 0.00,
    net_salary      REAL NOT NULL,
    
    processed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    
    CONSTRAINT unique_payroll_per_month UNIQUE (employee_id, year, month)
);


-- =============================================================================
-- Payroll Audit Trail (unchanged)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_audits (
    id           TEXT PRIMARY KEY,
    performed_by TEXT NOT NULL,
    user_role    TEXT NOT NULL,
    action       TEXT NOT NULL,
    entity_type  TEXT,
    entity_id    TEXT,
    details      TEXT,
    ip_address   TEXT,
    timestamp    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- Application Settings (unchanged)
-- =============================================================================
CREATE TABLE IF NOT EXISTS settings (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    description  TEXT,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- Admins Table (Separate from Supabase Auth - for local admin management)
-- =============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id                   TEXT PRIMARY KEY,
    email                TEXT UNIQUE NOT NULL,
    password_hash        TEXT NOT NULL,
    first_name           TEXT,
    last_name            TEXT,
    role                 TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'auditor')),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    last_login           TIMESTAMP,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for admin lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);