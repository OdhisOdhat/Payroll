import React from 'react';
import { 
  LayoutDashboard, Users, Receipt, FileText, 
  Settings, PlaneTakeoff, LogOut, User 
} from 'lucide-react';
import NavItem from '../shared/NavItem';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarProps {
  user: any;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['admin', 'manager', 'staff', 'tax'] },
    { path: '/employees', icon: <Users size={20} />, label: 'Personnel', roles: ['admin', 'manager'] },
    { path: '/payroll', icon: <Receipt size={20} />, label: 'Monthly Run', roles: ['admin', 'manager'] },
    { path: '/leave', icon: <PlaneTakeoff size={20} />, label: 'Leave Requests', roles: ['admin', 'manager', 'staff'] },
    { 
      path: '/reports', 
      icon: <FileText size={20} />, 
      label: user?.role === 'admin' || user?.role === 'manager' ? 'Reports & Compliance' : 'Compliance Hub', 
      roles: ['admin', 'manager', 'tax', 'staff'] 
    },
    { path: '/settings', icon: <Settings size={20} />, label: 'Branding', roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role));

  return (
    <div className="h-full flex flex-col bg-slate-900 w-64">
      <div className="p-8">
        <h1 className="text-xl font-bold flex items-center gap-3 tracking-tight text-white">
          <Receipt className="custom-theme-text" size={20} />
          <span className="truncate">PayrollPro Kenya</span>
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavItem
            key={item.path}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      <div className="px-6 py-6 border-t border-slate-800 bg-slate-950/20 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <User size={20} />
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-black truncate">{user?.firstName} {user?.lastName}</div>
            <div className="text-[10px] custom-theme-text font-black uppercase tracking-widest">{user?.role}</div>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-400 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
        >
          <LogOut size={14} /> Log Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;