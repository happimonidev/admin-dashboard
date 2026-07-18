import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Link } from 'react-router-dom';
import {
  useAllCases,
  useAssignedCases,
  useUpdateCaseStatus,
  useReassignCase,
} from '../../hooks/useCollectionCases';
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
import { filterBySearch } from '../../lib/search';
import { formatDate, formatDateTime, formatNaira } from '../../lib/format';

const CASE_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const TABS = [
  { key: 'assigned', label: 'My Cases', permission: 'view_assigned_collection_cases' },
  { key: 'all', label: 'All Cases', permission: 'view_all_collection_cases' },
];


function UpdateStatusModal({ open, onClose, caseItem }) {
  const [status, setStatus] = useState(caseItem?.status || 'open');
  const [amountRecovered, setAmountRecovered] = useState(caseItem?.amountRecovered ?? '');
  const mutation = useUpdateCaseStatus();

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        caseID: caseItem.caseID,
        status,
        amountRecovered: amountRecovered !== '' ? Number(amountRecovered) : undefined,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Update case status">
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
          {CASE_STATUSES.map((s) => (
            <option key={s} value={s}>{getCaseStatusMeta(s).label}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Amount recovered so far (₦, optional)
        <input
          type="number"
          step="0.01"
          value={amountRecovered}
          onChange={(e) => setAmountRecovered(e.target.value)}
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

function ReassignModal({ open, onClose, caseItem }) {
  const [newAssignee, setNewAssignee] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data: admins, isLoading, error: loadError } = useAssignableAdmins('collection_officer', open);
  const filteredAdmins = filterBySearch(admins || [], searchInput, ['fullName', 'email']);
  const mutation = useReassignCase();

  const handleClose = () => {
    mutation.reset();
    setNewAssignee('');
    setSearchInput('');
    onClose();
  };

  const handleReassign = async () => {
    try {
      await mutation.mutateAsync({ caseID: caseItem.caseID, newAssignee });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Reassign case">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="mb-3 text-sm text-ink-500">Select a Collection Officer to reassign this case to.</p>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : loadError ? (
        <p className="text-sm text-danger-500">{loadError.message}</p>
      ) : !admins || admins.length === 0 ? (
        <p className="text-sm text-ink-500">No Collection Officers found.</p>
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
                    name="reassignCaseTarget"
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
          {mutation.isPending ? 'Reassigning…' : 'Reassign'}
        </Button>
      </div>
    </Modal>
  );
}

// There's no GET /admin/collection/:caseID endpoint — this is built entirely
// from the row data already loaded in the list, not a fresh fetch.
function CaseDetailModal({ open, onClose, caseItem }) {
  const { hasAnyPermission, hasPermission } = useAuth();
  const canViewCustomer = hasAnyPermission([
    'view_customer_profile',
    'view_assigned_collection_cases',
    'view_assigned_leads',
    'view_assigned_complaints',
    'view_team_customers',
  ]);
  const canCall = hasPermission('call_customer');

  if (!caseItem) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Case ${caseItem.caseID}`}>
      <dl>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Status</dt>
          <dd>
            <Badge tone={getCaseStatusMeta(caseItem.status).tone}>
              {getCaseStatusMeta(caseItem.status).label}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Customer</dt>
          <dd className="text-right text-sm font-medium text-ink-900">
            {caseItem.customerName || '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Phone</dt>
          <dd className="flex items-center justify-end gap-1.5 text-right text-sm font-medium text-ink-900">
            {caseItem.customerPhone || '—'}
            {canCall && <CallButton phone={caseItem.customerPhone} />}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Loan ID</dt>
          <dd className="text-right font-mono text-xs text-ink-900">{caseItem.loanID}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Loan amount</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{formatNaira(caseItem.loanAmount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Amount overdue</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{formatNaira(caseItem.amountOverdue)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Days overdue</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{caseItem.daysOverdue ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Amount recovered</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{formatNaira(caseItem.amountRecovered)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-sm text-ink-500">Created</dt>
          <dd className="text-right text-sm font-medium text-ink-900">
            {caseItem.createdAt ? formatDateTime(caseItem.createdAt) : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {canViewCustomer && (
          <Link to={`/customers/${caseItem.userID}`}>
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

export default function CollectionCasesList() {
  const { hasPermission } = useAuth();
  const visibleTabs = TABS.filter((tab) => hasPermission(tab.permission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [viewCase, setViewCase] = useState(null);
  const [statusModalCase, setStatusModalCase] = useState(null);
  const [reassignModalCase, setReassignModalCase] = useState(null);
  const { page, setPage, skip, limit } = useServerPagination();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, search, from, to]);

  const assignedQuery = useAssignedCases({ search: search || undefined, from: from || undefined, to: to || undefined, skip, limit }, activeTab === 'assigned');
  const allQuery = useAllCases(
    { status: statusFilter || undefined, search: search || undefined, from: from || undefined, to: to || undefined, skip, limit },
    activeTab === 'all'
  );
  const { data: result, isLoading, error } = activeTab === 'all' ? allQuery : assignedQuery;
  const data = result?.data;
  const total = result?.total;

  // Name resolution for the "Assigned To" column on the All Cases tab.
  const { data: officers } = useAssignableAdmins('collection_officer', activeTab === 'all');
  const nameByID = useMemo(() => {
    const map = {};
    (officers || []).forEach((a) => { map[a.adminID] = a.fullName; });
    return map;
  }, [officers]);

  const canUpdateStatus = hasPermission('update_collection_case_status');
  const canCall = hasPermission('call_customer');
  const canReassign = hasPermission('reassign_collection_officer_cases');

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink-900">Collection Cases</h1>
        <p className="mt-0.5 text-sm text-ink-500">Track recovery of overdue loans.</p>
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
              {CASE_STATUSES.map((s) => (
                <option key={s} value={s}>{getCaseStatusMeta(s).label}</option>
              ))}
            </select>
          )}
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(''); setTo(''); }} />
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, phone, case/loan ID…"
            className="w-64"
          />
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        <DataTable
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.caseID}
          onRowClick={(row) => setViewCase(row)}
          pageSize={DEFAULT_PAGE_SIZE}
          emptyTitle="No collection cases found"
          columns={[
            { key: 'caseID', header: 'Case ID', className: 'font-mono text-xs text-ink-500' },
            { key: 'customerName', header: 'Customer', render: (row) => row.customerName || row.userID },
            {
              key: 'customerPhone',
              header: 'Phone',
              hideOnMobile: true,
              render: (row) => (
                <span className="inline-flex items-center gap-1.5">
                  {row.customerPhone}
                  {canCall && <CallButton phone={row.customerPhone} />}
                </span>
              ),
            },
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
              accessor: (row) => (row.assignedTo ? (nameByID[row.assignedTo] || row.assignedTo) : 'Unassigned'),
              hideOnMobile: true,
            }] : []),
            { key: 'loanAmount', header: 'Loan amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
            { key: 'amountOverdue', header: 'Overdue', render: (row) => formatNaira(row.amountOverdue), hideOnMobile: true },
            { key: 'amountRecovered', header: 'Recovered', render: (row) => formatNaira(row.amountRecovered), hideOnMobile: true },
            { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true, hideOnMobile: true },
          ]}
          rowActions={(row) => (
            <div className="flex justify-end gap-2">
              {canUpdateStatus && (
                <button type="button" onClick={() => setStatusModalCase(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Update status
                </button>
              )}
              {canReassign && (
                <button type="button" onClick={() => setReassignModalCase(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Reassign
                </button>
              )}
            </div>
          )}
        />
        <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
      </div>

      <CaseDetailModal open={!!viewCase} onClose={() => setViewCase(null)} caseItem={viewCase} />
      <UpdateStatusModal key={statusModalCase?.caseID || 'none'} open={!!statusModalCase} onClose={() => setStatusModalCase(null)} caseItem={statusModalCase} />
      <ReassignModal open={!!reassignModalCase} onClose={() => setReassignModalCase(null)} caseItem={reassignModalCase} />
    </div>
  );
}
