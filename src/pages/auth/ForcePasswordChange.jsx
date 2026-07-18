import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useChangePassword } from '../../hooks/useProfile';
import Logo from '../../components/ui/Logo';
import { PASSWORD_RULE, PASSWORD_RULE_HINT } from '../../lib/validation';

export default function ForcePasswordChange() {
  const { session, isAuthenticated, forceLocalLogout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [success, setSuccess] = useState(false);
  const mutation = useChangePassword();

  // Not logged in at all — nothing to force here.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in and already past first login — this screen doesn't apply,
  // send them to the dashboard instead of a dead-end locked screen.
  if (!session?.isFirstLogin) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (newPassword !== confirmPassword) {
      setValidationError('New password and confirmation do not match.');
      return;
    }
    if (!PASSWORD_RULE.test(newPassword)) {
      setValidationError(
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'
      );
      return;
    }

    try {
      await mutation.mutateAsync({ currentPassword, newPassword });
      setSuccess(true);
      setTimeout(() => {
        forceLocalLogout();
        navigate('/login', { replace: true });
      }, 1800);
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelain px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" wordmarkPlacement="bottom" />
        </div>

        <div className="rounded-card bg-white p-6 shadow-sm ring-1 ring-ink-100">
          <h1 className="text-base font-semibold text-ink-900">
            Set a new password to continue
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            This is your first sign-in, or your password was recently reset.
            You need to set a new password before you can use the admin panel.
          </p>

          {success ? (
            <div className="mt-4 rounded-control bg-success-50 px-3 py-2 text-sm text-success-700">
              Password changed successfully. Redirecting you to sign in again…
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4" noValidate>
              {mutation.isError && (
                <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  {mutation.error.message}
                </div>
              )}
              {validationError && (
                <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
                  {validationError}
                </div>
              )}
              <label className="block text-sm font-medium text-ink-700">
                Current (temporary) password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-ink-700">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
                />
              </label>
              <label className="mt-3 block text-sm font-medium text-ink-700">
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
                />
              </label>
              <p className="mt-1.5 text-xs text-ink-400">{PASSWORD_RULE_HINT}</p>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="mt-4 w-full rounded-control bg-dodger-500 py-2.5 text-sm font-semibold text-white hover:bg-dodger-600 disabled:opacity-60"
              >
                {mutation.isPending ? 'Changing…' : 'Change password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
