const VARIANTS = {
  primary:
    'bg-dodger-500 text-white hover:bg-dodger-600 disabled:bg-dodger-300',
  secondary:
    'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 disabled:opacity-60',
  ghost: 'text-ink-500 hover:bg-ink-50 disabled:opacity-60',
  danger: 'bg-danger-500 text-white hover:bg-danger-700 disabled:opacity-60',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
