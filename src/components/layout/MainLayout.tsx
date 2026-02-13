// src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileMenu from './MobileMenu';
import { useAuth } from '../hooks/useAuth';

const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col shrink-0 bg-slate-900 w-64">
        <Sidebar user={user} onLogout={logout} />
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <MobileMenu onClose={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Main Content Area */}
      <main className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} onMenuToggle={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;