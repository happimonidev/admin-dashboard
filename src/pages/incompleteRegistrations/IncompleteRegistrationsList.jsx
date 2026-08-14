import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  useAllIncompleteRegistrations,
  useAssignedIncompleteRegistrations,
  useUpdateIncompleteRegistrationStatus,
  useReassignIncompleteRegistration,
} from '../../hooks/useIncompleteRegistrations';
import { useAssignableAdmins } from '../../hooks/useAdminUsers';
import { useServerPagination, DEFAULT_PAGE_SIZE } from '../../hooks/useServerPagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import DateRangeFilter from '../../components/DateRangeFilter';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import SearchInput from '../../components/SearchInput';
import CallButton from '../../components/CallButton';
import { getCaseStatusMeta } from '../../lib/status';
import { formatDate, formatDateTime } from '../../lib/format';
import { filterBySearch } from '../../lib/search';

// Matches exactly what the backend's updateIncompleteRegistrationStatus
// treats specially (no explicit enum in the service, but 'in_progress' is
// checked when deciding whether to re-flag someone, and 'resolved'/'closed'
// both trigger resolvedAt) — same status vocabulary already used by Leads,
// Collection Cases, and Complaints in this app.
const REGISTRATION_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const TABS = [
  { key: 'assigned', label: 'My Assigned', permission: 'view_assigned_incomplete_registrations' },
  { key: 'all', label: 'All', permission: 'view_all_incomplete_registrations' },
];

function UpdateStatusModal({ open, onClose, registration }) {
  const [status, setStatus] = useState(registration?.status || 'open');
  const [resolution, setResolution] = useState(registration?.resolution || '');
  const mutation = useUpdateIncompleteRegistrationStatus();

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        registrationID: registration.registrationID,
        status,
        resolution: resolution || undefined,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Update registration status">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <label className="block text-sm font-medium text-ink-700">
        Status
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        >
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s}>{getCaseStatusMeta(s).label}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Resolution notes (optional)
        <textarea
          rows={3}
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="e.g. reached customer by phone, they completed registration"
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}

