// src/components/shared/FormField.tsx
import React from 'react';
import { Info, AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  textarea?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  title?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  helperText,
  required = false,
  placeholder = '',
  disabled = false,
  className = '',
  inputClassName = '',
  labelClassName = '',
  textarea = false,
  min,
  max,
  step,
  title = '',
}) => {
  const id = `field-${name}`;
  
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label 
        htmlFor={id} 
        className={`block text-[10px] md:text-[11px] font-black text-slate-500 uppercase tracking-widest ${
          error ? 'text-rose-500' : ''
        } ${labelClassName}`}
      >
        <div className="flex items-center gap-1">
          {label}
          {required && <span className="text-rose-500">*</span>}
          {helperText && (
            <div 
              className="group relative cursor-help"
              title={helperText}
            >
              <Info size={12} className="text-slate-400 hover:text-slate-600 transition-colors" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 w-48 z-50">
                {helperText}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
              </div>
            </div>
          )}
        </div>
      </label>
      
      {textarea ? (
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`
            w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            outline-none transition-all font-medium text-slate-700 resize-none
            ${
              error
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }
            ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}
            ${inputClassName}
          `}
          rows={4}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          title={title}
          className={`
            w-full px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            outline-none transition-all font-medium text-slate-700
            ${
              error
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }
            ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}
            ${inputClassName}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      
      {error && (
        <div id={`${id}-error`} className="flex items-start gap-1 text-rose-600 text-[11px] font-medium mt-1">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FormField;