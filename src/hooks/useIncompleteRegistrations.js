import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as incompleteRegApi from '../api/incompleteRegistrations';

const unwrapVoid = (result) => {
  if (!result.success) throw new Error(result.message);
  return result;
};

const unwrapWithTotal = (result) => {
  if (!result.success) throw new Error(result.message);
  return { data: result.data, total: result.total };
};

export const useAllIncompleteRegistrations = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['incomplete-registrations', 'all', params],
    queryFn: async () => unwrapWithTotal(await incompleteRegApi.getAllIncompleteRegistrations(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useAssignedIncompleteRegistrations = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['incomplete-registrations', 'assigned', params],
    queryFn: async () => unwrapWithTotal(await incompleteRegApi.getAssignedIncompleteRegistrations(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

const invalidateIncompleteRegCaches = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ['incomplete-registrations'] });

export const useUpdateIncompleteRegistrationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registrationID, status, resolution }) =>
      unwrapVoid(await incompleteRegApi.updateIncompleteRegistrationStatus(registrationID, status, resolution)),
    onSuccess: () => invalidateIncompleteRegCaches(queryClient),
  });
};

export const useReassignIncompleteRegistration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ registrationID, newAssignee }) =>
      unwrapVoid(await incompleteRegApi.reassignIncompleteRegistration(registrationID, newAssignee)),
    onSuccess: () => invalidateIncompleteRegCaches(queryClient),
  });
};