function ReassignModal({ open, onClose, registration }) {
  const [newAssignee, setNewAssignee] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data: admins, isLoading, error: loadError } = useAssignableAdmins('customer_care', open);
  const filteredAdmins = filterBySearch(admins || [], searchInput, ['fullName', 'email']);
  const mutation = useReassignIncompleteRegistration();

  const handleClose = () => {
    mutation.reset();
    setNewAssignee('');
    setSearchInput('');
    onClose();
  };

  const handleReassign = async () => {
    try {
      await mutation.mutateAsync({ registrationID: registration.registrationID, newAssignee });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Assign registration">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="mb-3 text-sm text-ink-500">Select a Customer Care Staff member to assign this registration to.</p>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : loadError ? (
        <p className="text-sm text-danger-500">{loadError.message}</p>
      ) : !admins || admins.length === 0 ? (
        <p className="text-sm text-ink-500">No Customer Care Staff found.</p>
      ) : (
        <>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name or email…"
            className="mb-2"
          />
          {filteredAdmins.length === 0 ? (
            <p className="py-2 text-sm text-ink-500">No matches.</p>
          ) : (
            <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
              {filteredAdmins.map((admin) => (
                <label
                  key={admin.adminID}
                  className={`flex cursor-pointer items-center gap-3 rounded-control border p-3 text-sm ${
                    newAssignee === admin.adminID ? 'border-dodger-500 bg-dodger-50' : 'border-ink-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="reassignRegistrationTarget"
                    value={admin.adminID}
                    checked={newAssignee === admin.adminID}
                    onChange={() => setNewAssignee(admin.adminID)}
                  />
                  <div>
                    <p className="font-medium text-ink-900">{admin.fullName}</p>
                    <p className="text-ink-500">{admin.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleReassign} disabled={!newAssignee || mutation.isPending}>
          {mutation.isPending ? 'Assigning…' : 'Assign'}
        </Button>
      </div>
    </Modal>
  );
}

// No dedicated single-record endpoint — built entirely from the row data
// already loaded in the list, same pattern as Complaints' detail modal.
function RegistrationDetailModal({ open, onClose, registration }) {
  const { hasAnyPermission } = useAuth();
  const canViewCustomer = hasAnyPermission([
    'view_customer_profile',
    'view_assigned_complaints',
    'view_assigned_collection_cases',
    'view_assigned_leads',
    'view_team_customers',
  ]);

  if (!registration) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Registration ${registration.registrationID}`}>
      <dl>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Status</dt>
          <dd>
            <Badge tone={getCaseStatusMeta(registration.status).tone}>
              {getCaseStatusMeta(registration.status).label}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Customer</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{registration.customerName || '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Phone</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{registration.customerPhone || '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Stuck at step</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{registration.kycStep || '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Flagged</dt>
          <dd className="text-right text-sm font-medium text-ink-900">
            {registration.flaggedAt ? formatDateTime(registration.flaggedAt) : '—'}
          </dd>
        </div>
        {registration.resolution && (
          <div className="border-b border-ink-50 py-2.5">
            <dt className="mb-1 text-sm text-ink-500">Resolution</dt>
            <dd className="whitespace-pre-wrap text-sm text-ink-900">{registration.resolution}</dd>
          </div>
        )}
      </dl>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {canViewCustomer && (
          <Link to={`/customers/${registration.userID}`}>
            <Button>View customer & loan history</Button>
          </Link>
        )}
      </div>
      {!canViewCustomer && (
        <p className="mt-2 text-right text-xs text-ink-400">
          Your role doesn't include permission to view full customer details.
        </p>
      )}
    </Modal>
  );
}

export default function IncompleteRegistrationsList() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const visibleTabs = TABS.filter((tab) => hasPermission(tab.permission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [viewRegistration, setViewRegistration] = useState(null);
  const [statusModalRegistration, setStatusModalRegistration] = useState(null);
  const [reassignModalRegistration, setReassignModalRegistration] = useState(null);
  const { page, setPage, skip, limit } = useServerPagination();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, search, from, to]);

  const assignedQuery = useAssignedIncompleteRegistrations(
    { search: search || undefined, from: from || undefined, to: to || undefined, skip, limit },
    activeTab === 'assigned'
  );
  const allQuery = useAllIncompleteRegistrations(
    { status: statusFilter || undefined, search: search || undefined, from: from || undefined, to: to || undefined, skip, limit },
    activeTab === 'all'
  );
  const { data: result, isLoading, error } = activeTab === 'all' ? allQuery : assignedQuery;
  const data = result?.data;
  const total = result?.total;

  // Name resolution for the "Assigned To" column on the All tab.
  const { data: careStaff } = useAssignableAdmins('customer_care', activeTab === 'all');
  const nameByID = useMemo(() => {
    const map = {};
    (careStaff || []).forEach((a) => { map[a.adminID] = a.fullName; });
    return map;
  }, [careStaff]);

  const canCall = hasPermission('call_customer');
  const canUpdateStatus = hasPermission('update_incomplete_registration_status');
  const canReassign = hasPermission('reassign_incomplete_registrations');
  const canViewCustomer = hasAnyPermission([
    'view_customer_profile',
    'view_assigned_complaints',
    'view_assigned_collection_cases',
    'view_assigned_leads',
    'view_team_customers',
  ]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink-900">Incomplete Registrations</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Customers who started registering but haven't made KYC progress in 24+ hours.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-ink-100 pb-3">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-dodger-500 text-dodger-700'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          {activeTab === 'all' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-control border border-ink-200 px-2 py-1.5 text-xs"
            >
              <option value="">All statuses</option>
              {REGISTRATION_STATUSES.map((s) => (
                <option key={s} value={s}>{getCaseStatusMeta(s).label}</option>
              ))}
            </select>
          )}
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(''); setTo(''); }} />
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, phone, ID…"
            className="w-64"
          />
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        <DataTable
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.registrationID}
          onRowClick={(row) => setViewRegistration(row)}
          emptyTitle="No incomplete registrations found"
          pageSize={DEFAULT_PAGE_SIZE}
          columns={[
            { key: 'registrationID', header: 'ID', className: 'font-mono text-xs text-ink-500' },
            {
              key: 'customerName',
              header: 'Customer',
              render: (row) => (
                <span className="inline-flex items-center gap-1.5">
                  {row.customerName || row.userID}
                  {canCall && <CallButton phone={row.customerPhone} />}
                </span>
              ),
            },
            { key: 'kycStep', header: 'Stuck at step', hideOnMobile: true },
            {
              key: 'status',
              header: 'Status',
              render: (row) => {
                const meta = getCaseStatusMeta(row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            ...(activeTab === 'all' ? [{
              key: 'assignedTo',
              header: 'Assigned To',
              accessor: (row) => (row.assignedTo ? (nameByID[row.assignedTo] || 'Former/reassigned staff') : 'Unassigned'),
              hideOnMobile: true,
            }] : []),
            { key: 'flaggedAt', header: 'Flagged', render: (row) => formatDate(row.flaggedAt), sortable: true },
          ]}
          rowActions={(row) => (
            <div className="flex justify-end gap-2">
              {canViewCustomer && (
                <Link to={`/customers/${row.userID}`} className="text-xs font-medium text-dodger-600 hover:underline">
                  View customer
                </Link>
              )}
              {canUpdateStatus && (
                <button type="button" onClick={() => setStatusModalRegistration(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Update status
                </button>
              )}
              {canReassign && (
                <button type="button" onClick={() => setReassignModalRegistration(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  {row.assignedTo ? 'Reassign' : 'Assign'}
                </button>
              )}
            </div>
          )}
        />
        <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
      </div>

      <RegistrationDetailModal open={!!viewRegistration} onClose={() => setViewRegistration(null)} registration={viewRegistration} />
      <UpdateStatusModal key={statusModalRegistration?.registrationID || 'none'} open={!!statusModalRegistration} onClose={() => setStatusModalRegistration(null)} registration={statusModalRegistration} />
      <ReassignModal open={!!reassignModalRegistration} onClose={() => setReassignModalRegistration(null)} registration={reassignModalRegistration} />
    </div>
  );
}
