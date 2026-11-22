import React from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-xs px-4 pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto py-2.5 px-4 rounded-full liquid-glass-elevated flex items-center justify-between gap-2.5 shadow-2xl animate-fade-in transition-all"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {toast.type === 'success' ? (
              <span className="w-4 h-4 rounded-full bg-[#30d158]/20 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-[#30d158]" />
              </span>
            ) : toast.type === 'error' ? (
              <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-2.5 h-2.5 text-white/90" />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Info className="w-2.5 h-2.5 text-white/70" />
              </span>
            )}

            <div className="truncate">
              <span className="text-[11px] font-semibold text-white tracking-tight">{toast.title}</span>
              {toast.message && (
                <span className="text-[10px] text-white/50 ml-1.5 font-normal truncate">
                  {toast.message}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-white/40 hover:text-white p-0.5 shrink-0 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};
