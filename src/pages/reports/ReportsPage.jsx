import { useState, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useViewMode } from '../../hooks/useViewMode';
import {
  useTelemarketerTeamReport,
  useCollectionTeamReport,
  useCustomerCareTeamReport,
  useNPLReport,
  useRevenueReport,
  useCompanyKPISummary,
  usePayoutLogs,
} from '../../hooks/useReports';
import { useAssignableAdmins, useAllAdmins } from '../../hooks/useAdminUsers';
import { useServerPagination, DEFAULT_PAGE_SIZE } from '../../hooks/useServerPagination';
import * as reportsApi from '../../api/reports';
import * as adminUsersApi from '../../api/adminUsers';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import StatCard from '../../components/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import ViewModeToggle from '../../components/ViewModeToggle';
import { getLoanStatusMeta } from '../../lib/status';
import { formatDate, formatNaira } from '../../lib/format';
import { rowsToCsv, downloadCsv } from '../../lib/csv';
import { downloadXlsx } from '../../lib/xlsx';
import { AlertCircle, TrendingUp, AlertTriangle, Gauge, Banknote, Download } from 'lucide-react';

const SimpleBarChart = lazy(() => import('../../components/charts/SimpleBarChart'));
const SimpleLineChart = lazy(() => import('../../components/charts/SimpleLineChart'));
const ChartFallback = () => <div className="flex h-[240px] items-center justify-center"><Spinner /></div>;

const TABS = [
  {
    key: 'telemarketer',
    label: 'Telemarketer Team',
    anyOf: ['view_telemarketer_team_reports', 'view_all_staff_reports'],
  },
  {
    key: 'collection',
    label: 'Collection Team',
    anyOf: ['view_collection_officer_team_reports', 'view_all_staff_reports'],
  },
  {
    key: 'customer_care',
    label: 'Customer Care Team',
    anyOf: ['view_customer_care_team_reports', 'view_all_staff_reports'],
  },
  { key: 'npl', label: 'NPL / Default', permission: 'view_npl_default_reports' },
  { key: 'revenue', label: 'Revenue', permission: 'view_revenue' },
  { key: 'company_kpi', label: 'Company KPI', permission: 'view_company_wide_kpis' },
  { key: 'payout_logs', label: 'Payout Logs', permission: 'view_payout_logs' },
];

// Report rows only return the assignedTo adminID, no name. Resolved in
// three layers, broadest coverage first:
//  1. If the viewer holds view_admin_users (Ops Manager/Management/Founder
//     all do), pull the FULL admin list — covers everyone, including Team
//     Leads who picked up items directly, not just the base role.
//  2. The assignable-admins list for the report's base role function —
//     covers the common case for viewers who lack view_admin_users
//     (e.g. a Team Lead looking at their own team's report).
//  3. The viewer's own session — if an unresolved ID happens to be their
//     own adminID (e.g. a Team Lead who assigned something to themselves),
//     resolve it from session data, which needs no extra permission at all.
// Anything still unresolved after all three (another Team Lead's own
// directly-assigned item, viewed by someone without view_admin_users) has
// no available name anywhere in the API — shown as the raw ID, honestly.
function useAdminNameMap(roleFunction, enabled) {
  const { session, hasPermission } = useAuth();
  const canViewAllAdmins = hasPermission('view_admin_users');
  const { data: baseAdmins } = useAssignableAdmins(roleFunction, enabled);
  const { data: allAdminsResult } = useAllAdmins({}, enabled && canViewAllAdmins);
  const allAdmins = allAdminsResult?.data;

  return useMemo(() => {
    const map = {};
    (baseAdmins || []).forEach((a) => { map[a.adminID] = a.fullName; });
    (allAdmins || []).forEach((a) => { map[a.adminID] = a.fullName; });
    if (session?.adminID && session?.fullName) {
      map[session.adminID] = session.fullName;
    }
    return map;
  }, [baseAdmins, allAdmins, session]);
}

