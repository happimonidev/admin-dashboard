import { apiClient } from './client';

// POST /admin/auth/login — step 1: email + password → OTP sent
export const login = async (email, password) => {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data; // { success, message, data: { adminID } }
};

// POST /admin/auth/verify-otp — step 2: OTP → JWT + profile + permissions
export const verifyOTP = async (adminID, otp) => {
  const { data } = await apiClient.post('/auth/verify-otp', { adminID, otp });
  return data; // { success, message, data: { adminID, fullName, email, roleID, roleName, sessionTimeout, accessToken, permissions } }
};

// POST /admin/auth/resend-otp
export const resendOTP = async (adminID) => {
  const { data } = await apiClient.post('/auth/resend-otp', { adminID });
  return data;
};

// POST /admin/auth/logout — protected, requires current token
export const logout = async () => {
  const { data } = await apiClient.post('/auth/logout');
  return data;
};

// POST /admin/auth/change-password — protected
export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await apiClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data;
};

// POST /admin/auth/refresh-token — protected, called by the session
// countdown modal's "Stay signed in" action. adminID is derived server-side
// from the current (still-valid) token, no body needed.
export const refreshToken = async () => {
  const { data } = await apiClient.post('/auth/refresh-token');
  return data; // { success, message, data: { accessToken, sessionTimeout } }
};
