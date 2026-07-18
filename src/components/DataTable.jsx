import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, AlertCircle, Inbox } from 'lucide-react';
import Spinner from './ui/Spinner';
import EmptyState from './ui/EmptyState';

/**
 * columns: Array<{
 *   key: string,               // unique key for this column
 *   header: string,
 *   accessor?: (row) => any,   // raw value, used for sorting + mobile fallback display
 *   render?: (row) => ReactNode, // custom cell content; falls back to accessor(row)
 *   sortable?: boolean,
 *   className?: string,        // applied to <td>/<th>
 *   hideOnMobile?: boolean,    // omit from the stacked mobile card
 * }>
 */
export default function DataTable({
  columns,
  data = [],
  getRowId,
  isLoading = false,
  error = null,
  emptyTitle = 'No records found',
  emptyDescription,
  onRowClick,
  pageSize = 20,
  rowActions, // (row) => ReactNode, rendered at the end of each row/card
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);

  const getValue = (row, col) =>
    col.accessor ? col.accessor(row) : row[col.key];

  // Empty string is functionally "no value" for display purposes — the
  // same as null/undefined. `??` alone misses this, so several backend
  // fields that default to '' (rather than null) would otherwise render
  // as a blank cell instead of a clear '—'.
  const displayValue = (row, col) => {
    const v = getValue(row, col);
    return v === null || v === undefined || v === '' ? '—' : v;
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = getValue(a, col);
      const bv = getValue(b, col);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const paged = sorted.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const toggleSort = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-ink-500">
        <Spinner />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load this data"
        description={error.message || 'Something went wrong. Please try again.'}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div>
      {/* ── Desktop / tablet: real table ───────────────────────────── */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 font-medium ${col.className || ''} ${
                    col.sortable ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={() => toggleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    )}
                  </span>
                </th>
              ))}
              {rowActions && <th className="px-3 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-ink-50 last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-ink-50' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-3 py-3 text-ink-700 ${col.className || ''}`}>
                    {col.render ? col.render(row) : displayValue(row, col)}
                  </td>
                ))}
                {rowActions && (
                  <td
                    className="px-3 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: stacked cards, one per row ─────────────────────── */}
      <div className="flex flex-col gap-3 sm:hidden">
        {paged.map((row) => (
          <div
            key={getRowId(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`rounded-card border border-ink-100 p-3 ${
              onRowClick ? 'cursor-pointer active:bg-ink-50' : ''
            }`}
          >
            <dl className="flex flex-col gap-1.5">
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((col) => (
                  <div key={col.key} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-400">
                      {col.header}
                    </dt>
                    <dd className="truncate text-right text-sm text-ink-700">
                      {col.render ? col.render(row) : displayValue(row, col)}
                    </dd>
                  </div>
                ))}
            </dl>
            {rowActions && (
              <div
                className="mt-3 flex justify-end border-t border-ink-50 pt-3"
                onClick={(e) => e.stopPropagation()}
              >
                {rowActions(row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>
            Page {pageSafe} of {totalPages} · {sorted.length} total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-control px-3 py-1.5 ring-1 ring-ink-200 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-control px-3 py-1.5 ring-1 ring-ink-200 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
