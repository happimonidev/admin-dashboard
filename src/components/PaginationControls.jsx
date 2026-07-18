export default function PaginationControls({ page, setPage, total, limit }) {
  if (!total || total <= limit) return null;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-control px-3 py-1.5 ring-1 ring-ink-200 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-control px-3 py-1.5 ring-1 ring-ink-200 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
