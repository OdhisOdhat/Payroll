// src/components/dashboard/StatsOverview.tsx
import React from 'react';
import { Users, Receipt, Landmark, AlertCircle } from 'lucide-react';
import StatCard from '../layout/StatCard'; // ← corrected: only default import
import { usePayroll } from '../hooks/usePayroll';
import { useEmployees } from '../hooks/useEmployees';
import { useLeaveRequests } from '../hooks/useLeaveRequests';

const StatsOverview: React.FC = () => {
  const { stats: payrollStats } = usePayroll();
  const { employees } = useEmployees();
  const { pendingRequests } = useLeaveRequests();

  // Calculate active employees
  const activeEmployees = employees.filter(e => e.isActive !== false).length;
  
  // Calculate pending actions (leave requests + incomplete payroll items)
  const pendingActions = pendingRequests.length + 0; // Add other pending items as needed

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {/* Active Personnel */}
      <StatCard
        label="Active Personnel"
        value={activeEmployees}
        icon={<Users />}
        trend={{
          value: '+2',
          isPositive: true,
          label: 'this month'
        }}
        onClick={() => window.location.hash = '#/employees'}
      />
      
      {/* Gross Liability – now using StatCard with positive trend */}
      <StatCard
        label="Gross Liability"
        value={payrollStats.totalGross} // ← number, not string (for animation)
        icon={<Receipt />}
        prefix="KES "
        trend={{
          value: '+12%',           // ← example value – adjust based on real trend logic
          isPositive: true,
          label: 'vs last period'
        }}
      />
      
      {/* Total Tax Remitted */}
      <StatCard
        label="Total Tax Remitted"
        value={payrollStats.totalTax}
        icon={<Landmark />}
        prefix="KES "
        trend={{
          value: '+8%',
          isPositive: true,
          label: 'vs last month'
        }}
      />
      
      {/* Pending Actions */}
      <StatCard
        label="Pending Actions"
        value={pendingActions}
        icon={<AlertCircle />}
        trend={{
          value: pendingActions > 0 ? `${pendingActions} items` : '0',
          isPositive: pendingActions === 0,
          label: pendingActions > 0 ? 'Requires attention' : 'All caught up!'
        }}
        // Optional: customize appearance when there are pending items
        className={pendingActions > 0 ? 'border-amber-300 bg-amber-50/30' : ''}
        onClick={() => window.location.hash = '#/leave'}
      />
    </div>
  );
};

export default StatsOverview;