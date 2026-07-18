import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as complaintsApi from '../api/complaints';

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

export const useAllComplaints = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['complaints', 'all', params],
    queryFn: async () => unwrapWithTotal(await complaintsApi.getAllComplaints(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

// params defaults to {} — no skip/limit sent returns everything (backend's
// backward-compatible default), which is what Dashboard's workload widget
// needs for an accurate resolved-count; ComplaintsList passes real
// skip/limit/search for actual pagination.
export const useAssignedComplaints = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['complaints', 'assigned', params],
    queryFn: async () => unwrapWithTotal(await complaintsApi.getAssignedComplaints(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

const invalidateComplaintCaches = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['complaints'] });

export const useCreateComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await complaintsApi.createComplaint(payload)),
    onSuccess: () => invalidateComplaintCaches(queryClient),
  });
};

export const useUpdateComplaintStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ complaintID, status, resolution }) =>
      unwrapVoid(await complaintsApi.updateComplaintStatus(complaintID, status, resolution)),
    onSuccess: () => invalidateComplaintCaches(queryClient),
  });
};

export const useReassignComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ complaintID, newAssignee }) =>
      unwrapVoid(await complaintsApi.reassignComplaint(complaintID, newAssignee)),
    onSuccess: () => invalidateComplaintCaches(queryClient),
  });
};
