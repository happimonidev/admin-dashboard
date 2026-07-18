export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      {Icon && <Icon className="mb-1 h-8 w-8 text-ink-300" />}
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
