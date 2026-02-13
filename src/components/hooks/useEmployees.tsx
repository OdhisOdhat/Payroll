import { useState, useEffect, createContext, useContext } from 'react';
import { apiService } from '../../services/apiService';
import { Employee } from '../../types';

interface EmployeeContextType {
  employees: Employee[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  saveEmployee: (employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  terminateEmployee: (id: string, reason?: string) => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: React.ReactNode }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getEmployees();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmployee = async (employeeData: Partial<Employee>) => {
    setIsLoading(true);
    try {
      const isUpdate = !!employeeData.id;
      let savedEmployee: Employee;

      if (isUpdate) {
        savedEmployee = await apiService.updateEmployee(employeeData as Employee);
        setEmployees(prev => prev.map(emp => 
          emp.id === savedEmployee.id ? savedEmployee : emp
        ));
      } else {
        savedEmployee = await apiService.saveEmployee(employeeData);
        setEmployees(prev => [...prev, savedEmployee]);
      }
    } catch (error) {
      console.error('Failed to save employee:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    setIsLoading(true);
    try {
      await apiService.deleteEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Failed to delete employee:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const terminateEmployee = async (id: string, reason?: string) => {
    setIsLoading(true);
    try {
      await apiService.terminateEmployee(id, reason);
      setEmployees(prev => prev.map(e =>
        e.id === id
          ? { ...e, isActive: false, terminatedAt: new Date().toISOString(), terminationReason: reason }
          : e
      ));
    } catch (error) {
      console.error('Failed to terminate employee:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  return (
    <EmployeeContext.Provider value={{
      employees,
      isLoading,
      refetch: loadEmployees,
      saveEmployee,
      deleteEmployee,
      terminateEmployee
    }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (!context) throw new Error('useEmployees must be used within EmployeeProvider');
  return context;
};