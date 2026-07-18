export default function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-card bg-white shadow-sm ring-1 ring-ink-100 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
