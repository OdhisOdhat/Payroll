// src/components/leave/LeaveEntitlementCard.tsx
import React from 'react';

interface LeaveEntitlementCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  subtitle?: string;
  onClick?: () => void;
}

const LeaveEntitlementCard: React.FC<LeaveEntitlementCardProps> = ({
  title,
  count,
  icon,
  bgColor,
  textColor,
  subtitle,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-6 shadow-sm border border-slate-100
        transition-all duration-200 cursor-pointer
        hover:shadow-md hover:-translate-y-0.5
        ${onClick ? 'hover:border-blue-200' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            {title}
          </div>
          <div className="text-3xl font-black text-slate-800">{count}</div>
          {subtitle && (
            <div className="mt-2 text-[10px] text-slate-500">{subtitle}</div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgColor} flex-shrink-0 ml-4`}>
          <div className={textColor}>{icon}</div>
        </div>
      </div>
    </div>
  );
};

export default LeaveEntitlementCard;