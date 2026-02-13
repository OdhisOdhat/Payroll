
import { Employee } from '../types';
import * as XLSX from 'xlsx';

/**
 * Downloads a CSV template for employee imports.
 */
export const downloadEmployeeTemplate = () => {
  const headers = [
    'firstName',
    'lastName',
    'email',
    'kraPin',
    'nssfNumber',
    'nhifNumber',
    'basicSalary',
    'benefits',
    'totalLeaveDays'
  ];
  
  const sampleRow = [
    'John',
    'Doe',
    'john.doe@example.com',
    'A123456789Z',
    '100200300',
    '500600700',
    '50000',
    '5000',
    '21'
  ];

  const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "employee_import_template.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Parses CSV text into an array of partial Employee objects.
 * Handles basic comma-separated values and quoted strings.
 */
export const parseEmployeeCSV = (csvText: string): Partial<Employee>[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const results: Partial<Employee>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple regex to handle commas inside quotes if needed
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const entry: any = {};

    headers.forEach((header, index) => {
      const value = values[index];
      if (header === 'basicSalary' || header === 'benefits' || header === 'totalLeaveDays') {
        entry[header] = parseFloat(value) || 0;
      } else {
        entry[header] = value;
      }
    });

    // Generate a temporary ID if not present
    entry.id = Math.random().toString(36).substr(2, 9);
    entry.joinedDate = new Date().toISOString();
    entry.remainingLeaveDays = entry.totalLeaveDays || 21;

    results.push(entry as Partial<Employee>);
  }

  return results;
};

/**
 * Parses XLSX file and extracts employee data from the first sheet.
 * Expects columns matching Employee object properties.
 */
export const parseEmployeeXLSX = (file: File): Promise<Partial<Employee>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('No sheets found in XLSX file'));
          return;
        }
        
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers from first row
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        if (!jsonData || jsonData.length === 0) {
          reject(new Error('No data found in sheet'));
          return;
        }
        
        // Map JSON data to Employee objects
        const employees: Partial<Employee>[] = jsonData.map((row: any) => {
          const employee: any = {};
          
          // Map common column names (case-insensitive)
          const keys = Object.keys(row);
          keys.forEach(key => {
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('first') && lowerKey.includes('name')) {
              employee.firstName = row[key];
            } else if (lowerKey.includes('last') && lowerKey.includes('name')) {
              employee.lastName = row[key];
            } else if (lowerKey.includes('email')) {
              employee.email = row[key];
            } else if (lowerKey.includes('kra')) {
              employee.kraPin = row[key];
            } else if (lowerKey.includes('nssf')) {
              employee.nssfNumber = row[key];
            } else if (lowerKey.includes('nhif')) {
              employee.nhifNumber = row[key];
            } else if (lowerKey.includes('basic') && lowerKey.includes('sal')) {
              employee.basicSalary = parseFloat(row[key]) || 0;
            } else if (lowerKey.includes('benefit')) {
              employee.benefits = parseFloat(row[key]) || 0;
            } else if (lowerKey.includes('leave')) {
              employee.totalLeaveDays = parseFloat(row[key]) || 21;
            } else if (lowerKey.includes('payroll') && lowerKey.includes('number')) {
              employee.payrollNumber = row[key];
            } else if (lowerKey.includes('designation') || lowerKey.includes('position')) {
              employee.designation = row[key];
            }
          });
          
          // Set defaults
          employee.id = Math.random().toString(36).substr(2, 9);
          employee.joinedDate = new Date().toISOString();
          employee.remainingLeaveDays = employee.totalLeaveDays || 21;
          employee.isActive = true;
          
          return employee as Partial<Employee>;
        });
        
        resolve(employees);
      } catch (err: any) {
        reject(new Error(`Failed to parse XLSX: ${err.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Downloads an XLSX template for employee imports.
 */
export const downloadEmployeeXLSXTemplate = () => {
  const templateData = [
    {
      'First Name': 'John',
      'Last Name': 'Doe',
      'Email': 'john.doe@example.com',
      'KRA PIN': 'A123456789Z',
      'NSSF Number': '100200300',
      'NHIF Number': '500600700',
      'Basic Salary': 50000,
      'Benefits': 5000,
      'Total Leave Days': 21,
      'Payroll Number': 'EMP001',
      'Designation': 'Software Engineer'
    }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  XLSX.writeFile(workbook, 'employee_import_template.xlsx');
};
