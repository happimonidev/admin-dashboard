import { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useAuditLogs, PAGE_SIZE } from '../../hooks/useAudit';
import { useAllAdmins } from '../../hooks/useAdminUsers';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatDateTime } from '../../lib/format';
import { AlertCircle, Inbox } from 'lucide-react';

// Confirmed exactly from auditMiddleware's own comment (the only actions
// it's ever called with): 'view' | 'create' | 'edit' | 'delete' | 'export' | 'login' | 'logout'
const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'login', 'logout'];

const ACTION_TONES = {
  view: 'neutral',
  create: 'success',
  edit: 'info',
  delete: 'danger',
  export: 'warning',
  login: 'success',
  logout: 'neutral',
};

export default function AuditLogsPage() {
  const { hasPermission } = useAuth();
  const [adminID, setAdminID] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // view_audit_logs is granted alongside view_admin_users on every seed
  // role that has it (Founder/Management/Operations Manager) — used here
  // for a name-based admin picker, with the field itself still working via
  // plain ID if this call doesn't apply to some future custom role.
  const canPickAdmins = hasPermission('view_admin_users');
  const { data: adminsResult } = useAllAdmins({}, canPickAdmins);
  const admins = adminsResult?.data;

  const filters = useMemo(() => {
    const f = {};
    if (adminID) f.adminID = adminID;
    if (action) f.action = action;
    if (resource) f.resource = resource.trim();
    if (from) f.from = from;
    // A bare date string (what <input type="date"> gives us) parses as
    // midnight UTC — so 'to' would exclude almost the entire selected day.
    // Pin it to the end of that day instead, so the picked date is
    // actually fully included. (Anchored to UTC, not Africa/Lagos exactly —
    // may include an extra hour at the boundary vs. true Lagos midnight,
    // but that's a safe direction to be off in, and fixes the actual bug.)
    if (to) f.to = `${to}T23:59:59.999Z`;
    return f;
  }, [adminID, action, resource, from, to]);

  const { data: logs, isLoading, isFetching, error } = useAuditLogs(filters, page);

  const applyFilters = () => setPage(1);

  const resetFilters = () => {
    setAdminID('');
    setAction('');
    setResource('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const hasNextPage = (logs?.length || 0) === PAGE_SIZE;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink-900">Audit Logs</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Who viewed, created, edited, deleted, or exported what.
        </p>
      </div>

      <div className="mb-4 grid gap-3 rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-xs font-medium text-ink-700">
          Admin
          {canPickAdmins ? (
            <select
              value={adminID}
              onChange={(e) => setAdminID(e.target.value)}
              className="mt-1 block w-full rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
            >
              <option value="">All admins</option>
              {admins?.map((a) => (
                <option key={a.adminID} value={a.adminID}>{a.fullName}</option>
              ))}
            </select>
          ) : (
            <input
              value={adminID}
              onChange={(e) => setAdminID(e.target.value)}
              placeholder="Admin ID"
              className="mt-1 block w-full rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
            />
          )}
        </label>
        <label className="block text-xs font-medium text-ink-700">
          Action
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="mt-1 block w-full rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-700">
          Resource
          <input
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            placeholder="e.g. customer, loan"
            className="mt-1 block w-full rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
          />
        </label>
        <label className="block text-xs font-medium text-ink-700">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
          />
        </label>
        <label className="block text-xs font-medium text-ink-700">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
          />
        </label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
          <Button size="sm" onClick={applyFilters}>Apply filters</Button>
          <Button size="sm" variant="secondary" onClick={resetFilters}>Reset filters</Button>
        </div>
      </div>

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Couldn't load audit logs" description={error.message} />
        ) : !logs || logs.length === 0 ? (
          <EmptyState icon={Inbox} title="No audit log entries found" description="Try adjusting the filters above." />
        ) : (
          <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-3 py-2.5 font-medium">When</th>
                    <th className="px-3 py-2.5 font-medium">Admin</th>
                    <th className="px-3 py-2.5 font-medium">Action</th>
                    <th className="px-3 py-2.5 font-medium">Resource</th>
                    <th className="px-3 py-2.5 font-medium">Description</th>
                    <th className="px-3 py-2.5 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={`${log.adminID}-${log.createdAt}-${i}`} className="border-b border-ink-50 last:border-0">
                      <td className="whitespace-nowrap px-3 py-3 text-ink-500">{formatDateTime(log.createdAt)}</td>
                      <td className="px-3 py-3 text-ink-900">{log.adminName}</td>
                      <td className="px-3 py-3">
                        <Badge tone={ACTION_TONES[log.action] || 'neutral'}>{log.action}</Badge>
                      </td>
                      <td className="px-3 py-3 text-ink-700">
                        {log.resource}
                        {log.resourceID && (
                          <span className="ml-1 font-mono text-xs text-ink-400">{log.resourceID}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-700">{log.description}</td>
                      <td className="px-3 py-3 font-mono text-xs text-ink-400">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:hidden">
              {logs.map((log, i) => (
                <div key={`${log.adminID}-${log.createdAt}-${i}`} className="rounded-card border border-ink-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={ACTION_TONES[log.action] || 'neutral'}>{log.action}</Badge>
                    <span className="text-xs text-ink-400">{formatDateTime(log.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-ink-900">{log.adminName}</p>
                  <p className="text-ink-500">{log.resource}{log.resourceID ? ` · ${log.resourceID}` : ''}</p>
                  <p className="mt-1 text-ink-700">{log.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
              <span>
                Page {page}{isFetching ? ' · loading…' : ''}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-control px-3 py-1.5 ring-1 ring-ink-200 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-control px-3 py-1.5 ring-1 ring-ink-200 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
