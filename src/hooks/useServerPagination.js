import { useState } from 'react';

export const DEFAULT_PAGE_SIZE = 50;

// Shared across every list that now has real server-side pagination —
// derives skip/limit from a simple page counter, same convention already
// used for Audit Logs.
export function useServerPagination(pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const skip = (page - 1) * pageSize;
  return { page, setPage, skip, limit: pageSize };
}
