import { useState, useEffect } from 'react';

const STORAGE_KEY = 'appcredit_view_mode';

// Shared across Dashboard and Reports — one preference, not per-page, so
// switching to Table view in one place is remembered everywhere.
export function useViewMode(defaultMode = 'chart') {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || defaultMode;
    } catch {
      return defaultMode;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage unavailable (private browsing, quota) — preference just
      // won't persist across reloads, not worth surfacing an error for.
    }
  }, [mode]);

  return [mode, setMode];
}
