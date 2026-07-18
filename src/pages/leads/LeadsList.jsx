import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import {
  useAllLeads,
  useAssignedLeads,
  useCreateLead,
  useBulkUploadLeads,
  useUpdateLeadStatus,
  useReassignLead,
} from '../../hooks/useLeads';
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
import { getLeadStatusMeta } from '../../lib/status';
import { formatDate } from '../../lib/format';
import { filterBySearch } from '../../lib/search';

const LEAD_STATUSES = [
  'not_contacted',
  'contacted',
  'interested',
  'not_interested',
  'converted',
  'do_not_call',
];

// 'converted' is excluded here — it's now set automatically on the backend
// when the lead's phone number registers on the app, not by admin action.
// Still kept in LEAD_STATUSES above for filtering/badge display purposes.
const SETTABLE_LEAD_STATUSES = LEAD_STATUSES.filter((s) => s !== 'converted');

const TABS = [
  { key: 'assigned', label: 'My Leads', permission: 'view_assigned_leads' },
  { key: 'all', label: 'All Leads', permission: 'view_all_leads' },
];

function UpdateStatusModal({ open, onClose, lead }) {
  const [status, setStatus] = useState(
    lead?.status === 'converted' ? lead.status : lead?.status || 'not_contacted'
  );
  const mutation = useUpdateLeadStatus();

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ leadID: lead.leadID, status });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Update lead status">
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
          {/* 'converted' is set automatically when the lead's phone number
              registers on the app — not manually selectable here. If the
              lead is already converted, it's kept in the list so the
              current value still displays correctly. */}
          {SETTABLE_LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{getLeadStatusMeta(s).label}</option>
          ))}
          {lead?.status === 'converted' && (
            <option value="converted">{getLeadStatusMeta('converted').label}</option>
          )}
        </select>
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

