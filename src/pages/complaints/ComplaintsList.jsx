import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  useAllComplaints,
  useAssignedComplaints,
  useCreateComplaint,
  useUpdateComplaintStatus,
  useReassignComplaint,
} from '../../hooks/useComplaints';
import { useCustomersList } from '../../hooks/useCustomers';
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

const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const TABS = [
  { key: 'assigned', label: 'My Complaints', permission: 'view_assigned_complaints' },
  { key: 'all', label: 'All Complaints', permission: 'view_all_complaints' },
];

function CreateComplaintModal({ open, onClose }) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Explicit {} params — no skip/limit sent returns the full customer list
  // (backend's backward-compatible default), which this picker's own
  // client-side search-and-slice needs; it's not meant to paginate here.
  const { data: customersResult, isLoading: customersLoading } = useCustomersList({});
  const customers = customersResult?.data;
  const { data: admins, isLoading: adminsLoading } = useAssignableAdmins('customer_care', open);
  const mutation = useCreateComplaint();

  const filteredCustomers = useMemo(
    () =>
      filterBySearch(customers || [], customerSearch, [
        'userID',
        'phone',
        'email',
        (row) => [row.firstName, row.lastName].filter(Boolean).join(' '),
      ]).slice(0, 20),
    [customers, customerSearch]
  );

  const handleClose = () => {
    mutation.reset();
    setCustomerSearch(''); setSelectedCustomer(null);
    setSubject(''); setDescription(''); setAssignedTo('');
    onClose();
  };

  const handleCreate = async () => {
    try {
      await mutation.mutateAsync({
        userID: selectedCustomer.userID,
        subject,
        description,
        customerName: [selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ') || undefined,
        customerPhone: selectedCustomer.phone || undefined,
        assignedTo: assignedTo || undefined,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create complaint" size="lg">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}

      <label className="block text-sm font-medium text-ink-700">
        Customer
        {selectedCustomer ? (
          <div className="mt-1 flex items-center justify-between rounded-control border border-ink-200 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-ink-900">
                {[selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ') || selectedCustomer.userID}
              </p>
              <p className="text-xs text-ink-500">{selectedCustomer.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCustomer(null)}
              className="text-xs font-medium text-dodger-600 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <SearchInput
              value={customerSearch}
              onChange={setCustomerSearch}
              placeholder="Search by name, ID, or phone…"
              className="mt-1"
            />
            {customersLoading ? (
              <div className="mt-2 flex justify-center py-4"><Spinner /></div>
            ) : (
              <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <p className="py-2 text-sm text-ink-500">
                    {customerSearch ? 'No matching customers.' : 'Start typing to search customers.'}
                  </p>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.userID}
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      className="flex items-center justify-between rounded-control border border-ink-100 px-3 py-2 text-left text-sm hover:bg-ink-50"
                    >
                      <span className="text-ink-900">
                        {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.userID}
                      </span>
                      <span className="text-xs text-ink-400">{c.phone}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </label>

      <label className="mt-3 block text-sm font-medium text-ink-700">
        Subject
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Description
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Assign to
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          disabled={adminsLoading}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        >
          <option value="">Auto-assign (least busy Customer Care Staff)</option>
          {admins?.map((admin) => (
            <option key={admin.adminID} value={admin.adminID}>{admin.fullName}</option>
          ))}
        </select>
      </label>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          disabled={!selectedCustomer || !subject || !description || mutation.isPending}
        >
          {mutation.isPending ? 'Creating…' : 'Create complaint'}
        </Button>
      </div>
    </Modal>
  );
}

function UpdateStatusModal({ open, onClose, complaint }) {
  const [status, setStatus] = useState(complaint?.status || 'open');
  const [resolution, setResolution] = useState(complaint?.resolution || '');
  const mutation = useUpdateComplaintStatus();

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        complaintID: complaint.complaintID,
        status,
        resolution: resolution || undefined,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Update complaint status">
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
          {COMPLAINT_STATUSES.map((s) => (
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

function ReassignModal({ open, onClose, complaint }) {
  const [newAssignee, setNewAssignee] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data: admins, isLoading, error: loadError } = useAssignableAdmins('customer_care', open);
  const filteredAdmins = filterBySearch(admins || [], searchInput, ['fullName', 'email']);
  const mutation = useReassignComplaint();

  const handleClose = () => {
    mutation.reset();
    setNewAssignee('');
    setSearchInput('');
    onClose();
  };

  const handleReassign = async () => {
    try {
      await mutation.mutateAsync({ complaintID: complaint.complaintID, newAssignee });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Reassign complaint">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="mb-3 text-sm text-ink-500">Select a Customer Care Staff member to reassign this complaint to.</p>
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
                    name="reassignComplaintTarget"
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

// There's no dedicated single-complaint endpoint — built entirely from the
// row data already loaded in the list, same pattern as Collection Cases'
// CaseDetailModal.
function ComplaintDetailModal({ open, onClose, complaint }) {
  const { hasAnyPermission, hasPermission } = useAuth();
  const canViewCustomer = hasAnyPermission([
    'view_customer_profile',
    'view_assigned_complaints',
    'view_assigned_collection_cases',
    'view_assigned_leads',
    'view_team_customers',
  ]);
  const canCall = hasPermission('call_customer');

  if (!complaint) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Complaint ${complaint.complaintID}`}>
      <dl>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Status</dt>
          <dd>
            <Badge tone={getCaseStatusMeta(complaint.status).tone}>
              {getCaseStatusMeta(complaint.status).label}
            </Badge>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Customer</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{complaint.customerName || '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Phone</dt>
          <dd className="flex items-center justify-end gap-1.5 text-right text-sm font-medium text-ink-900">
            {complaint.customerPhone || '—'}
            {canCall && <CallButton phone={complaint.customerPhone} />}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-ink-50 py-2.5">
          <dt className="text-sm text-ink-500">Subject</dt>
          <dd className="text-right text-sm font-medium text-ink-900">{complaint.subject || '—'}</dd>
        </div>
        <div className="border-b border-ink-50 py-2.5">
          <dt className="mb-1 text-sm text-ink-500">Description</dt>
          <dd className="whitespace-pre-wrap text-sm text-ink-900">{complaint.description || '—'}</dd>
        </div>
        {complaint.resolution && (
          <div className="border-b border-ink-50 py-2.5">
            <dt className="mb-1 text-sm text-ink-500">Resolution</dt>
            <dd className="whitespace-pre-wrap text-sm text-ink-900">{complaint.resolution}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-sm text-ink-500">Created</dt>
          <dd className="text-right text-sm font-medium text-ink-900">
            {complaint.createdAt ? formatDateTime(complaint.createdAt) : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {canViewCustomer && (
          <Link to={`/customers/${complaint.userID}`}>
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

export default function ComplaintsList() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const visibleTabs = TABS.filter((tab) => hasPermission(tab.permission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [modal, setModal] = useState(null); // 'create' | null
  const [viewComplaint, setViewComplaint] = useState(null);
  const [statusModalComplaint, setStatusModalComplaint] = useState(null);
  const [reassignModalComplaint, setReassignModalComplaint] = useState(null);
  const { page, setPage, skip, limit } = useServerPagination();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, search, from, to]);

  const assignedQuery = useAssignedComplaints({ search: search || undefined, from: from || undefined, to: to || undefined, skip, limit }, activeTab === 'assigned');
  const allQuery = useAllComplaints(
    { status: statusFilter || undefined, search: search || undefined, from: from || undefined, to: to || undefined, skip, limit },
    activeTab === 'all'
  );
  const { data: result, isLoading, error } = activeTab === 'all' ? allQuery : assignedQuery;
  const data = result?.data;
  const total = result?.total;

  // Name resolution for the "Assigned To" column on the All Complaints tab.
  const { data: careStaff } = useAssignableAdmins('customer_care', activeTab === 'all');
  const nameByID = useMemo(() => {
    const map = {};
    (careStaff || []).forEach((a) => { map[a.adminID] = a.fullName; });
    return map;
  }, [careStaff]);

  const canCreate = hasPermission('create_complaint');
  const canCall = hasPermission('call_customer');
  const canUpdateStatus = hasPermission('update_complaint_status');
  const canReassign = hasPermission('reassign_customer_care_cases');
  const canViewCustomer = hasAnyPermission([
    'view_customer_profile',
    'view_assigned_complaints',
    'view_assigned_collection_cases',
    'view_assigned_leads',
    'view_team_customers',
  ]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Complaints</h1>
          <p className="mt-0.5 text-sm text-ink-500">Customer issues and support tickets.</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setModal('create')}>Create complaint</Button>
        )}
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
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s} value={s}>{getCaseStatusMeta(s).label}</option>
              ))}
            </select>
          )}
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(''); setTo(''); }} />
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, phone, subject, ID…"
            className="w-64"
          />
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        <DataTable
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.complaintID}
          onRowClick={(row) => setViewComplaint(row)}
          emptyTitle="No complaints found"
          pageSize={DEFAULT_PAGE_SIZE}
          columns={[
            { key: 'complaintID', header: 'Complaint ID', className: 'font-mono text-xs text-ink-500' },
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
            { key: 'subject', header: 'Subject' },
            {
              key: 'description',
              header: 'Description',
              hideOnMobile: true,
              accessor: (row) => row.description,
              render: (row) => {
                if (!row.description) return '—';
                const truncated = row.description.length > 60
                  ? `${row.description.slice(0, 60)}…`
                  : row.description;
                return <span className="text-ink-500">{truncated}</span>;
              },
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
              accessor: (row) => (row.assignedTo ? (nameByID[row.assignedTo] || 'Former/reassigned staff') : 'Unassigned'),
              hideOnMobile: true,
            }] : []),
            { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true, hideOnMobile: true },
          ]}
          rowActions={(row) => (
            <div className="flex justify-end gap-2">
              {canViewCustomer && (
                <Link to={`/customers/${row.userID}`} className="text-xs font-medium text-dodger-600 hover:underline">
                  View customer
                </Link>
              )}
              {canUpdateStatus && (
                <button type="button" onClick={() => setStatusModalComplaint(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Update status
                </button>
              )}
              {canReassign && (
                <button type="button" onClick={() => setReassignModalComplaint(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Reassign
                </button>
              )}
            </div>
          )}
        />
        <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
      </div>

      <CreateComplaintModal open={modal === 'create'} onClose={() => setModal(null)} />
      <ComplaintDetailModal open={!!viewComplaint} onClose={() => setViewComplaint(null)} complaint={viewComplaint} />
      <UpdateStatusModal key={statusModalComplaint?.complaintID || 'none'} open={!!statusModalComplaint} onClose={() => setStatusModalComplaint(null)} complaint={statusModalComplaint} />
      <ReassignModal open={!!reassignModalComplaint} onClose={() => setReassignModalComplaint(null)} complaint={reassignModalComplaint} />
    </div>
  );
}
