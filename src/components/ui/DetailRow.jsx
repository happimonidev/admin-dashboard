export default function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5 last:border-0">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-ink-900">
        {value === null || value === undefined || value === '' ? '—' : value}
      </dd>
    </div>
  );
}