function nameOrFallback(nameByID, id) {
  if (!id) return 'Unassigned';
  return nameByID[id] || id;
}

// Shared column definitions — plain accessors (no JSX), reused for both the
// on-screen DataTable render and the CSV export of the same data.
const teamColumns = {
  telemarketer: (nameByID) => [
    { header: 'Telemarketer', accessor: (row) => nameOrFallback(nameByID, row._id) },
    { header: 'Total Leads', accessor: (row) => row.totalLeads },
    { header: 'Not Contacted', accessor: (row) => row.notContacted },
    { header: 'Contacted', accessor: (row) => row.contacted },
    { header: 'Interested', accessor: (row) => row.interested },
    { header: 'Not Interested', accessor: (row) => row.notInterested },
    { header: 'Converted', accessor: (row) => row.converted },
    { header: 'Do Not Call', accessor: (row) => row.doNotCall },
  ],
  collection: (nameByID) => [
    { header: 'Collection Officer', accessor: (row) => nameOrFallback(nameByID, row._id) },
    { header: 'Total Cases', accessor: (row) => row.totalCases },
    { header: 'Open', accessor: (row) => row.openCases },
    { header: 'In Progress', accessor: (row) => row.inProgressCases },
    { header: 'Resolved', accessor: (row) => row.resolvedCases },
    { header: 'Closed', accessor: (row) => row.closedCases },
    { header: 'Amount Recovered', accessor: (row) => row.totalAmountRecovered },
    { header: 'Amount Overdue', accessor: (row) => row.totalAmountOverdue },
  ],
  customer_care: (nameByID) => [
    { header: 'Customer Care Staff', accessor: (row) => nameOrFallback(nameByID, row._id) },
    { header: 'Total Complaints', accessor: (row) => row.totalComplaints },
    { header: 'Open', accessor: (row) => row.open },
    { header: 'In Progress', accessor: (row) => row.inProgress },
    { header: 'Resolved', accessor: (row) => row.resolved },
    { header: 'Closed', accessor: (row) => row.closed },
  ],
};

const summaryColumns = {
  npl: [
    { header: 'Total Overdue Loans', accessor: (row) => row.totalOverdueLoans },
    { header: 'Total Overdue Amount', accessor: (row) => row.totalOverdueAmount },
    { header: 'Total Penalty', accessor: (row) => row.totalPenalty },
    { header: 'Avg Days Overdue', accessor: (row) => row.avgDaysOverdue },
    { header: 'Max Days Overdue', accessor: (row) => row.maxDaysOverdue },
  ],
  revenue: [
    { header: 'Loans Repaid', accessor: (row) => row.totalLoansRepaid },
    { header: 'Total Loan Amount', accessor: (row) => row.totalLoanAmount },
    { header: 'Interest Collected', accessor: (row) => row.totalInterestCollected },
    { header: 'Admin Cost Collected', accessor: (row) => row.totalAdminCostCollected },
    { header: 'Penalty Collected', accessor: (row) => row.totalPenaltyCollected },
    { header: 'Total Revenue', accessor: (row) => row.totalRevenue },
  ],
  company_kpi: [
    { header: 'Total Users', accessor: (row) => row.totalUsers },
    { header: 'Loans This Month', accessor: (row) => row.loansThisMonth },
    { header: 'Total Overdue Loans', accessor: (row) => row.totalOverdueLoans },
    { header: 'Leads Converted This Month', accessor: (row) => row.leadsConvertedThisMonth },
    { header: 'Open Complaints', accessor: (row) => row.openComplaints },
  ],
};

