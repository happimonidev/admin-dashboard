import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import * as authApi from '../api/auth';
import { getSession, saveSession, clearSession } from './session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

  // ── Step 1: email + password → OTP sent to admin's email ──────────────
  const requestOTP = useCallback(async (email, password) => {
    const result = await authApi.login(email, password);
    if (!result.success) throw new Error(result.message);
    return result.data.adminID;
  }, []);

  // ── Step 2: OTP → establishes the session ──────────────────────────────
  const verifyOTP = useCallback(async (adminID, otp) => {
    const result = await authApi.verifyOTP(adminID, otp);
    if (!result.success) throw new Error(result.message);
    const newSession = saveSession(result.data);
    setSession(newSession);
    return newSession;
  }, []);

  const resendOTP = useCallback(async (adminID) => {
    const result = await authApi.resendOTP(adminID);
    if (!result.success) throw new Error(result.message);
    return result.message;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Best-effort — even if this fails (e.g. token already expired),
      // we still clear the local session below.
      await authApi.logout();
    } catch {
      // Intentionally ignored — see comment above.
    } finally {
      clearSession();
      setSession(null);
    }
  }, []);

  // Called when the session countdown hits zero, or the API returns 401.
  // No server round-trip — the token is already dead at that point.
  const forceLocalLogout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // "Stay signed in" — exchanges the current (still-valid) token for a
  // fresh one with a reset expiry. Updates loginAt so the client-side
  // countdown recalculates from now, in step with the new JWT's actual exp.
  const refreshSession = useCallback(async () => {
    const result = await authApi.refreshToken();
    if (!result.success) throw new Error(result.message);
    setSession((prev) => {
      if (!prev) return prev;
      const updated = saveSession({
        ...prev,
        accessToken: result.data.accessToken,
        sessionTimeout: result.data.sessionTimeout,
      });
      return updated;
    });
  }, []);

  const permissionSet = useMemo(
    () => new Set(session?.permissions || []),
    [session]
  );

  const hasPermission = useCallback(
    (key) => permissionSet.has(key),
    [permissionSet]
  );

  const hasAnyPermission = useCallback(
    (keys = []) => keys.some((k) => permissionSet.has(k)),
    [permissionSet]
  );

  const hasAllPermissions = useCallback(
    (keys = []) => keys.every((k) => permissionSet.has(k)),
    [permissionSet]
  );

  const value = {
    session,
    isAuthenticated: !!session?.accessToken,
    requestOTP,
    verifyOTP,
    resendOTP,
    logout,
    forceLocalLogout,
    refreshSession,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
