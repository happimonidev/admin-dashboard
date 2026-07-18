import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSessionExpiryMs } from '../auth/session';

const WARNING_WINDOW_SECONDS = 60;

/**
 * Ticks every second while a session is active and reports how much time
 * is left before the JWT expires (client-side estimate, mirrors the
 * backend's expiresIn). Surfaces a warning flag in the final 60 seconds,
 * matching the spec's countdown modal requirement.
 */
export function useSessionTimer() {
  const { session } = useAuth();
  const [secondsRemaining, setSecondsRemaining] = useState(null);

  useEffect(() => {
    if (!session) {
      setSecondsRemaining(null);
      return;
    }

    const expiryMs = getSessionExpiryMs(session);
    if (!expiryMs) {
      setSecondsRemaining(null);
      return;
    }

    const tick = () => {
      const remainingMs = expiryMs - Date.now();
      setSecondsRemaining(Math.max(0, Math.ceil(remainingMs / 1000)));
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [session]);

  return {
    secondsRemaining,
    showWarning:
      secondsRemaining !== null &&
      secondsRemaining <= WARNING_WINDOW_SECONDS &&
      secondsRemaining > 0,
    isExpired: secondsRemaining !== null && secondsRemaining <= 0,
  };
}