const payoutColumns = [
  { header: 'Loan ID', accessor: (row) => row.loanID },
  { header: 'Customer', accessor: (row) => row.userID },
  { header: 'Status', accessor: (row) => row.status },
  { header: 'Amount', accessor: (row) => row.loanAmount },
  { header: 'Channel', accessor: (row) => row.disbursedChannel },
  { header: 'Method', accessor: (row) => row.disbursedMethod },
  { header: 'Reference', accessor: (row) => row.disbursedPaymentReference },
  { header: 'Date', accessor: (row) => row.disbursementDate },
];

function ExportButton({ onClick, disabled, label }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled}>
      <Download className="h-3.5 w-3.5" />
      {label || 'Export CSV'}
    </Button>
  );
}

function TabHeader({ title, onExport, exportDisabled, exportLabel }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {onExport && <ExportButton onClick={onExport} disabled={exportDisabled} label={exportLabel} />}
    </div>
  );
}

function TelemarketerTeamTab({ canExport, dateRange, mode }) {
  const { data, isLoading, error } = useTelemarketerTeamReport(dateRange);
  const nameByID = useAdminNameMap('telemarketer', true);
  const columns = teamColumns.telemarketer(nameByID);
  const chartData = (data || []).map((r) => ({ name: nameOrFallback(nameByID, r._id), Converted: r.converted, 'Total Leads': r.totalLeads }));

  return (
    <div>
      <TabHeader
        title="Telemarketer Team"
        onExport={canExport ? () => downloadCsv('telemarketer-team-report.csv', rowsToCsv(data || [], columns)) : null}
        exportDisabled={!data || data.length === 0}
      />
      {mode === 'chart' ? (
        isLoading ? <ChartFallback /> : error ? <EmptyState icon={AlertCircle} title="Couldn't load this report" description={error.message} />
        : chartData.length === 0 ? <EmptyState title="No lead activity yet" />
        : (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'Converted', name: 'Converted', color: '#2593f4' }, { dataKey: 'Total Leads', name: 'Total Leads', color: '#a8cdec' }]} />
          </Suspense>
        )
      ) : (
        <DataTable
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row._id || 'unassigned'}
          emptyTitle="No lead activity yet"
          columns={[
            { key: 'name', header: 'Telemarketer', accessor: (row) => nameOrFallback(nameByID, row._id) },
            { key: 'totalLeads', header: 'Total leads', sortable: true },
            { key: 'notContacted', header: 'Not contacted', hideOnMobile: true },
            { key: 'contacted', header: 'Contacted', hideOnMobile: true },
            { key: 'interested', header: 'Interested', hideOnMobile: true },
            { key: 'notInterested', header: 'Not interested', hideOnMobile: true },
            { key: 'converted', header: 'Converted', sortable: true },
            { key: 'doNotCall', header: 'Do not call', hideOnMobile: true },
          ]}
        />
      )}
    </div>
  );
}

function CollectionTeamTab({ canExport, dateRange, mode }) {
  const { data, isLoading, error } = useCollectionTeamReport(dateRange);
  const nameByID = useAdminNameMap('collection_officer', true);
  const columns = teamColumns.collection(nameByID);

  const chartData = (data || []).map((r) => ({ name: nameOrFallback(nameByID, r._id), Recovered: r.totalAmountRecovered }));

  return (
    <div>
      <TabHeader
        title="Collection Team"
        onExport={canExport ? () => downloadCsv('collection-team-report.csv', rowsToCsv(data || [], columns)) : null}
        exportDisabled={!data || data.length === 0}
      />
      {mode === 'chart' ? (
        isLoading ? <ChartFallback /> : error ? <EmptyState icon={AlertCircle} title="Couldn't load this report" description={error.message} />
        : chartData.length === 0 ? <EmptyState title="No collection case activity yet" />
        : (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'Recovered', name: 'Amount Recovered', color: '#2593f4' }]} />
          </Suspense>
        )
      ) : (
        <DataTable
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row._id || 'unassigned'}
          emptyTitle="No collection case activity yet"
          columns={[
            { key: 'name', header: 'Collection Officer', accessor: (row) => nameOrFallback(nameByID, row._id) },
            { key: 'totalCases', header: 'Total cases', sortable: true },
            { key: 'openCases', header: 'Open', hideOnMobile: true },
            { key: 'inProgressCases', header: 'In progress', hideOnMobile: true },
            { key: 'resolvedCases', header: 'Resolved', hideOnMobile: true },
            { key: 'closedCases', header: 'Closed', hideOnMobile: true },
            { key: 'totalAmountRecovered', header: 'Recovered', render: (row) => formatNaira(row.totalAmountRecovered), sortable: true },
            { key: 'totalAmountOverdue', header: 'Overdue', render: (row) => formatNaira(row.totalAmountOverdue), hideOnMobile: true },
          ]}
        />
      )}
    </div>
  );
}

