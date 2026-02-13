// src/components/layout/Header.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  LayoutDashboard, 
  Users, 
  Receipt, 
  FileText, 
  PlaneTakeoff, 
  Settings,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBrandSettings } from '../hooks/useBrandSettings';

interface HeaderProps {
  user: any;
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onMenuToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { brandSettings } = useBrandSettings();

  // Page titles mapping
  const pageTitleMap: Record<string, string> = {
    '/': 'Dashboard',
    '/employees': 'Personnel Management',
    '/payroll': 'Payroll Processing',
    '/leave': 'Leave Management',
    '/reports': user?.role === 'staff' ? 'My Documents' : 'Reports & Compliance',
    '/settings': 'Brand Settings',
  };

  // Get current page title
  const currentPageTitle = pageTitleMap[location.pathname] || 'PayrollPro';

  // Navigation items for dropdown (mobile)
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'staff', 'tax'] },
    { path: '/employees', icon: Users, label: 'Personnel', roles: ['admin', 'manager'] },
    { path: '/payroll', icon: Receipt, label: 'Monthly Run', roles: ['admin', 'manager'] },
    { path: '/leave', icon: PlaneTakeoff, label: 'Leave Requests', roles: ['admin', 'manager', 'staff'] },
    { 
      path: '/reports', 
      icon: FileText, 
      label: user?.role === 'admin' || user?.role === 'manager' ? 'Reports & Compliance' : 'Compliance Hub', 
      roles: ['admin', 'manager', 'tax', 'staff'] 
    },
    { path: '/settings', icon: Settings, label: 'Branding', roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role));

  // User menu items
  const userMenuItems = [
    { 
      label: 'Profile', 
      icon: User, 
      onClick: () => navigate('/profile'),
      show: false // Can be enabled later when profile page is added
    },
    { 
      label: 'Logout', 
      icon: LogOut, 
      onClick: () => {
        if (window.confirm('Are you sure you want to logout?')) {
          logout();
        }
      },
      className: 'text-red-600 hover:bg-red-50'
    },
  ].filter(item => item.show !== false);

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-4">
        {/* Left Section - Menu Toggle & Page Title */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={24} className="text-slate-700" />
          </button>

          {/* Page Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 truncate">
              {currentPageTitle}
            </h1>
            {brandSettings.showTagline && (
              <p className="text-xs md:text-sm text-slate-500 mt-1 truncate">
                {brandSettings.companyTagline}
              </p>
            )}
          </div>
        </div>

        {/* Right Section - User Menu */}
        <div className="flex items-center gap-3 relative">
          {/* User Info Dropdown */}
          <div className="relative group">
            <div className="flex items-center gap-3 cursor-pointer group-hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <span className="text-blue-600 font-bold text-sm">
                  {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-slate-500 capitalize truncate">
                  {user?.role}
                </div>
              </div>
            </div>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50">
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="text-sm font-semibold text-slate-800">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-slate-500">{user?.email}</div>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                    {user?.role}
                  </span>
                </div>
              </div>
              
              <div className="py-1">
                {userMenuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      item.className || 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon size={16} className="shrink-0" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Optional) */}
      <div className="lg:hidden border-t border-slate-100 bg-white">
        <div className="grid grid-cols-4 md:grid-cols-6 gap-1 px-2 py-2">
          {navItems.slice(0, 6).map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title={item.label}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Header;