-- =============================================================================
-- Employees Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id                   TEXT PRIMARY KEY,                    -- UUID or auto-generated string ID
    payroll_number       TEXT UNIQUE NOT NULL,                -- Employer's official payroll / staff number
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
    
    joined_date          TEXT,                                -- Actual date employee joined / started work (YYYY-MM-DD)
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Leave Requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id           TEXT PRIMARY KEY,
    employee_id  TEXT NOT NULL,
    start_date   TEXT NOT NULL,          -- ISO date YYYY-MM-DD
    end_date     TEXT NOT NULL,          -- ISO date YYYY-MM-DD
    reason       TEXT,
    status       TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- =============================================================================
-- Payroll Records
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_records (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT NOT NULL,
    payroll_ref     TEXT NOT NULL,               -- e.g. PAY-202501-EMP0047
    month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year            INTEGER NOT NULL CHECK (year >= 2000),
    
    gross_salary    REAL NOT NULL,
    benefits        REAL NOT NULL DEFAULT 0.00,
    nssf            REAL NOT NULL DEFAULT 0.00,
    taxable_income  REAL NOT NULL,
    paye            REAL NOT NULL DEFAULT 0.00,
    personal_relief REAL NOT NULL DEFAULT 0.00,
    housing_levy    REAL NOT NULL DEFAULT 0.00,
    sha             REAL NOT NULL DEFAULT 0.00,     -- SHIF / Social Health Insurance Fund
    nita            REAL NOT NULL DEFAULT 0.00,
    net_salary      REAL NOT NULL,
    
    processed_at    TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- =============================================================================
-- Payroll Audit Trail
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_audits (
    id           TEXT PRIMARY KEY,
    performed_by TEXT NOT NULL,               -- user id / username / email
    user_role    TEXT NOT NULL,
    action       TEXT NOT NULL,
    entity_type  TEXT,                        -- e.g. 'employee', 'payroll', 'leave'
    entity_id    TEXT,                        -- reference to the affected record
    details      TEXT,                        -- JSON or free text
    ip_address   TEXT,                        -- optional
    timestamp    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Application Settings / Configuration
-- =============================================================================
CREATE TABLE IF NOT EXISTS settings (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    description  TEXT,
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Optional: recommended index for faster lookups (add after table creation if needed)
-- CREATE INDEX IF NOT EXISTS idx_employees_payroll_number ON employees(payroll_number);
-- CREATE INDEX IF NOT EXISTS idx_payroll_employee_month_year ON payroll_records(employee_id, year, month);