function CustomerCareTeamTab({ canExport, dateRange, mode }) {
  const { data, isLoading, error } = useCustomerCareTeamReport(dateRange);
  const nameByID = useAdminNameMap('customer_care', true);
  const columns = teamColumns.customer_care(nameByID);
  const chartData = (data || []).map((r) => ({ name: nameOrFallback(nameByID, r._id), Resolved: r.resolved, 'Total Complaints': r.totalComplaints }));

  return (
    <div>
      <TabHeader
        title="Customer Care Team"
        onExport={canExport ? () => downloadCsv('customer-care-team-report.csv', rowsToCsv(data || [], columns)) : null}
        exportDisabled={!data || data.length === 0}
      />
      {mode === 'chart' ? (
        isLoading ? <ChartFallback /> : error ? <EmptyState icon={AlertCircle} title="Couldn't load this report" description={error.message} />
        : chartData.length === 0 ? <EmptyState title="No complaint activity yet" />
        : (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'Resolved', name: 'Resolved', color: '#2593f4' }, { dataKey: 'Total Complaints', name: 'Total Complaints', color: '#a8cdec' }]} />
          </Suspense>
        )
      ) : (
        <DataTable
          data={data || []}
          isLoading={isLoading}
          error={error}
          getRowId={(row) => row._id || 'unassigned'}
          emptyTitle="No complaint activity yet"
          columns={[
            { key: 'name', header: 'Customer Care Staff', accessor: (row) => nameOrFallback(nameByID, row._id) },
            { key: 'totalComplaints', header: 'Total complaints', sortable: true },
            { key: 'open', header: 'Open', hideOnMobile: true },
            { key: 'inProgress', header: 'In progress', hideOnMobile: true },
            { key: 'resolved', header: 'Resolved', sortable: true },
            { key: 'closed', header: 'Closed', hideOnMobile: true },
          ]}
        />
      )}
    </div>
  );
}

function SummaryGrid({ isLoading, error, children }) {
  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <EmptyState icon={AlertCircle} title="Couldn't load this report" description={error.message} />;
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}

