import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  useAllAdmins,
  useCreateAdmin,
  useEditAdmin,
  useDeactivateAdmin,
  useReactivateAdmin,
  useResetAdminPassword,
} from '../../hooks/useAdminUsers';
import { useRoles } from '../../hooks/useRoles';
import { useServerPagination, DEFAULT_PAGE_SIZE } from '../../hooks/useServerPagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/SearchInput';
import { getAdminStatusMeta } from '../../lib/status';
import { formatDate } from '../../lib/format';

function CreateAdminModal({ open, onClose, roles }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [roleID, setRoleID] = useState('');
  const mutation = useCreateAdmin();

  const handleClose = () => {
    mutation.reset();
    setFullName(''); setEmail(''); setRoleID('');
    onClose();
  };

  const handleCreate = async () => {
    try {
      await mutation.mutateAsync({ fullName, email, roleID });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create admin user">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <label className="block text-sm font-medium text-ink-700">
        Full name
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Role
        <select
          value={roleID}
          onChange={(e) => setRoleID(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        >
          <option value="">Select a role…</option>
          {roles?.map((role) => (
            <option key={role.roleID} value={role.roleID}>{role.name}</option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-ink-400">
        A temporary password will be emailed to this address.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!fullName || !email || !roleID || mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create admin'}
        </Button>
      </div>
    </Modal>
  );
}

function EditAdminModal({ open, onClose, admin, roles }) {
  const [roleID, setRoleID] = useState(admin?.roleID || '');
  const mutation = useEditAdmin();

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ adminID: admin.adminID, roleID });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  const roleChanged = roleID !== admin?.roleID;

  return (
    <Modal open={open} onClose={handleClose} title="Edit admin user">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <label className="block text-sm font-medium text-ink-700">
        Full name
        <input
          value={admin?.fullName || ''}
          disabled
          className="mt-1 block w-full rounded-control border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-500"
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Email
        <input
          value={admin?.email || ''}
          disabled
          className="mt-1 block w-full rounded-control border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-500"
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Role
        <select
          value={roleID}
          onChange={(e) => setRoleID(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        >
          {roles?.map((role) => (
            <option key={role.roleID} value={role.roleID}>{role.name}</option>
          ))}
        </select>
      </label>
      {roleChanged && (
        <p className="mt-2 text-xs text-warning-700">
          Changing the role will immediately sign this admin out — they'll need to log in again.
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!roleChanged || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}

function ConfirmActionModal({ open, onClose, title, description, confirmLabel, variant, onConfirm, isPending, error, successMessage }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {error && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}
      {successMessage ? (
        <>
          <p className="text-sm text-success-700">{successMessage}</p>
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-500">{description}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant={variant || 'primary'} onClick={onConfirm} disabled={isPending}>
              {isPending ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function AdminUsersList() {
  const { hasPermission } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [modal, setModal] = useState(null); // 'create' | null
  const [editAdminTarget, setEditAdminTarget] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'deactivate'|'reactivate'|'reset', admin }

  const canCreate = hasPermission('create_admin_user');
  const canEdit = hasPermission('edit_admin_user');
  const canDeactivate = hasPermission('deactivate_admin_user');
  const canResetPassword = hasPermission('reset_admin_password');
  const canViewRoles = hasPermission('view_roles');

  const { page, setPage, skip, limit } = useServerPagination();
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data: result, isLoading, error } = useAllAdmins({ search: search || undefined, skip, limit });
  const admins = result?.data;
  const total = result?.total;
  const { data: rolesResult } = useRoles({}, canViewRoles);
  const roles = rolesResult?.data;

  const roleNameByID = useMemo(() => {
    const map = {};
    (roles || []).forEach((r) => { map[r.roleID] = r.name; });
    return map;
  }, [roles]);

  const deactivateMutation = useDeactivateAdmin();
  const reactivateMutation = useReactivateAdmin();
  const resetPasswordMutation = useResetAdminPassword();

  const activeMutation =
    confirmAction?.type === 'deactivate' ? deactivateMutation :
    confirmAction?.type === 'reactivate' ? reactivateMutation :
    confirmAction?.type === 'reset' ? resetPasswordMutation : null;

  const closeConfirm = () => {
    deactivateMutation.reset();
    reactivateMutation.reset();
    resetPasswordMutation.reset();
    setConfirmAction(null);
  };

  const handleConfirm = async () => {
    try {
      if (confirmAction.type === 'deactivate') await deactivateMutation.mutateAsync(confirmAction.admin.adminID);
      if (confirmAction.type === 'reactivate') await reactivateMutation.mutateAsync(confirmAction.admin.adminID);
      if (confirmAction.type === 'reset') await resetPasswordMutation.mutateAsync(confirmAction.admin.adminID);
    } catch {
      // Error surfaced via activeMutation.error below.
    }
  };

  const confirmCopy = {
    deactivate: {
      title: 'Deactivate admin',
      description: `${confirmAction?.admin?.fullName} will no longer be able to log in.`,
      confirmLabel: 'Deactivate',
      variant: 'danger',
    },
    reactivate: {
      title: 'Reactivate admin',
      description: `${confirmAction?.admin?.fullName} will regain access to log in.`,
      confirmLabel: 'Reactivate',
      variant: 'primary',
    },
    reset: {
      title: 'Reset password',
      description: `A new temporary password will be emailed to ${confirmAction?.admin?.email}.`,
      confirmLabel: 'Reset password',
      variant: 'primary',
    },
  }[confirmAction?.type] || {};

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Admin Users</h1>
          <p className="mt-0.5 text-sm text-ink-500">Manage admin panel access.</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, email, or ID…"
            className="w-64"
          />
          {canCreate && (
            <Button size="sm" onClick={() => setModal('create')}>Create admin</Button>
          )}
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        <DataTable
          data={admins || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.adminID}
          emptyTitle="No admin users found"
          pageSize={DEFAULT_PAGE_SIZE}
          columns={[
            { key: 'fullName', header: 'Name', sortable: true },
            { key: 'email', header: 'Email', sortable: true },
            {
              key: 'role',
              header: 'Role',
              accessor: (row) => roleNameByID[row.roleID] || row.roleID,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => {
                const meta = getAdminStatusMeta(row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true, hideOnMobile: true },
          ]}
          rowActions={(row) => (
            <div className="flex flex-wrap justify-end gap-2">
              {canEdit && (
                <button type="button" onClick={() => setEditAdminTarget(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Edit
                </button>
              )}
              {canResetPassword && (
                <button type="button" onClick={() => setConfirmAction({ type: 'reset', admin: row })} className="text-xs font-medium text-dodger-600 hover:underline">
                  Reset password
                </button>
              )}
              {canDeactivate && (
                row.status ? (
                  <button type="button" onClick={() => setConfirmAction({ type: 'deactivate', admin: row })} className="text-xs font-medium text-danger-600 hover:underline">
                    Deactivate
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirmAction({ type: 'reactivate', admin: row })} className="text-xs font-medium text-dodger-600 hover:underline">
                    Reactivate
                  </button>
                )
              )}
            </div>
          )}
        />
        <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
      </div>

      <CreateAdminModal open={modal === 'create'} onClose={() => setModal(null)} roles={roles} />
      <EditAdminModal key={editAdminTarget?.adminID || 'none'} open={!!editAdminTarget} onClose={() => setEditAdminTarget(null)} admin={editAdminTarget} roles={roles} />
      <ConfirmActionModal
        open={!!confirmAction}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        isPending={activeMutation?.isPending}
        error={activeMutation?.error?.message}
        successMessage={activeMutation?.isSuccess ? activeMutation?.data?.message : null}
        {...confirmCopy}
      />
    </div>
  );
}
