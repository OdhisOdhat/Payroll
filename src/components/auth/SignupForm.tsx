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
  User,
  ArrowLeft,
} from 'lucide-react';

interface SignupFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onBack }) => {
  const { signup, isLoading: authLoading, error: authError } = useAuth();
  const { brandSettings } = useBrandSettings();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTouched, setFormTouched] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    firstName: false,
    lastName: false,
  });

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  useEffect(() => {
    if (authError) {
      setFormError(authError);
    }
  }, [authError]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return null;
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  };

  const getFieldError = (field: keyof typeof formTouched): string => {
    if (!formTouched[field]) return '';

    switch (field) {
      case 'email':
        if (!email) return 'Email is required';
        if (!validateEmail(email)) return 'Invalid email format';
        return '';
      case 'firstName':
        if (!firstName) return 'First name is required';
        return '';
      case 'lastName':
        if (!lastName) return 'Last name is required';
        return '';
      case 'password':
        if (!password) return 'Password is required';
        if (!validatePassword(password)) return 'At least 6 characters required';
        return '';
      case 'confirmPassword':
        if (!confirmPassword) return 'Password confirmation is required';
        if (password !== confirmPassword) return 'Passwords do not match';
        return '';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const touchedState = {
      email: true,
      password: true,
      confirmPassword: true,
      firstName: true,
      lastName: true,
    };
    setFormTouched(touchedState);

    // Validate all fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      emailRef.current?.focus();
      return;
    }

    if (!validatePassword(password)) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setFormError('Please agree to the terms and conditions');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      await signup(email, password, firstName, lastName);
      onSuccess?.();
    } catch (error) {
      console.error('Signup failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const isLoading = authLoading || isSubmitting;
  const isFormValid =
    firstName &&
    lastName &&
    email &&
    validateEmail(email) &&
    password &&
    validatePassword(password) &&
    password === confirmPassword &&
    agreedToTerms;

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
              <ShieldCheck className="text-blue-600" size={48} strokeWidth={1.5} />
            )}
          </div>

          <h1 className="text-3xl font-black text-slate-800 mb-2">
            {brandSettings.companyName}
          </h1>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-top duration-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Create Account</h2>
            <p className="text-slate-500 text-sm">Join PayrollPro today</p>
          </div>

          {/* Error Message */}
          {(formError || authError) && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <span>{formError || authError}</span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                First Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-slate-400" size={20} />
                </div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setFormTouched((prev) => ({ ...prev, firstName: true }))}
                  disabled={isLoading}
                  className={`
                    w-full pl-11 pr-4 py-3 rounded-xl border
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-all duration-200
                    ${
                      getFieldError('firstName')
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }
                    ${isLoading ? 'bg-slate-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="John"
                />
              </div>
              {getFieldError('firstName') && (
                <p className="mt-1 text-red-600 text-xs font-medium">
                  {getFieldError('firstName')}
                </p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Last Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-slate-400" size={20} />
                </div>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => setFormTouched((prev) => ({ ...prev, lastName: true }))}
                  disabled={isLoading}
                  className={`
                    w-full pl-11 pr-4 py-3 rounded-xl border
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-all duration-200
                    ${
                      getFieldError('lastName')
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }
                    ${isLoading ? 'bg-slate-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="Doe"
                />
              </div>
              {getFieldError('lastName') && (
                <p className="mt-1 text-red-600 text-xs font-medium">
                  {getFieldError('lastName')}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="text-slate-400" size={20} />
                </div>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setFormTouched((prev) => ({ ...prev, email: true }))}
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
                />
              </div>
              {getFieldError('email') && (
                <p className="mt-1 text-red-600 text-xs font-medium">
                  {getFieldError('email')}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                <span>Password</span>
                {passwordStrength && (
                  <span
                    className={`text-xs font-bold ${
                      passwordStrength === 'weak'
                        ? 'text-red-600'
                        : passwordStrength === 'medium'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {passwordStrength === 'weak'
                      ? 'Weak'
                      : passwordStrength === 'medium'
                        ? 'Medium'
                        : 'Strong'}
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setFormTouched((prev) => ({ ...prev, password: true }))}
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
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-slate-400" size={20} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() =>
                    setFormTouched((prev) => ({ ...prev, confirmPassword: true }))
                  }
                  disabled={isLoading}
                  className={`
                    w-full pl-11 pr-12 py-3 rounded-xl border
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-all duration-200
                    ${
                      getFieldError('confirmPassword')
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }
                    ${isLoading ? 'bg-slate-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {getFieldError('confirmPassword') && (
                <p className="mt-1 text-red-600 text-xs font-medium">
                  {getFieldError('confirmPassword')}
                </p>
              )}
            </div>

            {/* Terms Agreement */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 mt-1"
                />
                <span className="text-sm text-slate-700">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:underline font-bold">
                    Terms and Conditions
                  </a>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`
                w-full bg-gradient-to-r from-blue-600 to-blue-700
                hover:from-blue-700 hover:to-blue-800 text-white font-bold
                py-3 px-6 rounded-xl transition-all duration-200
                flex items-center justify-center gap-2
                shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                active:translate-y-0
                ${isLoading || !isFormValid ? 'opacity-75 cursor-not-allowed' : ''}
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isLoading}
              className={`
                w-full mt-6 flex items-center justify-center gap-2
                text-blue-600 hover:text-blue-700 font-bold text-sm
                transition-colors duration-200
                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              <ArrowLeft size={20} />
              <span>Back to Login</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
