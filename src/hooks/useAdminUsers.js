import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as adminUsersApi from '../api/adminUsers';

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

// params defaults to {} — no skip/limit sent returns everything (backend's
// backward-compatible default). Audit Logs and Reports both need the full
// list for their admin-name pickers/resolution, so they call this with {}
// explicitly; AdminUsersList passes real skip/limit/search for pagination.
export const useAllAdmins = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['admin-users', params],
    queryFn: async () => unwrapWithTotal(await adminUsersApi.getAllAdmins(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useAssignableAdmins = (roleFunction, enabled = true) =>
  useQuery({
    queryKey: ['assignable-admins', roleFunction],
    queryFn: async () => unwrap(await adminUsersApi.getAssignableAdmins(roleFunction)),
    enabled: !!roleFunction && enabled,
  });

const invalidateAdminCaches = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  queryClient.invalidateQueries({ queryKey: ['assignable-admins'] });
};

export const useCreateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await adminUsersApi.createAdmin(payload)),
    onSuccess: () => invalidateAdminCaches(queryClient),
  });
};

export const useEditAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adminID, ...payload }) =>
      unwrapVoid(await adminUsersApi.editAdmin(adminID, payload)),
    onSuccess: () => invalidateAdminCaches(queryClient),
  });
};

export const useDeactivateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adminID) => unwrapVoid(await adminUsersApi.deactivateAdmin(adminID)),
    onSuccess: () => invalidateAdminCaches(queryClient),
  });
};

export const useReactivateAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adminID) => unwrapVoid(await adminUsersApi.reactivateAdmin(adminID)),
    onSuccess: () => invalidateAdminCaches(queryClient),
  });
};

export const useResetAdminPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adminID) => unwrapVoid(await adminUsersApi.resetAdminPassword(adminID)),
    onSuccess: () => invalidateAdminCaches(queryClient),
  });
};
