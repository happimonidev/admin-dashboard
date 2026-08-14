import { apiClient } from './client';

// GET /admin/incomplete-registrations?status=&skip=&limit=&search=&from=&to=&export= — requires view_all_incomplete_registrations
export const getAllIncompleteRegistrations = async (params = {}) => {
  const { data } = await apiClient.get('/incomplete-registrations', { params });
  return data;
};

// GET /admin/incomplete-registrations/assigned?skip=&limit=&search=&from=&to=&export= — own assigned, requires view_assigned_incomplete_registrations
export const getAssignedIncompleteRegistrations = async (params = {}) => {
  const { data } = await apiClient.get('/incomplete-registrations/assigned', { params });
  return data;
};

// PATCH /admin/incomplete-registrations/:id/status — { status, resolution? }
export const updateIncompleteRegistrationStatus = async (id, status, resolution) => {
  const { data } = await apiClient.patch(`/incomplete-registrations/${id}/status`, {
    status,
    resolution,
  });
  return data;
};

// PATCH /admin/incomplete-registrations/:id/reassign — { newAssignee }
export const reassignIncompleteRegistration = async (id, newAssignee) => {
  const { data } = await apiClient.patch(`/incomplete-registrations/${id}/reassign`, {
    newAssignee,
  });
  return data;
};
