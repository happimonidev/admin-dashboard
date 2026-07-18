import { useQuery, useMutation } from '@tanstack/react-query';
import * as profileApi from '../api/profile';
import * as authApi from '../api/auth';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

export const useOwnProfile = () =>
  useQuery({
    queryKey: ['profile', 'own'],
    queryFn: async () => unwrap(await profileApi.getOwnProfile()),
  });

// On success, the backend invalidates the current session token (forces
// re-login) — the caller is responsible for logging out locally afterward.
export const useChangePassword = () =>
  useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const result = await authApi.changePassword(currentPassword, newPassword);
      if (!result.success) throw new Error(result.message);
      return result;
    },
  });
