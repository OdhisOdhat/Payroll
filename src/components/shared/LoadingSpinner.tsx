// src/components/shared/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  thickness?: number;
  message?: string;
  fullscreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'currentColor',
  className = '',
  thickness = 3,
  message,
  fullscreen = false,
}) => {
  // Size configurations
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  const spinner = (
    <div
      className={`
        animate-spin rounded-full border-t-transparent
        ${sizeClasses[size]} ${className}
      `}
      style={{
        borderColor: color,
        borderRightColor: 'transparent',
        borderWidth: thickness,
      }}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[2500]">
        <div className="text-center">
          {spinner}
          {message && (
            <p className="mt-4 text-white text-lg font-bold">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {spinner}
      {message && (
        <p className="mt-2 text-slate-600 text-sm font-medium">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;