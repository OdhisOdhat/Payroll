
-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    kra_pin TEXT NOT NULL,
    nssf_number TEXT,
    nhif_number TEXT,
    basic_salary REAL DEFAULT 0,
    benefits REAL DEFAULT 0,
    total_leave_days INTEGER DEFAULT 21,
    remaining_leave_days INTEGER DEFAULT 21,
    joined_date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Payroll Records Table
CREATE TABLE IF NOT EXISTS payroll_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    gross_salary REAL NOT NULL,
    benefits REAL DEFAULT 0,
    nssf REAL NOT NULL,
    taxable_income REAL NOT NULL,
    paye REAL NOT NULL,
    personal_relief REAL NOT NULL,
    housing_levy REAL NOT NULL,
    sha REAL NOT NULL,
    nita REAL NOT NULL,
    net_salary REAL NOT NULL,
    processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Payroll Audit Trail Table
CREATE TABLE IF NOT EXISTS payroll_audits (
    id TEXT PRIMARY KEY,
    performed_by TEXT NOT NULL,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
