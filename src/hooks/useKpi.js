import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as kpiApi from '../api/kpi';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapVoid = (result) => {
  if (!result.success) throw new Error(result.message);
  return result;
};

export const useKpiMetrics = (roleFunction, enabled = true) =>
  useQuery({
    queryKey: ['kpi-metrics', roleFunction],
    queryFn: async () => unwrap(await kpiApi.getMetrics(roleFunction)),
    enabled: !!roleFunction && enabled,
  });

export const useOwnKPI = (enabled = true) =>
  useQuery({
    queryKey: ['kpi', 'own'],
    queryFn: async () => unwrap(await kpiApi.getOwnKPI()),
    enabled,
  });

export const useTeamKPI = (roleID, enabled = true) =>
  useQuery({
    queryKey: ['kpi', 'team', roleID],
    queryFn: async () => unwrap(await kpiApi.getTeamKPI(roleID)),
    enabled: !!roleID && enabled,
  });

const invalidateKpiCaches = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['kpi'] });

export const useKpiHistory = (params, enabled = true) =>
  useQuery({
    queryKey: ['kpi-history', params],
    queryFn: async () => unwrap(await kpiApi.getHistory(params)),
    enabled: !!params.metric && (!!params.adminID || !!params.roleID) && enabled,
  });

// Requires either adminID or roleID — same dual-scope convention as history.
export const useKpiRecords = (params, enabled = true) =>
  useQuery({
    queryKey: ['kpi-records', params],
    queryFn: async () => {
      const result = await kpiApi.getRecords(params);
      if (!result.success) throw new Error(result.message);
      return { data: result.data, total: result.total };
    },
    enabled: (!!params.adminID || !!params.roleID) && enabled,
    placeholderData: (prev) => prev,
  });

export const useSetTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrapVoid(await kpiApi.setTarget(payload)),
    onSuccess: () => invalidateKpiCaches(queryClient),
  });
};

export const useUpdateTarget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetID, ...payload }) => unwrapVoid(await kpiApi.updateTarget(targetID, payload)),
    onSuccess: () => invalidateKpiCaches(queryClient),
  });
};

export const useSubmitResult = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrapVoid(await kpiApi.submitResult(payload)),
    onSuccess: () => invalidateKpiCaches(queryClient),
  });
};

export const useOverrideResult = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adminID, ...payload }) => unwrapVoid(await kpiApi.overrideResult(adminID, payload)),
    onSuccess: () => invalidateKpiCaches(queryClient),
  });
};
