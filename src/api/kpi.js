import { apiClient } from './client';

// GET /admin/kpi/metrics?roleFunction=telemarketer|collection_officer|customer_care|junior_operations
export const getMetrics = async (roleFunction) => {
  const { data } = await apiClient.get('/kpi/metrics', { params: { roleFunction } });
  return data;
};

// GET /admin/kpi/own — requires view_own_kpi
export const getOwnKPI = async () => {
  const { data } = await apiClient.get('/kpi/own');
  return data;
};

// GET /admin/kpi/team/:roleID — requires any of the view_*_kpi permissions
export const getTeamKPI = async (roleID) => {
  const { data } = await apiClient.get(`/kpi/team/${roleID}`);
  return data;
};

// POST /admin/kpi/set — { targetAdminID, targetRoleID, roleFunction, metrics: [], period, targetValue }
export const setTarget = async (payload) => {
  const { data } = await apiClient.post('/kpi/set', payload);
  return data;
};

// GET /admin/kpi/history — { adminID? or roleID?, metric, period, limit? }
export const getHistory = async (params) => {
  const { data } = await apiClient.get('/kpi/history', { params });
  return data;
};

// GET /admin/kpi/records — { adminID? or roleID?, metric?, from?, to?, search?, skip?, limit?, export? }
export const getRecords = async (params) => {
  const { data } = await apiClient.get('/kpi/records', { params });
  return data;
};

// PATCH /admin/kpi/target/:targetID — { targetValue?, period? } — metrics
// cannot be changed via this endpoint, confirmed against the actual service.
export const updateTarget = async (targetID, payload) => {
  const { data } = await apiClient.patch(`/kpi/target/${targetID}`, payload);
  return data;
};

// POST /admin/kpi/result/submit — { targetAdminID, targetRoleID, roleFunction, metric, period, value }
export const submitResult = async (payload) => {
  const { data } = await apiClient.post('/kpi/result/submit', payload);
  return data;
};

// PATCH /admin/kpi/result/:adminID/override — { roleFunction, metric, period, newValue, overrideReason? }
export const overrideResult = async (adminID, payload) => {
  const { data } = await apiClient.patch(`/kpi/result/${adminID}/override`, payload);
  return data;
};
