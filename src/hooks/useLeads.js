import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as leadsApi from '../api/leads';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapWithTotal = (result) => {
  if (!result.success) throw new Error(result.message);
  return { data: result.data, total: result.total };
};

const unwrapVoid = (result) => {
  if (!result.success) throw new Error(result.message);
  return result;
};

export const useAllLeads = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['leads', 'all', params],
    queryFn: async () => unwrapWithTotal(await leadsApi.getAllLeads(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

// params defaults to {} — sending no skip/limit returns everything
// (backend's backward-compatible default), which is what Dashboard's
// workload widget needs for an accurate converted-count; LeadsList passes
// real skip/limit/search for actual pagination.
export const useAssignedLeads = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['leads', 'assigned', params],
    queryFn: async () => unwrapWithTotal(await leadsApi.getAssignedLeads(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

const invalidateLeadCaches = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['leads'] });

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await leadsApi.createLead(payload)),
    onSuccess: () => invalidateLeadCaches(queryClient),
  });
};

export const useBulkUploadLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, source }) => unwrap(await leadsApi.bulkUploadLeads(file, source)),
    onSuccess: () => invalidateLeadCaches(queryClient),
  });
};

export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadID, status, phoneNumber }) =>
      unwrapVoid(await leadsApi.updateLeadStatus(leadID, status, phoneNumber)),
    onSuccess: () => invalidateLeadCaches(queryClient),
  });
};

export const useReassignLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadID, newAssignee }) =>
      unwrapVoid(await leadsApi.reassignLead(leadID, newAssignee)),
    onSuccess: () => invalidateLeadCaches(queryClient),
  });
};
