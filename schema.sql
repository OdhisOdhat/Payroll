-- =============================================================================
-- Employees Table (Updated with Onboarding/Termination fields)
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
    
    joined_date          TEXT,
    
    -- NEW: Status and Termination tracking
    is_active            BOOLEAN NOT NULL DEFAULT 1,        -- 1 for active, 0 for terminated
    terminated_at        TEXT,                              -- ISO date (YYYY-MM-DD)
    termination_reason   TEXT,                              -- Reason for offboarding
    
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Leave Requests (No changes needed, references active/inactive employees)
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id           TEXT PRIMARY KEY,
    employee_id  TEXT NOT NULL,
    start_date   TEXT NOT NULL,
    end_date     TEXT NOT NULL,
    reason       TEXT,
    status       TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE RESTRICT -- Prevents deleting employees with leave history
        ON UPDATE CASCADE
);

-- =============================================================================
-- Payroll Records (Preserves data even if employee is terminated)
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
    
    processed_at    TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE RESTRICT -- Critical: Keeps payroll history intact
        ON UPDATE CASCADE
);

-- =============================================================================
-- Payroll Audit Trail (Will log "Terminate" actions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_audits (
    id           TEXT PRIMARY KEY,
    performed_by TEXT NOT NULL,
    user_role    TEXT NOT NULL,
    action       TEXT NOT NULL, -- e.g., 'TERMINATE_EMPLOYEE' or 'ONBOARD_EMPLOYEE'
    entity_type  TEXT,
    entity_id    TEXT,
    details      TEXT,
    ip_address   TEXT,
    timestamp    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Application Settings
-- =============================================================================
CREATE TABLE IF NOT EXISTS settings (
    key          TEXT PRIMARY KEY,
    value        TEXT NOT NULL,
    description  TEXT,
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);