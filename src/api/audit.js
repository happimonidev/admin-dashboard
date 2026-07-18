import { apiClient } from './client';

// GET /admin/audit — requires view_audit_logs
// Supports ?adminID=&action=&resource=&from=&to=&skip=&limit=
export const getLogs = async (filters = {}) => {
  const { data } = await apiClient.get('/audit', { params: filters });
  return data;
};
