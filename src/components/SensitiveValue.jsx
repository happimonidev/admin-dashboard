import { Lock } from 'lucide-react';

/**
 * Displays a value exactly as returned by the API — the backend has
 * already decided whether to mask it (maskingMiddleware / applyMasking).
 * This component never re-implements masking logic; it only detects the
 * backend's own mask format (contains '*') to show a small lock affordance,
 * so admins understand *why* a field looks partially hidden.
 */
export default function SensitiveValue({ value }) {
  if (value === null || value === undefined || value === '') {
    return <span>—</span>;
  }

  const looksMasked = typeof value === 'string' && value.includes('*');

  if (!looksMasked) return <span>{value}</span>;

  return (
    <span
      className="inline-flex items-center gap-1"
      title="Masked — your role doesn't have permission to view this in full"
    >
      <Lock className="h-3 w-3 text-ink-400" />
      <span className="font-mono">{value}</span>
    </span>
  );
}