function NPLTab({ canExport, mode }) {
  const { data, isLoading, error } = useNPLReport();
  return (
    <div>
      <TabHeader
        title="NPL / Default"
        onExport={canExport ? () => downloadCsv('npl-report.csv', rowsToCsv(data ? [data] : [], summaryColumns.npl)) : null}
        exportDisabled={!data}
      />
      <p className="mb-3 text-xs text-ink-400">
        Always reflects current overdue loans — not affected by the date range picker above.
      </p>
      {mode === 'chart' ? (
        isLoading ? <ChartFallback /> : error ? <EmptyState icon={AlertCircle} title="Couldn't load this report" description={error.message} />
        : (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart
              data={data ? [
                { name: 'Overdue Loans', value: data.totalOverdueLoans },
                { name: 'Overdue Amount (₦k)', value: Math.round((data.totalOverdueAmount || 0) / 1000) },
                { name: 'Total Penalty (₦k)', value: Math.round((data.totalPenalty || 0) / 1000) },
                { name: 'Avg Days Overdue', value: Math.round(data.avgDaysOverdue || 0) },
                { name: 'Max Days Overdue', value: data.maxDaysOverdue || 0 },
              ] : []}
              xKey="name"
              bars={[{ dataKey: 'value', name: 'Value', color: '#ef4444' }]}
            />
          </Suspense>
        )
      ) : (
        <SummaryGrid isLoading={isLoading} error={error}>
          <StatCard label="Overdue loans" value={data?.totalOverdueLoans ?? '—'} icon={AlertTriangle} tone="danger" />
          <StatCard label="Overdue amount" value={data ? formatNaira(data.totalOverdueAmount) : '—'} icon={Banknote} tone="danger" />
          <StatCard label="Total penalty" value={data ? formatNaira(data.totalPenalty) : '—'} icon={Banknote} tone="warning" />
          <StatCard label="Avg. days overdue" value={data?.avgDaysOverdue !== undefined ? Math.round(data.avgDaysOverdue) : '—'} icon={Gauge} />
          <StatCard label="Max days overdue" value={data?.maxDaysOverdue ?? '—'} icon={Gauge} tone="danger" />
        </SummaryGrid>
      )}
    </div>
  );
}

function RevenueTab({ canExport, dateRange, mode }) {
  const { data, isLoading, error } = useRevenueReport(dateRange);
  return (
    <div>
      <TabHeader
        title="Revenue"
        onExport={canExport ? () => downloadCsv('revenue-report.csv', rowsToCsv(data ? [data] : [], summaryColumns.revenue)) : null}
        exportDisabled={!data}
      />
      {mode === 'chart' ? (
        isLoading ? <ChartFallback /> : error ? <EmptyState icon={AlertCircle} title="Couldn't load this report" description={error.message} />
        : (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart
              data={data ? [
                { name: 'Interest', value: data.totalInterestCollected },
                { name: 'Admin Cost', value: data.totalAdminCostCollected },
                { name: 'Penalty', value: data.totalPenaltyCollected },
              ] : []}
              xKey="name"
              bars={[{ dataKey: 'value', name: 'Amount (₦)', color: '#22c55e' }]}
            />
          </Suspense>
        )
      ) : (
        <SummaryGrid isLoading={isLoading} error={error}>
          <StatCard label="Loans repaid" value={data?.totalLoansRepaid ?? '—'} icon={TrendingUp} tone="success" />
          <StatCard label="Total loan amount" value={data ? formatNaira(data.totalLoanAmount) : '—'} icon={Banknote} />
          <StatCard label="Interest collected" value={data ? formatNaira(data.totalInterestCollected) : '—'} icon={Banknote} tone="success" />
          <StatCard label="Admin cost collected" value={data ? formatNaira(data.totalAdminCostCollected) : '—'} icon={Banknote} tone="success" />
          <StatCard label="Penalty collected" value={data ? formatNaira(data.totalPenaltyCollected) : '—'} icon={Banknote} tone="warning" />
          <StatCard label="Total revenue" value={data ? formatNaira(data.totalRevenue) : '—'} icon={TrendingUp} tone="success" />
        </SummaryGrid>
      )}
    </div>
  );
}

