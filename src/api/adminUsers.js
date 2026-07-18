import { apiClient } from './client';

// GET /admin/users?skip=&limit=&search=&export= — requires view_admin_users
export const getAllAdmins = async (params = {}) => {
  const { data } = await apiClient.get('/users', { params });
  return data;
};

// GET /admin/users/:adminID — requires view_admin_users
export const getAdminByID = async (adminID) => {
  const { data } = await apiClient.get(`/users/${adminID}`);
  return data;
};

// GET /admin/users/assignable?roleFunction=telemarketer|collection_officer|customer_care|junior_operations
export const getAssignableAdmins = async (roleFunction) => {
  const { data } = await apiClient.get('/users/assignable', {
    params: { roleFunction },
  });
  return data;
};

// POST /admin/users/create — { fullName, email, roleID }, requires create_admin_user
export const createAdmin = async (payload) => {
  const { data } = await apiClient.post('/users/create', payload);
  return data;
};

// PATCH /admin/users/:adminID/edit — { fullName?, email?, roleID? }, requires edit_admin_user
export const editAdmin = async (adminID, payload) => {
  const { data } = await apiClient.patch(`/users/${adminID}/edit`, payload);
  return data;
};

// PATCH /admin/users/:adminID/deactivate — requires deactivate_admin_user
export const deactivateAdmin = async (adminID) => {
  const { data } = await apiClient.patch(`/users/${adminID}/deactivate`);
  return data;
};

// PATCH /admin/users/:adminID/reactivate — requires deactivate_admin_user (same permission as deactivate, confirmed from route)
export const reactivateAdmin = async (adminID) => {
  const { data } = await apiClient.patch(`/users/${adminID}/reactivate`);
  return data;
};

// POST /admin/users/:adminID/reset-password — requires reset_admin_password
export const resetAdminPassword = async (adminID) => {
  const { data } = await apiClient.post(`/users/${adminID}/reset-password`);
  return data;
};

