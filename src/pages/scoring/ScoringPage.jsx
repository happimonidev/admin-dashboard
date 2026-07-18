import { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useAssignableAdmins } from '../../hooks/useAdminUsers';
import { useScoresByTarget, useCreateScore, useUpdateScore, useDeleteScore } from '../../hooks/useScoring';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { formatDateTime } from '../../lib/format';
import { AlertCircle, Trash2, Pencil } from 'lucide-react';

// Matches the master permission list exactly — scoring only covers these
// three functions (no junior_operations scoring permission exists).
const SCORE_FUNCTION_PERMISSIONS = [
  { permission: 'score_telemarketer_team', roleFunction: 'telemarketer', label: 'Telemarketer' },
  { permission: 'score_collection_officer_team', roleFunction: 'collection_officer', label: 'Collection Officer' },
  { permission: 'score_customer_care_team', roleFunction: 'customer_care', label: 'Customer Care' },
];

function AddScoreModal({ open, onClose, targetAdmin }) {
  const [metricName, setMetricName] = useState('');
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const mutation = useCreateScore();

  const handleClose = () => {
    mutation.reset();
    setMetricName(''); setScore(''); setComments('');
    onClose();
  };

  const handleSubmit = async () => {
    try {
      await mutation.mutateAsync({
        targetAdminID: targetAdmin.adminID,
        metricName,
        score: Number(score),
        comments: comments || undefined,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Score ${targetAdmin?.fullName || ''}`}>
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <label className="block text-sm font-medium text-ink-700">
        Metric name
        <input
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          placeholder="e.g. Customer interaction quality"
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Score
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Comments (optional)
        <textarea
          rows={2}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!metricName || score === '' || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save score'}
        </Button>
      </div>
    </Modal>
  );
}

function EditScoreModal({ open, onClose, scoreEntry, targetAdminID }) {
  const [score, setScore] = useState(scoreEntry?.score ?? '');
  const [comments, setComments] = useState(scoreEntry?.comments || '');
  const mutation = useUpdateScore(targetAdminID);

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ scoreID: scoreEntry.scoreID, score: Number(score), comments });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Edit score — ${scoreEntry?.metricName || ''}`}>
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <label className="block text-sm font-medium text-ink-700">
        Score
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Comments
        <textarea
          rows={2}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={score === '' || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}

export default function ScoringPage() {
  const { session, hasPermission, hasAnyPermission } = useAuth();
  const [roleFunction, setRoleFunction] = useState('');
  const [targetAdmin, setTargetAdmin] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [deletingID, setDeletingID] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const canScoreAny = hasPermission('score_any_team');
  const availableFunctions = useMemo(() => {
    if (canScoreAny) return SCORE_FUNCTION_PERMISSIONS;
    return SCORE_FUNCTION_PERMISSIONS.filter((f) => hasPermission(f.permission));
  }, [canScoreAny, hasPermission]);

  const canView = hasPermission('view_qualitative_scores');
  // Route-level gate for delete/edit — the backend also applies a second,
  // per-score scope check (score_any_team, or must be the original scorer)
  // which is mirrored below per-row rather than assumed.
  const canDeleteRoute = hasPermission('delete_qualitative_score');
  const canEditRoute = hasAnyPermission([
    'score_telemarketer_team',
    'score_collection_officer_team',
    'score_customer_care_team',
    'score_any_team',
  ]);

  const { data: admins, isLoading: adminsLoading } = useAssignableAdmins(roleFunction, !!roleFunction);
  const { data: scores, isLoading: scoresLoading, error: scoresError } = useScoresByTarget(
    targetAdmin?.adminID,
    canView
  );
  const deleteMutation = useDeleteScore(targetAdmin?.adminID);

  const canActOnScore = (s) => canScoreAny || s.scoredBy === session?.adminID;

  const handleDelete = async (scoreID) => {
    setDeletingID(scoreID);
    setDeleteError('');
    try {
      await deleteMutation.mutateAsync(scoreID);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingID(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink-900">Qualitative Scoring</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Free-form performance scores, supplementary to system KPIs.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 sm:max-w-lg">
        <label className="block text-sm font-medium text-ink-700">
          Team
          <select
            value={roleFunction}
            onChange={(e) => { setRoleFunction(e.target.value); setTargetAdmin(null); }}
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
          >
            <option value="">Select a team…</option>
            {availableFunctions.map((f) => (
              <option key={f.roleFunction} value={f.roleFunction}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-ink-700">
          Staff member
          {adminsLoading ? (
            <div className="mt-1 flex justify-center py-2"><Spinner /></div>
          ) : (
            <select
              value={targetAdmin?.adminID || ''}
              onChange={(e) => setTargetAdmin(admins?.find((a) => a.adminID === e.target.value) || null)}
              disabled={!roleFunction}
              className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
            >
              <option value="">Select a staff member…</option>
              {admins?.map((a) => (
                <option key={a.adminID} value={a.adminID}>{a.fullName}</option>
              ))}
            </select>
          )}
        </label>
      </div>

      {targetAdmin && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-ink-900">Scores for {targetAdmin.fullName}</p>
            <Button size="sm" onClick={() => setAddModalOpen(true)}>Add score</Button>
          </div>

          {deleteError && (
            <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {deleteError}
            </div>
          )}

          {!canView ? (
            <p className="text-sm text-ink-500">Your role doesn't include permission to view existing scores.</p>
          ) : scoresLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : scoresError ? (
            <EmptyState icon={AlertCircle} title="Couldn't load scores" description={scoresError.message} />
          ) : !scores || scores.length === 0 ? (
            <EmptyState title="No scores yet" description="Add the first qualitative score for this staff member." />
          ) : (
            <div className="flex flex-col divide-y divide-ink-50">
              {scores.map((s) => {
                const isDeleting = deletingID === s.scoreID;
                const canEditThis = canEditRoute && canActOnScore(s);
                const canDeleteThis = canDeleteRoute && canActOnScore(s);
                return (
                  <div key={s.scoreID} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">
                        {s.metricName}: <span className="font-semibold">{s.score}</span>
                      </p>
                      {s.comments && <p className="mt-0.5 text-sm text-ink-500">{s.comments}</p>}
                      <p className="mt-1 text-xs text-ink-400">
                        By {s.scoredByName} · {formatDateTime(s.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {canEditThis && (
                        <button
                          type="button"
                          onClick={() => setEditingScore(s)}
                          aria-label="Edit score"
                          className="rounded-control p-1.5 text-ink-400 hover:bg-dodger-50 hover:text-dodger-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {canDeleteThis && (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.scoreID)}
                          disabled={isDeleting}
                          aria-label="Delete score"
                          className="rounded-control p-1.5 text-ink-400 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-60"
                        >
                          {isDeleting ? <Spinner className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <AddScoreModal open={addModalOpen} onClose={() => setAddModalOpen(false)} targetAdmin={targetAdmin} />
      <EditScoreModal
        key={editingScore?.scoreID || 'none'}
        open={!!editingScore}
        onClose={() => setEditingScore(null)}
        scoreEntry={editingScore}
        targetAdminID={targetAdmin?.adminID}
      />
    </div>
  );
}
