import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useSessionTimer } from '../hooks/useSessionTimer';

export default function SessionCountdownModal() {
  const { isAuthenticated, refreshSession, forceLocalLogout } = useAuth();
  const { secondsRemaining, showWarning, isExpired } = useSessionTimer();
  const navigate = useNavigate();
  const [extending, setExtending] = useState(false);
  const [error, setError] = useState('');

  // Session expired — invalidate locally and bounce to login.
  // The backend already considers the token dead; nothing to await.
  useEffect(() => {
    if (isAuthenticated && isExpired) {
      forceLocalLogout();
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isExpired, forceLocalLogout, navigate]);

  // Clear any previous error once the warning window re-opens fresh —
  // otherwise a stale failure message could linger into the next warning.
  useEffect(() => {
    if (showWarning) setError('');
  }, [showWarning]);

  if (!isAuthenticated || !showWarning) return null;

  const handleStayLoggedIn = async () => {
    setExtending(true);
    setError('');
    try {
      await refreshSession();
    } catch (err) {
      // Surfaced to the admin now, instead of failing silently while the
      // countdown kept running underneath with no visible explanation.
      setError(
        err.message || 'Could not extend your session. Please try again.'
      );
      console.error('Session refresh failed:', err);
    } finally {
      setExtending(false);
    }
  };

  const handleLogoutNow = () => {
    forceLocalLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-countdown-title"
    >
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-xl">
        <h2
          id="session-countdown-title"
          className="text-base font-semibold text-ink-900"
        >
          You're about to be signed out
        </h2>
        <p className="mt-2 text-sm text-ink-500">
          You've been inactive for a while. For your account's security,
          you'll be signed out in{' '}
          <span className="font-semibold text-ink-900">
            {secondsRemaining}
          </span>{' '}
          second{secondsRemaining === 1 ? '' : 's'}.
        </p>
        {error && (
          <div
            role="alert"
            className="mt-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700"
          >
            {error}
          </div>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleLogoutNow}
            className="rounded-control px-4 py-2 text-sm font-medium text-ink-500 hover:bg-ink-50"
          >
            Log out now
          </button>
          <button
            type="button"
            onClick={handleStayLoggedIn}
            disabled={extending}
            className="rounded-control bg-dodger-500 px-4 py-2 text-sm font-medium text-white hover:bg-dodger-600 disabled:opacity-60"
          >
            {extending ? 'Staying signed in…' : 'Stay signed in'}
          </button>
        </div>
      </div>
    </div>
  );
}
