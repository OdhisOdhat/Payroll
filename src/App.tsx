// src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Providers from your specific file structure: src/components/hooks/
import { AuthProvider, useAuth } from './components/hooks/useAuth';
import { EmployeeProvider } from './components/hooks/useEmployees';
import { PayrollProvider } from './components/hooks/usePayroll';
import { LeaveProvider } from './components/hooks/useLeaveRequests';
import { BrandSettingsProvider } from './components/hooks/useBrandSettings';

// Components from your specific file structure
import LoginForm from './components/auth/LoginForm';
import SignupForm from './components/auth/SignupForm';
import ForgotPasswordForm from './components/auth/ForgotPasswordForm';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './components/dashboard/Dashboard';
import EmployeeList from './components/employees/EmployeeList';
import PayrollHistory from './components/payroll/PayrollHistory';
import LeaveManagement from './components/leave/LeaveManagement';
import PayrollReports from './components/reports/PayrollReports';
import SettingsPage from './components/settings/SettingsPage';

type AuthScreen = 'login' | 'signup' | 'forgot-password';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  // 1. Loading State: Show a spinner while the app boots up
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Initializing PayrollPro...</p>
      </div>
    );
  }

  /** * 2. Auth Gate: 
   * If you want to see the dashboard IMMEDIATELY without logging in, 
   * comment out lines 54-71 below.
   */
  if (!user) {
    return (
      <>
        {authScreen === 'login' && (
          <LoginForm
            onSuccess={() => {
              setAuthScreen('login');
            }}
            onForgotPassword={() => setAuthScreen('forgot-password')}
            onSignUp={() => setAuthScreen('signup')}
          />
        )}
        {authScreen === 'signup' && (
          <SignupForm
            onSuccess={() => {
              setAuthScreen('login');
            }}
            onBack={() => setAuthScreen('login')}
          />
        )}
        {authScreen === 'forgot-password' && (
          <ForgotPasswordForm
            onSuccess={() => {
              setAuthScreen('login');
            }}
            onBack={() => setAuthScreen('login')}
          />
        )}
      </>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout /> }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/payroll" element={<PayrollHistory />} />
        <Route path="/leave" element={<LeaveManagement />} />
        <Route path="/reports" element={<PayrollReports />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <EmployeeProvider>
          <PayrollProvider>
            <LeaveProvider>
              <BrandSettingsProvider>
                <AppContent />
              </BrandSettingsProvider>
            </LeaveProvider>
          </PayrollProvider>
        </EmployeeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;