const SESSION_KEY = 'appcredit_admin_session';

// Session shape:
// {
//   adminID, fullName, email, roleID, roleName,
//   sessionTimeout,   // minutes, from login response
//   accessToken,
//   permissions,      // string[]
//   loginAt,          // ms epoch — used to compute expiry client-side
// }

export const getSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveSession = (data) => {
  const session = { ...data, loginAt: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

// Expiry is derived from loginAt + sessionTimeout (minutes), mirroring how
// the backend sets the JWT's `expiresIn`. This is a client-side estimate
// for UI purposes (countdown modal) only — the backend's own JWT expiry
// check is what actually enforces the session ending.
export const getSessionExpiryMs = (session) => {
  if (!session?.loginAt || !session?.sessionTimeout) return null;
  return session.loginAt + session.sessionTimeout * 60 * 1000;
};
