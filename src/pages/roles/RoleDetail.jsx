import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import {
  useRole,
  usePermissionsList,
  useEditRole,
  useAddPermission,
  useRemovePermission,
  useDeleteRole,
} from '../../hooks/useRoles';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

function EditRoleModal({ open, onClose, role }) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [sessionTimeout, setSessionTimeout] = useState(role?.sessionTimeout ?? '');
  const mutation = useEditRole(role?.roleID);

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        name,
        description,
        sessionTimeout: sessionTimeout ? Number(sessionTimeout) : undefined,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Edit role">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <label className="block text-sm font-medium text-ink-700">
        Role name
        <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Description
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Session timeout (minutes)
        <input type="number" min="1" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}

function DeleteRoleModal({ open, onClose, role }) {
  const navigate = useNavigate();
  const mutation = useDeleteRole();

  const handleDelete = async () => {
    try {
      await mutation.mutateAsync(role.roleID);
      navigate('/roles', { replace: true });
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete role">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="text-sm text-ink-500">
        Delete <span className="font-medium text-ink-900">{role?.name}</span>? This cannot be undone.
        Any admin currently assigned this role will need to be reassigned separately.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleDelete} disabled={mutation.isPending}>
          {mutation.isPending ? 'Deleting…' : 'Delete role'}
        </Button>
      </div>
    </Modal>
  );
}

function PermissionRow({ perm, hasIt, canToggle, onToggle, isPending }) {
  const disabled = !perm.isActive || !canToggle;

  return (
    <label
      className={`flex items-start gap-2.5 rounded-control px-2 py-1.5 text-sm ${
        disabled ? '' : 'cursor-pointer hover:bg-ink-50'
      }`}
    >
      <input
        type="checkbox"
        checked={hasIt}
        disabled={disabled || isPending}
        onChange={() => onToggle(perm.key, hasIt)}
        className="mt-0.5"
      />
      <span className="min-w-0">
        <span className={`block ${disabled && !hasIt ? 'text-ink-400' : 'text-ink-900'}`}>
          {perm.description || perm.key}
        </span>
        <span className="block font-mono text-xs text-ink-400">{perm.key}</span>
      </span>
      {!perm.isActive && (
        <Badge tone="neutral" className="ml-auto shrink-0">Not yet active</Badge>
      )}
    </label>
  );
}

export default function RoleDetail() {
  const { roleID } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: role, isLoading, error } = useRole(roleID);
  const { data: allPermissions, isLoading: permsLoading } = usePermissionsList();
  const [modal, setModal] = useState(null); // 'edit' | 'delete' | null
  const [togglingKey, setTogglingKey] = useState(null);

  const addMutation = useAddPermission(roleID);
  const removeMutation = useRemovePermission(roleID);

  const canEdit = hasPermission('edit_role');
  const canDelete = hasPermission('delete_role');
  const canAdd = hasPermission('add_permission_to_role');
  const canRemove = hasPermission('remove_permission_from_role');

  const grouped = useMemo(() => {
    const groups = {};
    (allPermissions || []).forEach((perm) => {
      const group = perm.group || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(perm);
    });
    return groups;
  }, [allPermissions]);

  const handleToggle = async (key, currentlyHas) => {
    setTogglingKey(key);
    try {
      if (currentlyHas) await removeMutation.mutateAsync(key);
      else await addMutation.mutateAsync(key);
    } catch {
      // Errors shown via the banner below, tied to whichever mutation ran.
    } finally {
      setTogglingKey(null);
    }
  };

  const toggleError = addMutation.error?.message || removeMutation.error?.message;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/roles')}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to roles
      </button>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <EmptyState icon={AlertCircle} title="Couldn't load this role" description={error.message} />
      ) : role ? (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-ink-900">{role.name}</h1>
                <Badge tone={role.isDefault ? 'info' : 'neutral'}>
                  {role.isDefault ? 'Seed role' : 'Custom'}
                </Badge>
              </div>
              {role.description && <p className="mt-0.5 text-sm text-ink-500">{role.description}</p>}
              <p className="mt-1 text-xs text-ink-400">
                Session timeout: {role.sessionTimeout} minutes · {role.permissions?.length || 0} permissions
              </p>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="secondary" size="sm" onClick={() => setModal('edit')}>Edit</Button>
              )}
              {canDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setModal('delete')}
                  disabled={role.isDefault}
                  title={role.isDefault ? 'Seed roles cannot be deleted' : undefined}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          {toggleError && (
            <div className="mb-4 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {toggleError}
            </div>
          )}

          {!canAdd && !canRemove && (
            <div className="mb-4 rounded-control bg-ink-50 px-3 py-2 text-xs text-ink-500">
              You can view this role's permissions, but your role doesn't include permission to change them.
            </div>
          )}

          {permsLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(grouped).map(([group, perms]) => (
                <Card key={group} className="p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {group}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {perms.map((perm) => (
                      <PermissionRow
                        key={perm.key}
                        perm={perm}
                        hasIt={role.permissions?.includes(perm.key)}
                        canToggle={
                          role.permissions?.includes(perm.key) ? canRemove : canAdd
                        }
                        onToggle={handleToggle}
                        isPending={togglingKey === perm.key}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <EditRoleModal open={modal === 'edit'} onClose={() => setModal(null)} role={role} />
          <DeleteRoleModal open={modal === 'delete'} onClose={() => setModal(null)} role={role} />
        </>
      ) : null}
    </div>
  );
}