function CompanyKpiTab({ canExport, dateRange, mode }) {
  const { data, isLoading, error } = useCompanyKPISummary(dateRange);
  const hasRange = !!(dateRange?.from || dateRange?.to);
  return (
    <div>
      <TabHeader
        title="Company KPI"
        onExport={canExport ? () => downloadCsv('company-kpi-summary.csv', rowsToCsv(data ? [data] : [], summaryColumns.company_kpi)) : null}
        exportDisabled={!data}
      />
      <p className="mb-3 text-xs text-ink-400">
        Only "Loans" and "Leads converted" respect the date range above — the other three always reflect current state.
      </p>
      {mode === 'chart' ? (
        isLoading ? <ChartFallback /> : error ? <EmptyState icon={AlertCircle} title="Couldn't load this report" description={error.message} />
        : (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart
              data={data ? [
                { name: 'Total Users', value: data.totalUsers },
                { name: hasRange ? 'Loans (range)' : 'Loans (mo.)', value: data.loansThisMonth },
                { name: 'Overdue', value: data.totalOverdueLoans },
                { name: hasRange ? 'Converted (range)' : 'Converted (mo.)', value: data.leadsConvertedThisMonth },
                { name: 'Open Complaints', value: data.openComplaints },
              ] : []}
              xKey="name"
              bars={[{ dataKey: 'value', name: 'Count', color: '#2593f4' }]}
            />
          </Suspense>
        )
      ) : (
        <SummaryGrid isLoading={isLoading} error={error}>
          <StatCard label="Total users (current)" value={data?.totalUsers ?? '—'} icon={TrendingUp} />
          <StatCard label={hasRange ? 'Loans in range' : 'Loans this month'} value={data?.loansThisMonth ?? '—'} icon={TrendingUp} />
          <StatCard label="Overdue loans (current)" value={data?.totalOverdueLoans ?? '—'} icon={AlertTriangle} tone="danger" />
          <StatCard label={hasRange ? 'Leads converted in range' : 'Leads converted this month'} value={data?.leadsConvertedThisMonth ?? '—'} icon={TrendingUp} tone="success" />
          <StatCard label="Open complaints (current)" value={data?.openComplaints ?? '—'} icon={AlertTriangle} tone="warning" />
        </SummaryGrid>
      )}
    </div>
  );
}

