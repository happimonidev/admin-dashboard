import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  useAllLoans,
  useLoanQueue,
  useOverdueLoans,
  useRepaymentLogs,
} from '../../hooks/useLoans';
import { useServerPagination, DEFAULT_PAGE_SIZE } from '../../hooks/useServerPagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import DateRangeFilter from '../../components/DateRangeFilter';
import Badge from '../../components/ui/Badge';
import SearchInput from '../../components/SearchInput';
import { getLoanStatusMeta, humanizeReasonCode } from '../../lib/status';
import { formatDate, formatNaira } from '../../lib/format';

const TABS = [
  { key: 'queue', label: 'Queue', permission: 'view_loan_queue' },
  { key: 'overdue', label: 'Overdue', permission: 'view_overdue_loans' },
  { key: 'closed', label: 'Closed', permission: 'view_loan_details' },
  { key: 'all', label: 'All Loans', permission: 'view_loan_details' },
  { key: 'repayment', label: 'Repayment Logs', permission: 'view_repayment_logs' },
];

// Shared across tabs that return pendingReason/rejectionReason — only
// rendered when one is actually present on the row.
const reasonColumn = {
  key: 'reason',
  header: 'Reason',
  accessor: (row) => row.pendingReason || row.rejectionReason,
  render: (row) => {
    const reason = row.pendingReason || row.rejectionReason;
    if (!reason) return '—';
    return <Badge tone="warning">{humanizeReasonCode(reason)}</Badge>;
  },
};

const statusColumn = {
  key: 'status',
  header: 'Status',
  render: (row) => {
    const meta = getLoanStatusMeta(row.status);
    return <Badge tone={meta.tone}>{meta.label}</Badge>;
  },
};

const customerColumn = {
  key: 'customer',
  header: 'Customer',
  accessor: (row) => [row.firstName, row.lastName].filter(Boolean).join(' ') || row.userID,
  render: (row) => {
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ');
    return (
      <div>
        {name && <p className="text-ink-900">{name}</p>}
        <p className={`font-mono text-xs ${name ? 'text-ink-400' : 'text-ink-900'}`}>{row.userID}</p>
      </div>
    );
  },
  sortable: true,
};

// Shared date-range state + page-reset-on-change, used by every tab.
function useDateRange(deps = []) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return { from, to, setFrom, setTo, clear: () => { setFrom(''); setTo(''); } };
}

function QueueTab({ onRowClick, search }) {
  const { page, setPage, skip, limit } = useServerPagination();
  const { from, to, setFrom, setTo, clear } = useDateRange();
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to]);
  const { data: result, isLoading, error } = useLoanQueue({ search: search || undefined, from: from || undefined, to: to || undefined, skip, limit });
  const data = result?.data;
  const total = result?.total;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-end gap-3">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { clear(); setPage(1); }} />
      </div>
      <DataTable
        data={data || []}
        isLoading={isLoading}
        error={error}
        getRowId={(row) => row.loanID}
        onRowClick={onRowClick}
        emptyTitle="No loans in the queue"
        pageSize={DEFAULT_PAGE_SIZE}
        columns={[
          { key: 'loanID', header: 'Loan ID', className: 'font-mono text-xs text-ink-500' },
          customerColumn,
          statusColumn,
          { key: 'loanAmount', header: 'Amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
          { key: 'repaymentAmount', header: 'Repayment', render: (row) => formatNaira(row.repaymentAmount), hideOnMobile: true },
          reasonColumn,
          { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true },
        ]}
      />
      <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
    </div>
  );
}

function OverdueTab({ onRowClick, search }) {
  const { page, setPage, skip, limit } = useServerPagination();
  const { from, to, setFrom, setTo, clear } = useDateRange();
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to]);
  const { data: result, isLoading, error } = useOverdueLoans({ search: search || undefined, from: from || undefined, to: to || undefined, skip, limit });
  const data = result?.data;
  const total = result?.total;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-end gap-3">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { clear(); setPage(1); }} />
      </div>
      <DataTable
        data={data || []}
        isLoading={isLoading}
        error={error}
        getRowId={(row) => row.loanID}
        onRowClick={onRowClick}
        emptyTitle="No overdue loans"
        pageSize={DEFAULT_PAGE_SIZE}
        columns={[
          { key: 'loanID', header: 'Loan ID', className: 'font-mono text-xs text-ink-500' },
          customerColumn,
          { key: 'loanAmount', header: 'Amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
          { key: 'repaymentAmount', header: 'Outstanding', render: (row) => formatNaira(row.repaymentAmount), hideOnMobile: true },
          { key: 'penalty', header: 'Penalty', render: (row) => formatNaira(row.penalty) },
          { key: 'daysOverdue', header: 'Days overdue', sortable: true },
          { key: 'repaymentDate', header: 'Due date', render: (row) => formatDate(row.repaymentDate) },
        ]}
      />
      <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
    </div>
  );
}