function ReassignModal({ open, onClose, lead }) {
  const [newAssignee, setNewAssignee] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data: admins, isLoading, error: loadError } = useAssignableAdmins('telemarketer', open);
  const filteredAdmins = filterBySearch(admins || [], searchInput, ['fullName', 'email']);
  const mutation = useReassignLead();

  const handleClose = () => {
    mutation.reset();
    setNewAssignee('');
    setSearchInput('');
    onClose();
  };

  const handleReassign = async () => {
    try {
      await mutation.mutateAsync({ leadID: lead.leadID, newAssignee });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Reassign lead">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="mb-3 text-sm text-ink-500">Select a Telemarketer to reassign this lead to.</p>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : loadError ? (
        <p className="text-sm text-danger-500">{loadError.message}</p>
      ) : !admins || admins.length === 0 ? (
        <p className="text-sm text-ink-500">No Telemarketers found.</p>
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
                    name="reassignTarget"
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

function CreateLeadModal({ open, onClose }) {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [source, setSource] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const { data: admins, isLoading: adminsLoading } = useAssignableAdmins('telemarketer', open);
  const mutation = useCreateLead();

  const handleClose = () => {
    mutation.reset();
    setFullName(''); setPhoneNumber(''); setSource(''); setAssignedTo('');
    onClose();
  };

  const handleCreate = async () => {
    try {
      await mutation.mutateAsync({
        fullName,
        phoneNumber,
        source,
        assignedTo: assignedTo || undefined,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create lead">
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
        Phone number
        <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Source
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. purchased list, referral" className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Assign to
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          disabled={adminsLoading}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        >
          <option value="">Auto-assign (least busy Telemarketer)</option>
          {admins?.map((admin) => (
            <option key={admin.adminID} value={admin.adminID}>{admin.fullName}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-ink-400">
          Leave as auto-assign to let the system pick based on current workload, or choose someone specific.
        </span>
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={!fullName || !phoneNumber || !source || mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create lead'}
        </Button>
      </div>
    </Modal>
  );
}

function BulkUploadModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState('');
  const mutation = useBulkUploadLeads();
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    try {
      const data = await mutation.mutateAsync({ file, source: source || undefined });
      setResult(data);
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  const handleClose = () => {
    setFile(null); setSource(''); setResult(null);
    mutation.reset(); // clears stale isError/error so it doesn't reappear next time this opens
    onClose();
  };

  const handleClearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal open={open} onClose={handleClose} title="Bulk upload leads">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      {result ? (
        <div className="text-sm">
          <p className="text-ink-900">
            Created: <span className="font-semibold text-success-700">{result.created}</span> ·
            {' '}Skipped: <span className="font-semibold text-warning-700">{result.skipped}</span>
          </p>
          {result.errors?.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-control bg-ink-50 p-2 text-xs text-ink-500">
              {result.errors.map((e, i) => (
                <p key={i}>{e.phone || e.row || ''}: {e.reason}</p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <label className="block text-sm font-medium text-ink-700">
            File
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex w-full flex-col items-center gap-2 rounded-control border-2 border-dashed border-ink-200 px-4 py-6 text-center hover:border-dodger-400 hover:bg-dodger-50"
              >
                <FileUp className="h-6 w-6 text-ink-400" />
                <span className="text-sm text-ink-500">
                  Click to browse, or drag a file here
                </span>
                <span className="text-xs text-ink-400">.xlsx, .xls, or .csv — max 5MB</span>
              </button>
            ) : (
              <div className="mt-1 flex items-center justify-between gap-2 rounded-control border border-ink-200 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <FileUp className="h-4 w-4 shrink-0 text-dodger-500" />
                  <span className="truncate text-sm text-ink-900">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  aria-label="Remove file"
                  className="shrink-0 rounded-control p-1 text-ink-400 hover:bg-ink-50 hover:text-danger-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-ink-700">
            Default source (optional)
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. bulk_upload" className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500" />
          </label>

          <div className="mt-4 rounded-control bg-ink-50 p-3 text-xs text-ink-500">
            <p className="mb-1.5 font-medium text-ink-700">Column names (case/spacing don't matter):</p>
            <ul className="flex flex-col gap-1">
              <li><span className="font-medium text-ink-700">Required</span> — Full Name: <em>Full Name, Name, Customer Name, or Contact Name</em></li>
              <li><span className="font-medium text-ink-700">Required</span> — Phone Number: <em>Phone Number, Phone, Mobile, Mobile Number, Contact, or Telephone Number</em></li>
              <li>Source (optional): <em>Source, Lead Source, or Origin</em></li>
              <li>Assigned To (optional): <em>Assigned To, Assigned, Assignee, Telemarketer, or Officer</em></li>
            </ul>
          </div>
        </>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>{result ? 'Close' : 'Cancel'}</Button>
        {!result && (
          <Button onClick={handleUpload} disabled={!file || mutation.isPending}>
            {mutation.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        )}
      </div>
    </Modal>
  );
}

export default function LeadsList() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const visibleTabs = TABS.filter((tab) => hasPermission(tab.permission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const [modal, setModal] = useState(null); // 'create' | 'bulk' | null
  const [statusModalLead, setStatusModalLead] = useState(null);
  const [reassignModalLead, setReassignModalLead] = useState(null);
  const { page, setPage, skip, limit } = useServerPagination();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Switching tabs, changing the status filter, a new search term, or a new
  // date range should all return to page 1 — the old page number may no
  // longer exist (or mean something different) once the underlying query
  // changes.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter, search, from, to]);

  const assignedQuery = useAssignedLeads({ search: search || undefined, from: from || undefined, to: to || undefined, skip, limit }, activeTab === 'assigned');
  const allQuery = useAllLeads(
    { status: statusFilter || undefined, search: search || undefined, from: from || undefined, to: to || undefined, skip, limit },
    activeTab === 'all'
  );
  const { data: result, isLoading, error } = activeTab === 'all' ? allQuery : assignedQuery;
  const data = result?.data;
  const total = result?.total;

  // Name resolution for the "Assigned To" column on the All Leads tab —
  // reuses the same assignable-admins pattern already used for Reports and
  // Dashboard's team cards.
  const { data: telemarketers } = useAssignableAdmins('telemarketer', activeTab === 'all');
  const nameByID = useMemo(() => {
    const map = {};
    (telemarketers || []).forEach((a) => { map[a.adminID] = a.fullName; });
    return map;
  }, [telemarketers]);

  const canUpdateStatus = hasPermission('update_lead_status');
  const canReassign = hasPermission('reassign_telemarketer_leads');
  const canCreate = hasPermission('create_lead');
  const canImport = hasPermission('import_leads');
  const canViewCustomer = hasAnyPermission([
    'view_customer_profile',
    'view_assigned_leads',
    'view_assigned_collection_cases',
    'view_assigned_complaints',
    'view_team_customers',
  ]);
  const canCall = hasPermission('call_customer');

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Leads</h1>
          <p className="mt-0.5 text-sm text-ink-500">Track outreach and conversion progress.</p>
        </div>
        <div className="flex gap-2">
          {canImport && (
            <Button variant="secondary" size="sm" onClick={() => setModal('bulk')}>Bulk upload</Button>
          )}
          {canCreate && (
            <Button size="sm" onClick={() => setModal('create')}>Create lead</Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-ink-100">
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
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{getLeadStatusMeta(s).label}</option>
              ))}
            </select>
          )}
          <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { setFrom(''); setTo(''); }} />
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, phone, source…"
            className="w-64"
          />
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        <DataTable
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row.leadID}
          emptyTitle="No leads found"
          pageSize={DEFAULT_PAGE_SIZE}
          columns={[
            { key: 'fullName', header: 'Name', sortable: true },
            {
              key: 'phoneNumber',
              header: 'Phone',
              render: (row) => (
                <span className="inline-flex items-center gap-1.5">
                  {row.phoneNumber}
                  {canCall && <CallButton phone={row.phoneNumber} />}
                </span>
              ),
            },
            { key: 'source', header: 'Source', hideOnMobile: true },
            ...(activeTab === 'all' ? [{
              key: 'assignedTo',
              header: 'Assigned To',
              accessor: (row) => (row.assignedTo ? (nameByID[row.assignedTo] || 'Former/reassigned staff') : 'Unassigned'),
              hideOnMobile: true,
            }] : []),
            {
              key: 'status',
              header: 'Status',
              render: (row) => {
                const meta = getLeadStatusMeta(row.status);
                return <Badge tone={meta.tone}>{meta.label}</Badge>;
              },
            },
            { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true, hideOnMobile: true },
          ]}
          rowActions={(row) => (
            <div className="flex justify-end gap-2">
              {canViewCustomer && row.convertedUserID && (
                <Link
                  to={`/customers/${row.convertedUserID}`}
                  className="text-xs font-medium text-dodger-600 hover:underline"
                >
                  View customer
                </Link>
              )}
              {canUpdateStatus && (
                <button type="button" onClick={() => setStatusModalLead(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Update status
                </button>
              )}
              {canReassign && (
                <button type="button" onClick={() => setReassignModalLead(row)} className="text-xs font-medium text-dodger-600 hover:underline">
                  Reassign
                </button>
              )}
            </div>
          )}
        />
        <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
      </div>

      <CreateLeadModal open={modal === 'create'} onClose={() => setModal(null)} />
      <BulkUploadModal open={modal === 'bulk'} onClose={() => setModal(null)} />
      <UpdateStatusModal key={statusModalLead?.leadID || 'none'} open={!!statusModalLead} onClose={() => setStatusModalLead(null)} lead={statusModalLead} />
      <ReassignModal open={!!reassignModalLead} onClose={() => setReassignModalLead(null)} lead={reassignModalLead} />
    </div>
  );
}
