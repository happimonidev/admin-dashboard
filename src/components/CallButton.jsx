import { Phone } from 'lucide-react';

/**
 * Opens the device's native dialer via a tel: link — the platform has no
 * built-in calling feature and never captures a call log, exactly as
 * specified. Rendered only where the caller actually has call_customer.
 */
export default function CallButton({ phone, className = '' }) {
  if (!phone) return null;

  return (
    <a
      href={`tel:${phone}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Call ${phone}`}
      title="Call via device dialer"
      className={`inline-flex items-center justify-center rounded-control p-1 text-dodger-600 hover:bg-dodger-50 ${className}`}
    >
      <Phone className="h-4 w-4" />
    </a>
  );
}
