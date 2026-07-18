import Card from './ui/Card';

export default function StatCard({ label, value, icon: Icon, hint, tone = 'default' }) {
  const iconWrapTone =
    tone === 'danger'
      ? 'bg-danger-50 text-danger-500'
      : tone === 'success'
      ? 'bg-success-50 text-success-500'
      : tone === 'warning'
      ? 'bg-warning-50 text-warning-500'
      : 'bg-dodger-50 text-dodger-500';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-ink-900">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={`rounded-control p-2 ${iconWrapTone}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}
