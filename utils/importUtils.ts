
import { Employee } from '../types';

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
