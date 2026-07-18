import { apiClient } from './client';

// GET /admin/roles?skip=&limit=&search=&export= — requires view_roles
export const getAllRoles = async (params = {}) => {
  const { data } = await apiClient.get('/roles', { params });
  return data;
};

// GET /admin/roles/:roleID — requires view_roles
export const getRoleByID = async (roleID) => {
  const { data } = await apiClient.get(`/roles/${roleID}`);
  return data;
};

// GET /admin/permissions — requires view_permissions
export const getAllPermissions = async () => {
  const { data } = await apiClient.get('/permissions');
  return data;
};

// POST /admin/roles/create — { name, description?, permissions?, sessionTimeout? }
export const createRole = async (payload) => {
  const { data } = await apiClient.post('/roles/create', payload);
  return data;
};

// PATCH /admin/roles/:roleID/edit — { name?, description?, sessionTimeout? }
export const editRole = async (roleID, payload) => {
  const { data } = await apiClient.patch(`/roles/${roleID}/edit`, payload);
  return data;
};

// POST /admin/roles/:roleID/permissions/add — { permission }
export const addPermission = async (roleID, permission) => {
  const { data } = await apiClient.post(`/roles/${roleID}/permissions/add`, { permission });
  return data;
};

// DELETE /admin/roles/:roleID/permissions/remove — { permission }
export const removePermission = async (roleID, permission) => {
  const { data } = await apiClient.delete(`/roles/${roleID}/permissions/remove`, {
    data: { permission },
  });
  return data;
};

// DELETE /admin/roles/:roleID — requires delete_role
export const deleteRole = async (roleID) => {
  const { data } = await apiClient.delete(`/roles/${roleID}`);
  return data;
};
