
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
    joined_date TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Records Table
CREATE TABLE IF NOT EXISTS payroll_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    gross_salary REAL NOT NULL,
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
