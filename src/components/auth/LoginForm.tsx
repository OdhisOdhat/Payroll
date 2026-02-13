// src/components/auth/LoginForm.tsx (Enhanced)
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBrandSettings } from '../hooks/useBrandSettings';
import { 
  Mail, 
  Lock, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess,
  onForgotPassword,
  onSignUp
}) => {
  const { login, isLoading: authLoading, error: authError } = useAuth();
  const { brandSettings } = useBrandSettings();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTouched, setFormTouched] = useState({
    email: false,
    password: false,
  });

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Focus email field on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Sync auth errors to form error state
  useEffect(() => {
    if (authError) {
      setFormError(authError);
    }
  }, [authError]);

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation with strength check
  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return null;
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setFormTouched({ email: true, password: true });
    
    // Validate form
    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      emailRef.current?.focus();
      return;
    }
    
    if (!validatePassword(password)) {
      setFormError('Password must be at least 6 characters');
      passwordRef.current?.focus();
      return;
    }
    
    setFormError('');
    setIsSubmitting(true);
    
    try {
      await login(email, password);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberMeEmail', email);
      } else {
        localStorage.removeItem('rememberMeEmail');
      }
      
      onSuccess?.();
      
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load remembered email
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberMeEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Handle input changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (formTouched.email && !validateEmail(e.target.value)) {
      setFormError('Please enter a valid email address');
    } else {
      setFormError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formTouched.password && !validatePassword(e.target.value)) {
      setFormError('Password must be at least 6 characters');
    } else {
      setFormError('');
    }
  };

  const getFieldError = (field: 'email' | 'password'): string => {
    if (!formTouched[field]) return '';
    
    if (field === 'email' && !validateEmail(email)) {
      return 'Invalid email format';
    }
    
    if (field === 'password' && !validatePassword(password)) {
      return 'At least 6 characters required';
    }
    
    return '';
  };

  const isLoading = authLoading || isSubmitting;
  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {brandSettings.logoUrl ? (
              <img 
                src={brandSettings.logoUrl} 
                alt="Logo" 
                className="w-12 h-12 object-contain"
              />
            ) : (
              <ShieldCheck 
                className="text-blue-600" 
                size={48} 
                strokeWidth={1.5} 
              />
            )}
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 mb-2">
            {brandSettings.companyName}
          </h1>
          
          {brandSettings.showTagline && (
            <p className="text-slate-600 text-sm">
              {brandSettings.companyTagline}
            </p>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-top duration-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-500 text-sm">
              Sign in to access your payroll dashboard
            </p>
          </div>

          {/* Error Message */}
          {(formError || authError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <span>{formError || authError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-bold text-slate-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-slate-400" size={20} />
                </div>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => setFormTouched(prev => ({ ...prev, email: true }))}
                  disabled={isLoading}
                  className={`
                    w-full pl-11 pr-4 py-3 rounded-xl border
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-all duration-200
                    ${
                      getFieldError('email')
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }
                    ${isLoading ? 'bg-slate-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
              {getFieldError('email') && (
                <p className="mt-1 text-red-600 text-xs font-medium">
                  {getFieldError('email')}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-bold text-slate-700 mb-2 flex items-center justify-between"
              >
                <span>Password</span>
                {passwordStrength && (
                  <span className={`text-xs font-bold ${
                    passwordStrength === 'weak' ? 'text-red-600' :
                    passwordStrength === 'medium' ? 'text-amber-600' :
                    'text-emerald-600'
                  }`}>
                    {passwordStrength === 'weak' ? 'Weak' :
                     passwordStrength === 'medium' ? 'Medium' : 'Strong'}
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={20} />
                </div>
                <input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => setFormTouched(prev => ({ ...prev, password: true }))}
                  disabled={isLoading}
                  className={`
                    w-full pl-11 pr-12 py-3 rounded-xl border
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-all duration-200
                    ${
                      getFieldError('password')
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }
                    ${isLoading ? 'bg-slate-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className={`
                    absolute inset-y-0 right-0 pr-4 flex items-center
                    text-slate-400 hover:text-slate-600 transition-colors
                    ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                  `}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {getFieldError('password') && (
                <p className="mt-1 text-red-600 text-xs font-medium">
                  {getFieldError('password')}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 font-medium">Remember me</span>
              </label>
              
              {onForgotPassword && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  disabled={isLoading}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`
                w-full bg-gradient-to-r from-blue-600 to-blue-700 
                hover:from-blue-700 hover:to-blue-800 text-white font-bold
                py-3 px-6 rounded-xl transition-all duration-200
                flex items-center justify-center gap-2
                shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                active:translate-y-0
                ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <Lock size={20} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs text-slate-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Sign Up Link */}
          {onSignUp && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600 mb-2">
                Don't have an account?
              </p>
              <button
                type="button"
                onClick={onSignUp}
                disabled={isLoading}
                className={`
                  text-blue-600 hover:text-blue-700 font-bold text-sm
                  transition-colors duration-200
                  ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                `}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} {brandSettings.companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;