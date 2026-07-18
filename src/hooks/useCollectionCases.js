import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as casesApi from '../api/collectionCases';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapVoid = (result) => {
  if (!result.success) throw new Error(result.message);
  return result;
};

const unwrapWithTotal = (result) => {
  if (!result.success) throw new Error(result.message);
  return { data: result.data, total: result.total };
};

export const useAllCases = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['collection-cases', 'all', params],
    queryFn: async () => unwrapWithTotal(await casesApi.getAllCases(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

// params defaults to {} — no skip/limit sent returns everything (backend's
// backward-compatible default), which is what Dashboard's workload widget
// needs for an accurate resolved/recovered count; CollectionCasesList
// passes real skip/limit/search for actual pagination.
export const useAssignedCases = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['collection-cases', 'assigned', params],
    queryFn: async () => unwrapWithTotal(await casesApi.getAssignedCases(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useOverdueLoansForCase = (enabled = true) =>
  useQuery({
    queryKey: ['collection-cases', 'overdue-loans'],
    queryFn: async () => unwrap(await casesApi.getOverdueLoansForCase()),
    enabled,
  });

const invalidateCaseCaches = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['collection-cases'] });

export const useCreateCase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await casesApi.createCase(payload)),
    onSuccess: () => invalidateCaseCaches(queryClient),
  });
};

export const useUpdateCaseStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseID, status, amountRecovered }) =>
      unwrapVoid(await casesApi.updateCaseStatus(caseID, status, amountRecovered)),
    onSuccess: () => invalidateCaseCaches(queryClient),
  });
};

export const useReassignCase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseID, newAssignee }) =>
      unwrapVoid(await casesApi.reassignCase(caseID, newAssignee)),
    onSuccess: () => invalidateCaseCaches(queryClient),
  });
};
