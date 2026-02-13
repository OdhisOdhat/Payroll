// src/components/settings/BrandingForm.tsx
import React, { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import type { BrandSettings } from '../../types';

interface BrandingFormProps {
  initialValues: BrandSettings;
  onSubmit: (values: Partial<BrandSettings>) => Promise<void>;
  isSaving?: boolean;
}

const BrandingForm: React.FC<BrandingFormProps> = ({
  initialValues,
  onSubmit,
  isSaving = false,
}) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof BrandSettings, string>>>({}); // eslint-disable-line

  // Validate form data
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BrandSettings, string>> = {}; // eslint-disable-line

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    if (formData.companyName.trim().length < 2) {
      newErrors.companyName = 'Company name must be at least 2 characters';
    }

    if (formData.companyTagline.trim().length > 100) {
      newErrors.companyTagline = 'Tagline must be less than 100 characters';
    }

    // Validate colors are valid hex codes
    const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
    if (!hexRegex.test(formData.primaryColor)) {
      newErrors.primaryColor = 'Invalid hex color code';
    }
    if (!hexRegex.test(formData.secondaryColor)) {
      newErrors.secondaryColor = 'Invalid hex color code';
    }
    if (!hexRegex.test(formData.accentColor)) {
      newErrors.accentColor = 'Invalid hex color code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to save branding settings:', error);
    }
  };

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof BrandSettings]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle color input change
  const handleColorChange = (field: keyof Pick<BrandSettings, 'primaryColor' | 'secondaryColor' | 'accentColor'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Information */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-6">Company Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-bold text-slate-700 mb-2">
              Company Name *
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={formData.companyName}
              onChange={handleChange}
              disabled={isSaving}
              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-700 ${
                errors.companyName
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              } ${isSaving ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              placeholder="Enter company name"
            />
            {errors.companyName && (
              <p className="mt-1 text-red-600 text-xs">{errors.companyName}</p>
            )}
          </div>

          <div>
            <label htmlFor="companyTagline" className="block text-sm font-bold text-slate-700 mb-2">
              Company Tagline
            </label>
            <input
              id="companyTagline"
              name="companyTagline"
              type="text"
              value={formData.companyTagline}
              onChange={handleChange}
              disabled={isSaving}
              maxLength={100}
              className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium text-slate-700 ${
                errors.companyTagline
                  ? 'border-red-300 bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              } ${isSaving ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              placeholder="Enter company tagline"
            />
            {errors.companyTagline && (
              <p className="mt-1 text-red-600 text-xs">{errors.companyTagline}</p>
            )}
            <p className="mt-1 text-xs text-slate-400 text-right">
              {formData.companyTagline.length}/100 characters
            </p>
          </div>
        </div>
      </div>

      {/* Color Settings */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-6">Brand Colors</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="primaryColor" className="block text-sm font-bold text-slate-700 mb-2">
              Primary Color
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                id="primaryColor"
                value={formData.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                disabled={isSaving}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                id="primaryColorText"
                name="primaryColor"
                type="text"
                value={formData.primaryColor}
                onChange={handleChange}
                disabled={isSaving}
                className={`flex-1 p-3 border rounded-xl font-mono text-sm ${
                  errors.primaryColor
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200'
                } ${isSaving ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                placeholder="#000000"
              />
            </div>
            {errors.primaryColor && (
              <p className="mt-1 text-red-600 text-xs">{errors.primaryColor}</p>
            )}
          </div>

          <div>
            <label htmlFor="secondaryColor" className="block text-sm font-bold text-slate-700 mb-2">
              Secondary Color
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                id="secondaryColor"
                value={formData.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                disabled={isSaving}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                id="secondaryColorText"
                name="secondaryColor"
                type="text"
                value={formData.secondaryColor}
                onChange={handleChange}
                disabled={isSaving}
                className={`flex-1 p-3 border rounded-xl font-mono text-sm ${
                  errors.secondaryColor
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200'
                } ${isSaving ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                placeholder="#000000"
              />
            </div>
            {errors.secondaryColor && (
              <p className="mt-1 text-red-600 text-xs">{errors.secondaryColor}</p>
            )}
          </div>

          <div>
            <label htmlFor="accentColor" className="block text-sm font-bold text-slate-700 mb-2">
              Accent Color
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                id="accentColor"
                value={formData.accentColor}
                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                disabled={isSaving}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                id="accentColorText"
                name="accentColor"
                type="text"
                value={formData.accentColor}
                onChange={handleChange}
                disabled={isSaving}
                className={`flex-1 p-3 border rounded-xl font-mono text-sm ${
                  errors.accentColor
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-200'
                } ${isSaving ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                placeholder="#000000"
              />
            </div>
            {errors.accentColor && (
              <p className="mt-1 text-red-600 text-xs">{errors.accentColor}</p>
            )}
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Color Preview</h4>
          <div className="flex gap-4">
            <div className="flex-1">
              <div 
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: formData.primaryColor }}
              />
              <div className="text-center text-xs font-bold text-slate-600">Primary</div>
            </div>
            <div className="flex-1">
              <div 
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: formData.secondaryColor }}
              />
              <div className="text-center text-xs font-bold text-slate-600">Secondary</div>
            </div>
            <div className="flex-1">
              <div 
                className="h-16 rounded-lg mb-2"
                style={{ backgroundColor: formData.accentColor }}
              />
              <div className="text-center text-xs font-bold text-slate-600">Accent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold mb-4">Live Preview</h3>
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <div 
            className="h-16 rounded-t-xl mb-4"
            style={{ backgroundColor: formData.primaryColor }}
          />
          <div className="space-y-3">
            <div 
              className="h-8 rounded-lg"
              style={{ backgroundColor: formData.secondaryColor }}
            />
            <div 
              className="h-8 rounded-lg"
              style={{ backgroundColor: formData.accentColor }}
            />
          </div>
          <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
            <h4 
              className="text-lg font-bold mb-2"
              style={{ color: formData.primaryColor }}
            >
              {formData.companyName}
            </h4>
            <p className="text-slate-600">{formData.companyTagline}</p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6 border-t border-slate-100">
        <button
          type="submit"
          disabled={isSaving}
          className={`
            px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg
            flex items-center justify-center gap-2 transition-all
            ${
              isSaving
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl transform hover:-translate-y-0.5'
            }
          `}
        >
          {isSaving ? (
            <>
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Save Brand Settings</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default BrandingForm;