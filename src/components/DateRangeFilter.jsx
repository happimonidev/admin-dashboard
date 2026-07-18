export default function DateRangeFilter({ from, to, onFromChange, onToChange, onClear, fromLabel = 'From', toLabel = 'To' }) {
  return (
    <>
      <label className="block text-xs font-medium text-ink-700">
        {fromLabel}
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
        />
      </label>
      <label className="block text-xs font-medium text-ink-700">
        {toLabel}
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
        />
      </label>
      {(from || to) && (
        <button
          type="button"
          onClick={onClear}
          className="mb-1.5 text-xs font-medium text-dodger-600 hover:underline"
        >
          Clear range
        </button>
      )}
    </>
  );
}
