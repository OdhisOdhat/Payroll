// src/components/shared/DetailRow.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DetailRowProps {
  label: string;
  value: string | number | React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  inline?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
  icon: Icon,
  className = '',
  labelClassName = '',
  valueClassName = '',
  inline = false,
}) => {
  return (
    <div 
      className={`flex ${
        inline ? 'items-center' : 'flex-col md:flex-row justify-between'
      } py-3 border-b border-slate-100 last:border-0 ${className}`}
    >
      <div className={`flex items-start gap-2 min-w-0 ${labelClassName}`}>
        {Icon && (
          <Icon 
            size={16} 
            className="text-slate-400 mt-0.5 flex-shrink-0" 
            aria-hidden="true" 
          />
        )}
        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
          {label}
        </span>
      </div>
      <div 
        className={`mt-1 md:mt-0 font-bold text-slate-800 break-words ${
          inline ? '' : 'md:text-right'
        } ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
};

export default DetailRow;