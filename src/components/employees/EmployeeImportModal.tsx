import React, { useState } from 'react';
import { Upload, X, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Employee } from '../../types';
import { parseEmployeeXLSX, downloadEmployeeXLSXTemplate } from '../../utils/importUtils';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (employees: Partial<Employee>[]) => Promise<void>;
}

const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Employee>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Please select a valid Excel file (.xlsx or .xls)');
      setFile(null);
      setPreviewData([]);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    try {
      const data = await parseEmployeeXLSX(selectedFile);
      if (data.length === 0) {
        setError('No employee records found in the file');
        setPreviewData([]);
        setIsLoading(false);
        return;
      }
      setPreviewData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
      setPreviewData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(previewData);
      setSuccessCount(previewData.length);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setFile(null);
        setPreviewData([]);
        setError(null);
        setSuccessCount(0);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to import employees');
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Import Employees</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Success Message */}
          {successCount > 0 && !isImporting && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-emerald-900">Import Successful!</p>
                <p className="text-sm text-emerald-700">{successCount} employee(s) imported successfully.</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !successCount && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          {previewData.length === 0 && !successCount && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <label className="flex flex-col items-center gap-3 cursor-pointer">
                  <Upload size={32} className="text-slate-400" />
                  <div>
                    <p className="font-semibold text-slate-700">Choose an Excel file</p>
                    <p className="text-sm text-slate-500">Supports .xlsx and .xls formats</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={isLoading}
                    className="hidden"
                  />
                </label>
              </div>

              {file && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">
                    Selected: <span className="font-semibold">{file.name}</span>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {isLoading ? 'Parsing file...' : 'File ready for preview'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={downloadEmployeeXLSXTemplate}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Download size={16} />
                  Download Template
                </button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {previewData.length > 0 && !successCount && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900">
                  Ready to import {previewData.length} employee(s)
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewData.map((emp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800">
                            {emp.firstName} {emp.lastName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{emp.email || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {emp.basicSalary ? `KES ${emp.basicSalary.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-6 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {previewData.length > 0 && (
            <button
              onClick={handleImport}
              disabled={isImporting || successCount > 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Importing...
                </>
              ) : successCount > 0 ? (
                <>
                  <CheckCircle size={18} />
                  Imported
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Import {previewData.length} Employee(s)
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeImportModal;
