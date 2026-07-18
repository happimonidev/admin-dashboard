import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useRoles, useCreateRole } from '../../hooks/useRoles';
import { useServerPagination, DEFAULT_PAGE_SIZE } from '../../hooks/useServerPagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/SearchInput';
import { formatDate } from '../../lib/format';

function CreateRoleModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const mutation = useCreateRole();

  const handleClose = () => {
    mutation.reset();
    setName(''); setDescription(''); setSessionTimeout('15');
    onClose();
  };

  const handleCreate = async () => {
    try {
      const data = await mutation.mutateAsync({
        name,
        description: description || undefined,
        sessionTimeout: sessionTimeout ? Number(sessionTimeout) : undefined,
      });
      onCreated(data.roleID);
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create role">
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
        Description (optional)
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Session timeout (minutes)
        <input type="number" min="1" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <p className="mt-2 text-xs text-ink-400">
        You'll add permissions on the next screen after creating the role.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!name || mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create role'}
        </Button>
      </div>
    </Modal>
  );
}

export default function RolesList() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [modal, setModal] = useState(null);
  const { page, setPage, skip, limit } = useServerPagination();

  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPage(1);
  };

  const { data: result, isLoading, error } = useRoles({ search: search || undefined, skip, limit });
  const roles = result?.data;
  const total = result?.total;
  const canCreate = hasPermission('create_role');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Roles & Permissions</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Every role is just a bundle of permissions — fully configurable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput value={searchInput} onChange={handleSearchChange} placeholder="Search roles…" className="w-64" />
          {canCreate && (
            <Button size="sm" onClick={() => setModal('create')}>Create role</Button>
          )}
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        <DataTable
          data={roles || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.roleID}
          onRowClick={(row) => navigate(`/roles/${row.roleID}`)}
          emptyTitle="No roles found"
          pageSize={DEFAULT_PAGE_SIZE}
          columns={[
            { key: 'name', header: 'Role', sortable: true },
            { key: 'description', header: 'Description', hideOnMobile: true },
            { key: 'sessionTimeout', header: 'Timeout (min)', hideOnMobile: true },
            {
              key: 'permissions',
              header: 'Permissions',
              accessor: (row) => row.permissions?.length || 0,
              sortable: true,
            },
            {
              key: 'isDefault',
              header: 'Type',
              render: (row) => (
                <Badge tone={row.isDefault ? 'info' : 'neutral'}>
                  {row.isDefault ? 'Seed role' : 'Custom'}
                </Badge>
              ),
            },
            { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true, hideOnMobile: true },
          ]}
        />
        <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
      </div>

      <CreateRoleModal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        onCreated={(roleID) => navigate(`/roles/${roleID}`)}
      />
    </div>
  );
}
