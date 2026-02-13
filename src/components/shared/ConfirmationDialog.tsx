// src/components/shared/ConfirmationDialog.tsx
import React, { useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  X, 
  CheckCircle, 
  Loader2 
} from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  isLoading = false,
  icon,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      confirmButtonRef.current?.focus();
    }
    
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Confirm button styles based on variant
  const confirmButtonStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2500] flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95"
        role="document"
      >
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {icon || (
                <AlertTriangle 
                  className={confirmVariant === 'danger' ? 'text-rose-400' : 'text-amber-400'} 
                  size={28} 
                />
              )}
            </div>
            <div>
              <h2 
                id="confirmation-dialog-title" 
                className="text-xl font-black"
              >
                {title}
              </h2>
              {typeof message === 'string' ? (
                <p className="text-slate-300 mt-1">{message}</p>
              ) : (
                <div className="text-slate-300 mt-1">{message}</div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X size={24} />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm
              border border-slate-200 text-slate-700 hover:bg-slate-50
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={async () => {
              try {
                await onConfirm();
              } catch (error) {
                console.error('Confirmation action failed:', error);
              }
            }}
            disabled={isLoading}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md
              ${confirmButtonStyles[confirmVariant]}
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {confirmVariant === 'danger' ? (
                  <AlertTriangle size={18} />
                ) : confirmVariant === 'success' ? (
                  <CheckCircle size={18} />
                ) : null}
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;