// Groups payout logs by month for a volume-over-time timeline — the only
// grouping granularity that stays readable across an arbitrary log span.
function groupPayoutsByMonth(logs) {
  const byMonth = {};
  (logs || []).forEach((log) => {
    if (!log.disbursementDate) return;
    const d = new Date(log.disbursementDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { key, count: 0, amount: 0 };
    byMonth[key].count += 1;
    byMonth[key].amount += log.loanAmount || 0;
  });
  return Object.values(byMonth)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((m) => ({ label: m.key, Count: m.count, 'Amount (₦k)': Math.round(m.amount / 1000) }));
}

function PayoutLogsTab({ canExport, mode }) {
  const { page, setPage, skip, limit } = useServerPagination();

  // Table view: real pagination. Chart view: needs the complete dataset for
  // an accurate monthly timeline — grouping just one loaded page by month
  // would silently drop older months, so it fetches everything instead
  // (skip/limit omitted = backend's return-everything default). Only the
  // active mode's query runs, so these never fetch simultaneously.
  const { data: pagedResult, isLoading: pagedLoading, error: pagedError } =
    usePayoutLogs({ skip, limit }, mode === 'table');
  const { data: fullResult, isLoading: fullLoading, error: fullError } =
    usePayoutLogs({}, mode === 'chart');

  const tableData = pagedResult?.data;
  const total = pagedResult?.total;
  const chartData = useMemo(() => groupPayoutsByMonth(fullResult?.data), [fullResult]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      // Dedicated fetch, always the full matching set via export:true —
      // independent of whichever page/mode happens to be on screen, so
      // Export always reflects everything, not just what's currently
      // loaded for display.
      const result = await reportsApi.getPayoutLogs({ export: true });
      downloadCsv('payout-logs.csv', rowsToCsv(result.data || [], payoutColumns));
    } finally {
      setExporting(false);
    }
  };

  const hasAnyData = mode === 'table' ? (total || 0) > 0 : chartData.length > 0;

  return (
    <div>
      <TabHeader
        title="Payout Logs"
        onExport={canExport ? handleExport : null}
        exportDisabled={exporting || !hasAnyData}
        exportLabel={exporting ? 'Exporting…' : undefined}
      />
      <p className="mb-3 text-xs text-ink-400">Not affected by the date range picker above — shows all logged payouts.</p>
      {mode === 'chart' ? (
        fullLoading ? <ChartFallback /> : fullError ? <EmptyState icon={AlertCircle} title="Couldn't load this report" description={fullError.message} />
        : chartData.length === 0 ? <EmptyState title="No payouts logged yet" />
        : (
          <Suspense fallback={<ChartFallback />}>
            <SimpleLineChart data={chartData} xKey="label" lines={[{ dataKey: 'Count', name: 'Loans Disbursed', color: '#2593f4' }]} />
          </Suspense>
        )
      ) : (
        <>
          <DataTable
            data={tableData || []}
            isLoading={pagedLoading}
            error={pagedError}
            getRowId={(row) => row.loanID}
            emptyTitle="No payouts logged yet"
            pageSize={DEFAULT_PAGE_SIZE}
            columns={[
              { key: 'loanID', header: 'Loan ID', className: 'font-mono text-xs text-ink-500' },
              { key: 'userID', header: 'Customer', className: 'font-mono text-xs' },
              {
                key: 'status',
                header: 'Status',
                render: (row) => {
                  const meta = getLoanStatusMeta(row.status);
                  return <Badge tone={meta.tone}>{meta.label}</Badge>;
                },
              },
              { key: 'loanAmount', header: 'Amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
              { key: 'disbursedChannel', header: 'Channel', hideOnMobile: true },
              { key: 'disbursedMethod', header: 'Method', hideOnMobile: true },
              { key: 'disbursedPaymentReference', header: 'Reference', className: 'font-mono text-xs', hideOnMobile: true },
              { key: 'disbursementDate', header: 'Date', render: (row) => formatDate(row.disbursementDate), sortable: true },
            ]}
          />
          <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { session, hasPermission, hasAnyPermission } = useAuth();
  const visibleTabs = TABS.filter((tab) =>
    tab.permission ? hasPermission(tab.permission) : hasAnyPermission(tab.anyOf)
  );
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);
  const [exportingAll, setExportingAll] = useState(false);
  const [mode, setMode] = useViewMode('chart');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const dateRange = useMemo(() => {
    const r = {};
    if (from) r.from = from;
    if (to) r.to = to;
    return r;
  }, [from, to]);

  const canExport = hasPermission('export_data');
  const canViewAllAdmins = hasPermission('view_admin_users');

  // "Export all" needs every visible report's data plus the name maps for
  // the team reports — fetched fresh here rather than depending on which
  // tabs happen to already be cached from browsing, so the export is
  // complete regardless of which tab was open when the button was clicked.
  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const [allAdminsResult, telemarketerAdmins, collectionAdmins, careAdmins] = await Promise.all([
        canViewAllAdmins ? adminUsersApi.getAllAdmins() : Promise.resolve({ data: [] }),
        visibleTabs.some((t) => t.key === 'telemarketer') ? adminUsersApi.getAssignableAdmins('telemarketer') : Promise.resolve({ data: [] }),
        visibleTabs.some((t) => t.key === 'collection') ? adminUsersApi.getAssignableAdmins('collection_officer') : Promise.resolve({ data: [] }),
        visibleTabs.some((t) => t.key === 'customer_care') ? adminUsersApi.getAssignableAdmins('customer_care') : Promise.resolve({ data: [] }),
      ]);

      const buildNameMap = (baseList) => {
        const map = {};
        (baseList || []).forEach((a) => { map[a.adminID] = a.fullName; });
        (allAdminsResult.data || []).forEach((a) => { map[a.adminID] = a.fullName; });
        if (session?.adminID && session?.fullName) map[session.adminID] = session.fullName;
        return map;
      };

      const sections = [];

      for (const tab of visibleTabs) {
        if (tab.key === 'telemarketer') {
          const result = await reportsApi.getTelemarketerTeamReport(dateRange);
          const nameByID = buildNameMap(telemarketerAdmins.data);
          sections.push({ title: 'Telemarketer Team', rows: result.data || [], columns: teamColumns.telemarketer(nameByID) });
        }
        if (tab.key === 'collection') {
          const result = await reportsApi.getCollectionTeamReport(dateRange);
          const nameByID = buildNameMap(collectionAdmins.data);
          sections.push({ title: 'Collection Team', rows: result.data || [], columns: teamColumns.collection(nameByID) });
        }
        if (tab.key === 'customer_care') {
          const result = await reportsApi.getCustomerCareTeamReport(dateRange);
          const nameByID = buildNameMap(careAdmins.data);
          sections.push({ title: 'Customer Care Team', rows: result.data || [], columns: teamColumns.customer_care(nameByID) });
        }
        if (tab.key === 'npl') {
          const result = await reportsApi.getNPLReport();
          sections.push({ title: 'NPL / Default', rows: result.data ? [result.data] : [], columns: summaryColumns.npl });
        }
        if (tab.key === 'revenue') {
          const result = await reportsApi.getRevenueReport(dateRange);
          sections.push({ title: 'Revenue', rows: result.data ? [result.data] : [], columns: summaryColumns.revenue });
        }
        if (tab.key === 'company_kpi') {
          const result = await reportsApi.getCompanyKPISummary(dateRange);
          sections.push({ title: 'Company KPI', rows: result.data ? [result.data] : [], columns: summaryColumns.company_kpi });
        }
        if (tab.key === 'payout_logs') {
          const result = await reportsApi.getPayoutLogs();
          sections.push({ title: 'Payout Logs', rows: result.data || [], columns: payoutColumns });
        }
      }

      await downloadXlsx(`all-reports-${new Date().toISOString().slice(0, 10)}.xlsx`, sections);
    } catch {
      // If any individual report fails, the export simply omits that
      // section rather than failing entirely — no separate error UI here
      // since this is a best-effort combined download, not a page state.
    } finally {
      setExportingAll(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Reports</h1>
          <p className="mt-0.5 text-sm text-ink-500">Team performance and financial summaries.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle mode={mode} onChange={setMode} />
          {canExport && (
            <Button variant="secondary" size="sm" onClick={handleExportAll} disabled={exportingAll}>
              <Download className="h-3.5 w-3.5" />
              {exportingAll ? 'Exporting…' : 'Export all reports'}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card bg-white p-3 shadow-sm ring-1 ring-ink-100">
        <label className="block text-xs font-medium text-ink-700">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
          />
        </label>
        <label className="block text-xs font-medium text-ink-700">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
          />
        </label>
        {(from || to) && (
          <button
            type="button"
            onClick={() => { setFrom(''); setTo(''); }}
            className="mb-1.5 text-xs font-medium text-dodger-600 hover:underline"
          >
            Clear range
          </button>
        )}
        <p className="mb-1.5 ml-auto text-xs text-ink-400">
          Applies to Team, Revenue, and Company KPI reports — NPL and Payout Logs always show current data.
        </p>
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
        {activeTab === 'telemarketer' && <TelemarketerTeamTab canExport={canExport} dateRange={dateRange} mode={mode} />}
        {activeTab === 'collection' && <CollectionTeamTab canExport={canExport} dateRange={dateRange} mode={mode} />}
        {activeTab === 'customer_care' && <CustomerCareTeamTab canExport={canExport} dateRange={dateRange} mode={mode} />}
        {activeTab === 'npl' && <NPLTab canExport={canExport} mode={mode} />}
        {activeTab === 'revenue' && <RevenueTab canExport={canExport} dateRange={dateRange} mode={mode} />}
        {activeTab === 'company_kpi' && <CompanyKpiTab canExport={canExport} dateRange={dateRange} mode={mode} />}
        {activeTab === 'payout_logs' && <PayoutLogsTab canExport={canExport} mode={mode} />}
      </div>
    </div>
  );
}
