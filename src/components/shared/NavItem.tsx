// src/components/shared/NavItem.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactElement;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
  className?: string;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  active = false,
  onClick,
  badge,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-sm
        transition-all duration-200 relative group
        ${
          active
            ? 'bg-white text-slate-900 shadow-md'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
        }
        ${className}
      `}
      aria-current={active ? 'page' : undefined}
      role="menuitem"
    >
      <div 
        className={`flex-shrink-0 ${
          active ? 'text-blue-500' : 'group-hover:text-white'
        }`}
      >
        {React.isValidElement(icon)
          ? React.cloneElement(icon, ({ size: 20, strokeWidth: 2 } as any))
          : icon
        }
      </div>
      <span className="truncate">{label}</span>
      
      {badge && badge > 0 && (
        <span 
          className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-black ${
            active 
              ? 'bg-amber-100 text-amber-800' 
              : 'bg-amber-500/20 text-amber-300 group-hover:bg-amber-500/30'
          }`}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-lg"></div>
      )}
    </button>
  );
};

export default NavItem;