function ClosedTab({ onRowClick, search }) {
  const { page, setPage, skip, limit } = useServerPagination();
  const { from, to, setFrom, setTo, clear } = useDateRange();
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to]);
  const { data: result, isLoading, error } = useAllLoans({ status: 'closed', search: search || undefined, from: from || undefined, to: to || undefined, skip, limit });
  const data = result?.data;
  const total = result?.total;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-end gap-3">
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { clear(); setPage(1); }} />
      </div>
      <DataTable
        data={data || []}
        isLoading={isLoading}
        error={error}
        getRowId={(row) => row.loanID}
        onRowClick={onRowClick}
        emptyTitle="No closed loans yet"
        pageSize={DEFAULT_PAGE_SIZE}
        columns={[
          { key: 'loanID', header: 'Loan ID', className: 'font-mono text-xs text-ink-500' },
          customerColumn,
          { key: 'loanAmount', header: 'Amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
          { key: 'paidAmount', header: 'Paid', render: (row) => formatNaira(row.paidAmount) },
          { key: 'penalty', header: 'Penalty', render: (row) => formatNaira(row.penalty), hideOnMobile: true },
          { key: 'repaymentDate', header: 'Repayment date', render: (row) => formatDate(row.repaymentDate) },
          { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true },
        ]}
      />
      <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
    </div>
  );
}

const LOAN_STATUSES = ['pending', 'disbursed', 'overdue', 'closed', 'rejected'];

function AllLoansTab({ onRowClick, search }) {
  const [statusFilter, setStatusFilter] = useState('');
  const { page, setPage, skip, limit } = useServerPagination();
  const { from, to, setFrom, setTo, clear } = useDateRange();
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, from, to]);
  const { data: result, isLoading, error } = useAllLoans({
    status: statusFilter || undefined,
    search: search || undefined,
    from: from || undefined,
    to: to || undefined,
    skip,
    limit,
  });
  const data = result?.data;
  const total = result?.total;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-end gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-control border border-ink-200 px-2 py-1.5 text-xs"
        >
          <option value="">All statuses</option>
          {LOAN_STATUSES.map((s) => (
            <option key={s} value={s}>{getLoanStatusMeta(s).label}</option>
          ))}
        </select>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} onClear={() => { clear(); setPage(1); }} />
      </div>
      <DataTable
        data={data || []}
        isLoading={isLoading}
        error={error}
        getRowId={(row) => row.loanID}
        onRowClick={onRowClick}
        emptyTitle="No loans found"
        pageSize={DEFAULT_PAGE_SIZE}
        columns={[
          { key: 'loanID', header: 'Loan ID', className: 'font-mono text-xs text-ink-500' },
          customerColumn,
          statusColumn,
          { key: 'loanAmount', header: 'Amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
          { key: 'paidAmount', header: 'Paid', render: (row) => formatNaira(row.paidAmount), hideOnMobile: true },
          { key: 'daysOverdue', header: 'Days overdue', hideOnMobile: true },
          reasonColumn,
          { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true },
        ]}
      />
      <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
    </div>
  );
}

function RepaymentLogsTab({ onRowClick, search }) {
  const { page, setPage, skip, limit } = useServerPagination();
  const { from, to, setFrom, setTo, clear } = useDateRange();
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to]);
  const { data: result, isLoading, error } = useRepaymentLogs({ search: search || undefined, from: from || undefined, to: to || undefined, skip, limit });
  const data = result?.data;
  const total = result?.total;

  return (
    <div>
      {/* This tab filters on repayment date (updatedAt), not creation date
          — labeled explicitly so it isn't mistaken for the other tabs'
          "when was this loan created" semantics. */}
      <div className="mb-3 flex flex-wrap items-end justify-end gap-3">
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onClear={() => { clear(); setPage(1); }}
          fromLabel="Repaid from"
          toLabel="Repaid to"
        />
      </div>
      <DataTable
        data={data || []}
        isLoading={isLoading}
        error={error}
        getRowId={(row) => row.loanID}
        onRowClick={onRowClick}
        emptyTitle="No repayment logs yet"
        pageSize={DEFAULT_PAGE_SIZE}
        columns={[
          { key: 'loanID', header: 'Loan ID', className: 'font-mono text-xs text-ink-500' },
          customerColumn,
          { key: 'loanAmount', header: 'Amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
          { key: 'paidAmount', header: 'Paid', render: (row) => formatNaira(row.paidAmount) },
          { key: 'penalty', header: 'Penalty', render: (row) => formatNaira(row.penalty), hideOnMobile: true },
          {
            key: 'repaymentStatus',
            header: 'Repayment',
            accessor: (row) => (row.isFullRepayment ? 'Full repayment' : 'Partial payment'),
            render: (row) => (
              <div className="flex items-center gap-1.5">
                <Badge tone={row.isFullRepayment ? 'success' : 'warning'}>
                  {row.isFullRepayment ? 'Full' : 'Partial'}
                </Badge>
                <span className="text-xs text-ink-400">{getLoanStatusMeta(row.status).label}</span>
              </div>
            ),
          },
        ]}
      />
      <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
    </div>
  );
}

export default function LoansList() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const visibleTabs = TABS.filter((tab) => hasPermission(tab.permission));
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);

  const goToLoan = (row) => navigate(`/loans/${row.loanID}`);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Loans</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Loan queue, overdue accounts, and repayment history.
          </p>
        </div>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by customer name, ID, or loan ID…"
          className="w-72"
        />
      </div>

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-ink-100">
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

      <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
        {activeTab === 'queue' && <QueueTab onRowClick={goToLoan} search={search} />}
        {activeTab === 'overdue' && <OverdueTab onRowClick={goToLoan} search={search} />}
        {activeTab === 'closed' && <ClosedTab onRowClick={goToLoan} search={search} />}
        {activeTab === 'all' && <AllLoansTab onRowClick={goToLoan} search={search} />}
        {activeTab === 'repayment' && <RepaymentLogsTab onRowClick={goToLoan} search={search} />}
      </div>
    </div>
  );
}
