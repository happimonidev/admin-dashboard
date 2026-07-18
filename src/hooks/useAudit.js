import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as auditApi from '../api/audit';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

export const PAGE_SIZE = 50;

// Real server-side pagination — skip/limit are sent to the backend and a
// fresh page is fetched over the network each time, unlike the client-side
// chunking used elsewhere in the app (this is the one endpoint that
// actually supports it). placeholderData keeps the previous page visible
// while the next one loads, instead of flashing a blank/spinner state.
export const useAuditLogs = (filters, page, enabled = true) =>
  useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: async () =>
      unwrap(
        await auditApi.getLogs({
          ...filters,
          skip: (page - 1) * PAGE_SIZE,
          limit: PAGE_SIZE,
        })
      ),
    placeholderData: keepPreviousData,
    enabled,
  });
