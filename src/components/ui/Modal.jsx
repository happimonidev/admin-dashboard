import { X } from 'lucide-react';

const SIZES = {
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 sm:items-center sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop click closes — the panel itself stops propagation */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className={`relative flex max-h-[90vh] w-full flex-col rounded-t-card bg-white shadow-xl sm:rounded-card ${SIZES[size]}`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-control p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
