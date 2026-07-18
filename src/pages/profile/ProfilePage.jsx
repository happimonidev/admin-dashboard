import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useOwnProfile, useChangePassword } from '../../hooks/useProfile';
import { useOwnScores } from '../../hooks/useScoring';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import DetailRow from '../../components/ui/DetailRow';
import Badge from '../../components/ui/Badge';
import { getAdminStatusMeta } from '../../lib/status';
import { formatDate, formatDateTime } from '../../lib/format';
import { PASSWORD_RULE, PASSWORD_RULE_HINT } from '../../lib/validation';
import { AlertCircle, Star } from 'lucide-react';

function MyScoresCard() {
  // GET /admin/scoring/own — self-access, no permission required, so this
  // works the same for every admin regardless of role.
  const { data: scores, isLoading, error } = useOwnScores();

  return (
    <Card className="p-4 sm:col-span-2">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-control bg-dodger-50 p-2 text-dodger-500">
          <Star className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-ink-900">My Qualitative Scores</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm text-danger-500">
          <AlertCircle className="h-4 w-4" />
          {error.message}
        </div>
      ) : !scores || scores.length === 0 ? (
        <p className="text-sm text-ink-500">No qualitative scores recorded for you yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-ink-50">
          {scores.map((s) => (
            <div key={s.scoreID} className="py-2.5 first:pt-0 last:pb-0">
              <p className="text-sm font-medium text-ink-900">
                {s.metricName}: <span className="font-semibold">{s.score}</span>
              </p>
              {s.comments && <p className="mt-0.5 text-sm text-ink-500">{s.comments}</p>}
              <p className="mt-1 text-xs text-ink-400">
                By {s.scoredByName} · {formatDateTime(s.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ChangePasswordCard() {
  const navigate = useNavigate();
  const { forceLocalLogout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [success, setSuccess] = useState(false);
  const mutation = useChangePassword();

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
      // Backend invalidates the current session token on password change —
      // it's already dead server-side, so just clear local state and
      // redirect rather than attempting a normal logout round-trip.
      setTimeout(() => {
        forceLocalLogout();
        navigate('/login', { replace: true });
      }, 2000);
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  if (success) {
    return (
      <Card className="p-4">
        <p className="text-sm font-medium text-success-700">
          Password changed successfully.
        </p>
        <p className="mt-1 text-sm text-ink-500">
          You'll be signed out in a moment — please log in again with your new password.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-medium text-ink-900">Change password</p>
      <form onSubmit={handleSubmit} noValidate>
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
          Current password
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
        <p className="mt-1.5 text-xs text-ink-400">
          {PASSWORD_RULE_HINT}
        </p>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Changing…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const { session } = useAuth();
  const { data: profile, isLoading, error } = useOwnProfile();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink-900">My Profile</h1>
        <p className="mt-0.5 text-sm text-ink-500">Your account details.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <EmptyState icon={AlertCircle} title="Couldn't load your profile" description={error.message} />
      ) : profile ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
              Account
            </p>
            <dl>
              <DetailRow label="Full name" value={profile.fullName} />
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Role" value={session?.roleName} />
              <DetailRow
                label="Status"
                value={
                  <Badge tone={getAdminStatusMeta(profile.status).tone}>
                    {getAdminStatusMeta(profile.status).label}
                  </Badge>
                }
              />
              <DetailRow label="Admin ID" value={<span className="font-mono text-xs">{profile.adminID}</span>} />
              <DetailRow label="Member since" value={profile.createdAt ? formatDate(profile.createdAt) : undefined} />
            </dl>
          </Card>

          <ChangePasswordCard />

          <MyScoresCard />
        </div>
      ) : null}
    </div>
  );
}
