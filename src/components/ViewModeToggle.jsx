import { BarChart3, Table2 } from 'lucide-react';

export default function ViewModeToggle({ mode, onChange }) {
  return (
    <div className="inline-flex rounded-control border border-ink-200 p-0.5">
      <button
        type="button"
        onClick={() => onChange('chart')}
        aria-pressed={mode === 'chart'}
        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === 'chart' ? 'bg-dodger-500 text-white' : 'text-ink-500 hover:text-ink-900'
        }`}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Chart
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={mode === 'table'}
        className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
          mode === 'table' ? 'bg-dodger-500 text-white' : 'text-ink-500 hover:text-ink-900'
        }`}
      >
        <Table2 className="h-3.5 w-3.5" />
        Table
      </button>
    </div>
  );
}
