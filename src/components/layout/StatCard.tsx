// src/components/layout/StatCard.tsx (Enhanced with Animation)
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useBrandSettings } from '../hooks/useBrandSettings';

interface StatCardProps {
  label: string;
  value: number; // Must be number for animation
  icon: React.ReactElement;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number; // Animation duration in ms
  onClick?: () => void;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value: targetValue,
  icon,
  trend,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1000,
  onClick,
  className = '',
}) => {
  const { brandSettings } = useBrandSettings();
  const [displayValue, setDisplayValue] = useState(0);
  const isClickable = !!onClick;

  // Animate value on mount and when targetValue changes
  useEffect(() => {
    let start: number | null = null;
    const startValue = displayValue;
    const endValue = targetValue;
    const range = endValue - startValue;
    const increment = endValue > startValue ? 1 : -1;
    const steps = Math.abs(Math.floor(range)) || 1;
    const stepDuration = duration / steps;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      
      if (progress < duration) {
        const currentValue = Math.min(
          startValue + (increment * progress * (steps / duration)),
          endValue
        );
        setDisplayValue(currentValue);
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetValue, duration]);

  // Format the displayed value
  const formattedValue = React.useMemo(() => {
    return `${prefix}${displayValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}${suffix}`;
  }, [displayValue, prefix, suffix, decimals]);

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-6 shadow-sm border border-slate-100
        transition-all duration-200 transform-gpu
        ${isClickable 
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' 
          : ''
        }
        ${className}
      `}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              {label}
            </div>
            {trend && (
              <div 
                className={`flex items-center text-[10px] font-black uppercase tracking-widest ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp size={12} className="mr-0.5" />
                ) : (
                  <TrendingDown size={12} className="mr-0.5" />
                )}
                {trend.value}
              </div>
            )}
          </div>
          
          <div className="text-2xl md:text-3xl font-black text-slate-800">
            {formattedValue}
          </div>
          
          {trend?.label && (
            <div className="mt-1">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                trend.isPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
        
        <div 
          className="p-3 rounded-xl flex-shrink-0 ml-4"
          style={{ 
            backgroundColor: brandSettings.primaryColor + '15' // 15% opacity
          }}
        >
          <div 
            className="w-6 h-6 flex items-center justify-center"
            style={{ color: brandSettings.primaryColor }}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon, { ...( { size: 24, className: 'flex-shrink-0' } as any) })
              : icon
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;