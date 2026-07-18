import { useQuery } from '@tanstack/react-query';
import * as reportsApi from '../api/reports';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapWithTotal = (result) => {
  if (!result.success) throw new Error(result.message);
  return { data: result.data, total: result.total };
};

// params = { from?, to? } — plain YYYY-MM-DD strings, sent as-is. The
// backend parses them with startOf('day')/endOf('day') in Africa/Lagos,
// so no client-side end-of-day workaround is needed here (unlike Audit
// Logs, whose date parsing is cruder).
export const useTelemarketerTeamReport = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['reports', 'telemarketer-team', params],
    queryFn: async () => unwrap(await reportsApi.getTelemarketerTeamReport(params)),
    enabled,
  });

export const useCollectionTeamReport = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['reports', 'collection-team', params],
    queryFn: async () => unwrap(await reportsApi.getCollectionTeamReport(params)),
    enabled,
  });

export const useCustomerCareTeamReport = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['reports', 'customer-care-team', params],
    queryFn: async () => unwrap(await reportsApi.getCustomerCareTeamReport(params)),
    enabled,
  });

// No date params — always current state.
export const useNPLReport = (enabled = true) =>
  useQuery({
    queryKey: ['reports', 'npl'],
    queryFn: async () => unwrap(await reportsApi.getNPLReport()),
    enabled,
  });

export const useRevenueReport = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: async () => unwrap(await reportsApi.getRevenueReport(params)),
    enabled,
  });

// Only loansThisMonth/leadsConvertedThisMonth actually respect params —
// totalUsers/totalOverdueLoans/openComplaints remain always-current
// regardless of what's passed here (backend behavior, not a frontend gap).
export const useCompanyKPISummary = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['reports', 'company-kpi', params],
    queryFn: async () => unwrap(await reportsApi.getCompanyKPISummary(params)),
    enabled,
  });

// No date params — always current state.
// params defaults to {} — no skip/limit sent returns everything (backend's
// backward-compatible default), used by the chart's monthly timeline which
// needs the complete dataset; the table view passes real skip/limit.
export const usePayoutLogs = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['reports', 'payout-logs', params],
    queryFn: async () => unwrapWithTotal(await reportsApi.getPayoutLogs(params)),
    enabled,
    placeholderData: (prev) => prev,
  });
