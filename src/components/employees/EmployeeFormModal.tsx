// src/components/employees/EmployeeFormModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { Employee } from '../../types';
import { apiService } from '../../services/apiService';
import { useBrandSettings } from '../hooks/useBrandSettings';
import FormField from '../shared/FormField';

interface EmployeeFormModalProps {
  employee?: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  employee,
  onClose,
  onSuccess,
}) => {
  const { brandSettings } = useBrandSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    payrollNumber: employee?.payrollNumber || '',
    companyName: (employee as any)?.companyName || '',
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    designation: employee?.designation || employee?.position || 'Staff',
    email: employee?.email || '',
    kraPin: employee?.kraPin || '',
    nssfNumber: employee?.nssfNumber || '',
    nhifNumber: employee?.nhifNumber || '',
    basicSalary: employee?.basicSalary?.toString() || '',
    benefits: (employee?.benefits || 0).toString(),
    totalLeaveDays: (employee?.totalLeaveDays || 21).toString(),
    remainingLeaveDays: (employee?.remainingLeaveDays || employee?.totalLeaveDays || 21).toString(),
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        payrollNumber: employee.payrollNumber || '',
        companyName: (employee as any).companyName || '',
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        designation: employee.designation || employee.position || 'Staff',
        email: employee.email || '',
        kraPin: employee.kraPin || '',
        nssfNumber: employee.nssfNumber || '',
        nhifNumber: employee.nhifNumber || '',
        basicSalary: employee.basicSalary?.toString() || '',
        benefits: (employee.benefits || 0).toString(),
        totalLeaveDays: (employee.totalLeaveDays || 21).toString(),
        remainingLeaveDays: (employee.remainingLeaveDays || employee.totalLeaveDays || 21).toString(),
      });
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName || !formData.lastName) {
      alert('First name and last name are required.');
      return;
    }
    
    if (!formData.basicSalary || parseFloat(formData.basicSalary) <= 0) {
      alert('Basic salary must be greater than 0.');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare employee data
      const employeeData = {
        id: employee?.id || Math.random().toString(36).substr(2, 9),
        payrollNumber: formData.payrollNumber,
          companyName: formData.companyName || '',
        firstName: formData.firstName,
        lastName: formData.lastName,
        designation: formData.designation,
        email: formData.email,
        kraPin: formData.kraPin,
        nssfNumber: formData.nssfNumber,
        nhifNumber: formData.nhifNumber,
        basicSalary: parseFloat(formData.basicSalary),
        benefits: parseFloat(formData.benefits) || 0,
        totalLeaveDays: parseInt(formData.totalLeaveDays) || 21,
        remainingLeaveDays: parseInt(formData.remainingLeaveDays) || parseInt(formData.totalLeaveDays) || 21,
        joinedDate: employee?.joinedDate || new Date().toISOString(),
        isActive: true,
        position: formData.designation,
        name: `${formData.firstName} ${formData.lastName}`,
        salary: parseFloat(formData.basicSalary),
      };

      // Call API to save employee
        const isUpdate = !!employee;

        if (isUpdate) {
          await apiService.updateEmployee(employeeData as Employee);
        } else {
          await apiService.saveEmployee(employeeData);
        }
      alert(employee ? 'Employee updated successfully!' : 'Employee added successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Save Employee Error:', err);
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in">
      <div className="bg-white rounded-t-[30px] md:rounded-[40px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 flex flex-col h-[95vh] md:max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 p-6 md:p-10 text-white flex justify-between items-center relative shrink-0">
          <div>
            <h3 className="text-xl md:text-3xl font-black">
              {employee ? 'Update Profile' : 'Onboard User'}
            </h3>
            <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[9px] md:text-[11px]">
              Secure System Entry
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-3xl"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-5 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 bg-white overflow-y-auto flex-1"
        >
          <div className="md:col-span-2">
            <FormField
              label="Staff / Payroll Number"
              name="payrollNumber"
              value={formData.payrollNumber}
              onChange={handleChange}
              required
              placeholder="e.g. EMP-001"
            />
          </div>
          <div className="md:col-span-2">
            <FormField
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="e.g. Acme Ltd"
            />
          </div>
          
          <FormField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          
          <FormField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
          
          <FormField
            label="Designation"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            placeholder="e.g. Senior Developer"
          />
          
          <FormField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          
          <FormField
            label="KRA Tax PIN"
            name="kraPin"
            value={formData.kraPin}
            onChange={handleChange}
            required
          />
          
          <FormField
            label="NSSF Reference"
            name="nssfNumber"
            value={formData.nssfNumber}
            onChange={handleChange}
            required
          />
          
          <FormField
            label="SHA Identity"
            name="nhifNumber"
            value={formData.nhifNumber}
            onChange={handleChange}
            required
          />

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
            <FormField
              label="Monthly Base Salary"
              name="basicSalary"
              type="number"
              value={formData.basicSalary}
              onChange={handleChange}
              required
            />
            <FormField
              label="Allowances"
              name="benefits"
              type="number"
              value={formData.benefits}
              onChange={handleChange}
            />
          </div>

          <div
            className="md:col-span-2 grid grid-cols-2 gap-4 p-4 md:p-6 rounded-2xl md:rounded-3xl border"
            style={{
              backgroundColor: `${brandSettings.primaryColor}08`,
              borderColor: `${brandSettings.primaryColor}30`,
            }}
          >
            <FormField
              label="Leave Entitlement"
              name="totalLeaveDays"
              type="number"
              value={formData.totalLeaveDays}
              onChange={handleChange}
            />
            <FormField
              label="Remaining"
              name="remainingLeaveDays"
              type="number"
              value={formData.remainingLeaveDays}
              onChange={handleChange}
            />
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex flex-col md:flex-row justify-end gap-3 mt-4 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full md:w-auto px-8 py-4 rounded-xl border-2 border-slate-100 font-bold text-slate-500 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-4 rounded-xl font-black shadow-xl uppercase tracking-widest text-xs"
              style={{
                backgroundColor: brandSettings.primaryColor,
                color: 'white',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Processing...
                </span>
              ) : employee ? (
                'Update Ledger'
              ) : (
                'Commit Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;