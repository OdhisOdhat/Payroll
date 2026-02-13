// src/components/layout/MobileMenu.tsx (with React Router)
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  FileText, 
  Settings, 
  PlaneTakeoff,
  User as UserIcon,
  LogOut,
  X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useBrandSettings } from '../hooks/useBrandSettings';
import NavItem from '../shared/NavItem';

interface MobileMenuProps {
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { brandSettings } = useBrandSettings();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      onClose();
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[1000] lg:hidden animate-in fade-in">
      {/* Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose}
        role="button"
        aria-label="Close menu"
      />

      {/* Mobile Sidebar */}
      <div className="absolute inset-y-0 left-0 w-[280px] bg-slate-900 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col h-full">
        {/* Header Section */}
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-3 tracking-tight text-white">
              {brandSettings.logoUrl ? (
                <img 
                  src={brandSettings.logoUrl} 
                  alt="Logo" 
                  className="w-8 h-8 object-contain" 
                />
              ) : (
                <Receipt className="custom-theme-text" size={20} />
              )}
              <span className="truncate">{brandSettings.entityName || 'PayrollPro Kenya'}</span>
            </h1>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            onClick={() => handleNavigation('/')}
          />

          {(user.role === 'admin' || user.role === 'manager') && (
            <>
              <NavItem 
                icon={<Users size={20} />} 
                label="Personnel" 
                onClick={() => handleNavigation('/employees')}
              />
              <NavItem 
                icon={<Receipt size={20} />} 
                label="Monthly Run" 
                onClick={() => handleNavigation('/payroll')}
              />
            </>
          )}

          <NavItem 
            icon={<PlaneTakeoff size={20} />} 
            label="Leave Requests" 
            onClick={() => handleNavigation('/leave')}
          />

          {(user.role === 'admin' || user.role === 'tax' || user.role === 'manager') && (
            <NavItem 
              icon={<FileText size={20} />} 
              label={user.role === 'admin' || user.role === 'manager' 
                ? "Reports & Compliance" 
                : "Compliance Hub"} 
              onClick={() => handleNavigation('/reports')}
            />
          )}

          {user.role === 'admin' && (
            <NavItem 
              icon={<Settings size={20} />} 
              label="Branding" 
              onClick={() => handleNavigation('/settings')}
            />
          )}

          {user.role === 'staff' && (
            <NavItem 
              icon={<FileText size={20} />} 
              label="Documents" 
              onClick={() => handleNavigation('/reports')}
            />
          )}
        </nav>

        {/* User Profile Section */}
        <div className="px-6 py-6 border-t border-slate-800 bg-slate-950/20 text-white mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <UserIcon size={20} />
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-black truncate">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-[10px] custom-theme-text font-black uppercase tracking-widest">
                {user.role}
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900/20 text-slate-400 hover:text-red-400 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;