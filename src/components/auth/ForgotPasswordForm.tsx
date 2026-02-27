import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useBrandSettings } from '../hooks/useBrandSettings';
import {
  Mail,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSuccess,
  onBack,
}) => {
  const { forgotPassword, isLoading: authLoading, error: authError } = useAuth();
  const { brandSettings } = useBrandSettings();

  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [formTouched, setFormTouched] = useState(false);

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

  const getFieldError = (): string => {
    if (!formTouched) return '';
    if (!email) return 'Email is required';
    if (!validateEmail(email)) return 'Invalid email format';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched(true);

    if (!email) {
      setFormError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      emailRef.current?.focus();
      return;
    }

    setFormError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const result = await forgotPassword(email);
      setSuccessMessage(result.message);
      setEmailSent(true);
    } catch (error) {
      console.error('Forgot password failed:', error);
      setFormError(
        error instanceof Error
          ? error.message
          : 'Failed to send password reset email'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = authLoading || isSubmitting;

  if (emailSent) {
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

          {/* Success Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-top duration-500">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-4">
                  <CheckCircle className="text-green-600" size={48} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Check Your Email
              </h2>
              <p className="text-slate-600 mb-4">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-slate-500 mb-6">
                The link will expire in 24 hours. If you don't see the email, check
                your spam folder.
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <h3 className="font-bold text-blue-900 mb-3">Next steps:</h3>
              <ol className="space-y-2 text-sm text-blue-900 list-decimal list-inside">
                <li>Check your email for the password reset link</li>
                <li>Click the link to create a new password</li>
                <li>Sign in with your new password</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={onBack}
                className={`
                  w-full flex items-center justify-center gap-2
                  text-blue-600 hover:text-blue-700 font-bold text-sm
                  transition-colors duration-200
                `}
              >
                <ArrowLeft size={20} />
                <span>Back to Login</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Forgot Password Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-top duration-500">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Reset Password
            </h2>
            <p className="text-slate-500 text-sm">
              Enter your email address and we'll send you a link to reset your
              password
            </p>
          </div>

          {/* Error Message */}
          {formError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <span>{formError}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-700 text-sm">
              <CheckCircle className="shrink-0 mt-0.5" size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Forgot Password Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  onBlur={() => setFormTouched(true)}
                  disabled={isLoading}
                  className={`
                    w-full pl-11 pr-4 py-3 rounded-xl border
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    transition-all duration-200
                    ${
                      getFieldError()
                        ? 'border-red-300 bg-red-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }
                    ${isLoading ? 'bg-slate-50 cursor-not-allowed' : ''}
                  `}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
              {getFieldError() && (
                <p className="mt-1 text-red-600 text-xs font-medium">
                  {getFieldError()}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !validateEmail(email)}
              className={`
                w-full bg-gradient-to-r from-blue-600 to-blue-700
                hover:from-blue-700 hover:to-blue-800 text-white font-bold
                py-3 px-6 rounded-xl transition-all duration-200
                flex items-center justify-center gap-2
                shadow-lg hover:shadow-xl transform hover:-translate-y-0.5
                active:translate-y-0
                ${
                  isLoading || !email || !validateEmail(email)
                    ? 'opacity-75 cursor-not-allowed'
                    : ''
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <Mail size={20} />
                  <span>Send Reset Link</span>
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

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} {brandSettings.companyName}. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
