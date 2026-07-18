import { apiClient } from './client';

// GET /admin/config — requires any of 5 specific configure_* permissions
export const getAllConfigs = async () => {
  const { data } = await apiClient.get('/config');
  return data;
};

// PATCH /admin/config/update — { key, value }, requires any of ~20 configure_* permissions
export const updateConfig = async (key, value) => {
  const { data } = await apiClient.patch('/config/update', { key, value });
  return data;
};
