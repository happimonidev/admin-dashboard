import { apiClient } from './client';

// GET /admin/users/profile — requires view_own_profile
export const getOwnProfile = async () => {
  const { data } = await apiClient.get('/users/profile');
  return data;
};
