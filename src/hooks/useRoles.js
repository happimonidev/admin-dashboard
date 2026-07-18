import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as rolesApi from '../api/roles';

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
// backward-compatible default), which AdminUsersList's role picker needs
// (a dropdown of every role, not paginated); RolesList passes real
// skip/limit/search for actual pagination.
export const useRoles = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['roles', params],
    queryFn: async () => unwrapWithTotal(await rolesApi.getAllRoles(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useRole = (roleID, enabled = true) =>
  useQuery({
    queryKey: ['roles', roleID],
    queryFn: async () => unwrap(await rolesApi.getRoleByID(roleID)),
    enabled: !!roleID && enabled,
  });

export const usePermissionsList = (enabled = true) =>
  useQuery({
    queryKey: ['permissions'],
    queryFn: async () => unwrap(await rolesApi.getAllPermissions()),
    enabled,
  });

const invalidateRoleCaches = (queryClient, roleID) => {
  queryClient.invalidateQueries({ queryKey: ['roles'] });
  if (roleID) queryClient.invalidateQueries({ queryKey: ['roles', roleID] });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrap(await rolesApi.createRole(payload)),
    onSuccess: () => invalidateRoleCaches(queryClient),
  });
};

export const useEditRole = (roleID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrapVoid(await rolesApi.editRole(roleID, payload)),
    onSuccess: () => invalidateRoleCaches(queryClient, roleID),
  });
};

export const useAddPermission = (roleID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (permission) => unwrapVoid(await rolesApi.addPermission(roleID, permission)),
    onSuccess: (_, permission) => {
      // Write the new permission straight into the cached role so the
      // checkbox reflects it instantly, rather than waiting on a
      // background refetch after invalidation.
      queryClient.setQueryData(['roles', roleID], (old) =>
        old
          ? { ...old, permissions: Array.from(new Set([...(old.permissions || []), permission])) }
          : old
      );
      invalidateRoleCaches(queryClient, roleID);
    },
  });
};

export const useRemovePermission = (roleID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (permission) => unwrapVoid(await rolesApi.removePermission(roleID, permission)),
    onSuccess: (_, permission) => {
      queryClient.setQueryData(['roles', roleID], (old) =>
        old
          ? { ...old, permissions: (old.permissions || []).filter((p) => p !== permission) }
          : old
      );
      invalidateRoleCaches(queryClient, roleID);
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roleID) => unwrapVoid(await rolesApi.deleteRole(roleID)),
    onSuccess: () => invalidateRoleCaches(queryClient),
  });
};
