import axios from 'axios';
import { getSession, clearSession } from '../auth/session';

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  // Fail loudly in dev rather than silently hitting a relative path
  // that happens to 404 in a confusing way.
  console.error(
    'VITE_API_URL is not set. Add it to your .env file (see .env.example).'
  );
}

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach JWT to every request ──────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// ── Central response handling ────────────────────────────────────────────
// 401 → session is dead (expired/invalid/deactivated) — clear it and force
//       a full redirect to /login so all in-memory state resets cleanly.
// 403 → caller is authenticated but lacks permission — let the calling code
//       decide how to surface this (we don't know the context here).
let onUnauthorized = () => {
  window.location.assign('/login');
};

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      onUnauthorized();
    }

    // Normalize so every caller's `.message` is the backend's actual
    // explanation (e.g. "No valid rows found in file.") rather than axios's
    // generic "Request failed with status code 400" — previously this was
    // lost because axios rejects before any of our own success/message
    // parsing code ever runs.
    const backendMessage = error.response?.data?.message;
    if (backendMessage) {
      const normalized = new Error(backendMessage);
      normalized.status = error.response.status;
      return Promise.reject(normalized);
    }

    return Promise.reject(error);
  }
);
