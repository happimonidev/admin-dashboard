import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useViewMode } from '../../hooks/useViewMode';
import { useAssignedLeads } from '../../hooks/useLeads';
import { useAssignedCases } from '../../hooks/useCollectionCases';
import { useAssignedComplaints } from '../../hooks/useComplaints';
import { useOwnKPI } from '../../hooks/useKpi';
import {
  useCompanyKPISummary,
  useRevenueReport,
  useNPLReport,
  useTelemarketerTeamReport,
  useCollectionTeamReport,
  useCustomerCareTeamReport,
} from '../../hooks/useReports';
import { useAssignableAdmins } from '../../hooks/useAdminUsers';
import { useAuditLogs } from '../../hooks/useAudit';
import Card from '../../components/ui/Card';
import StatCard from '../../components/StatCard';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import ViewModeToggle from '../../components/ViewModeToggle';
import { formatDateTime, formatNaira } from '../../lib/format';
import {
  UserPlus, ClipboardList, MessageCircleWarning, TrendingUp, ArrowRight,
  AlertTriangle, Banknote, Users,
} from 'lucide-react';

const SimpleBarChart = lazy(() => import('../../components/charts/SimpleBarChart'));
const ChartFallback = () => (
  <div className="flex h-[240px] items-center justify-center"><Spinner /></div>
);

const humanizeMetricKey = (key) =>
  (key || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ACTION_TONES = {
  view: 'neutral', create: 'success', edit: 'info',
  delete: 'danger', export: 'warning', login: 'success', logout: 'neutral',
};

function SectionHeader({ title, action }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
      {action}
    </div>
  );
}

// ─── INDIVIDUAL CONTRIBUTOR: MY WORKLOAD ──────────────────────────────────────
function MyWorkloadSection({ mode }) {
  const { hasPermission } = useAuth();
  const showLeads = hasPermission('view_assigned_leads');
  const showCases = hasPermission('view_assigned_collection_cases');
  const showComplaints = hasPermission('view_assigned_complaints');

  // Explicit {} params — no skip/limit sent means the backend returns the
  // full assigned list (its backward-compatible default), which is what
  // this widget needs for an accurate converted/resolved count. LeadsList's
  // own "My Leads" tab passes real skip/limit for actual pagination.
  const { data: leadsResult, isLoading: leadsLoading } = useAssignedLeads({}, showLeads);
  const leads = leadsResult?.data;
  const { data: casesResult, isLoading: casesLoading } = useAssignedCases({}, showCases);
  const cases = casesResult?.data;
  const { data: complaintsResult, isLoading: complaintsLoading } = useAssignedComplaints({}, showComplaints);
  const complaints = complaintsResult?.data;

  if (!showLeads && !showCases && !showComplaints) return null;

  const anyLoading = leadsLoading || casesLoading || complaintsLoading;

  // These lists include every assigned item regardless of status (not just
  // active ones), so the outcome counts below come from data already in
  // hand — no separate backend call needed.
  const convertedLeads = (leads || []).filter((l) => l.status === 'converted').length;
  const resolvedCases = (cases || []).filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const amountRecovered = (cases || []).reduce((sum, c) => sum + (c.amountRecovered || 0), 0);
  const resolvedComplaints = (complaints || []).filter((c) => c.status === 'resolved' || c.status === 'closed').length;

  const chartData = [
    showLeads && { name: 'Leads', Assigned: leads?.length ?? 0, Converted: convertedLeads },
    showCases && { name: 'Cases', Assigned: cases?.length ?? 0, Resolved: resolvedCases },
    showComplaints && { name: 'Complaints', Assigned: complaints?.length ?? 0, Resolved: resolvedComplaints },
  ].filter(Boolean);

  return (
    <div>
      <SectionHeader title="My Workload" />
      {mode === 'chart' ? (
        <Card className="p-4">
          {anyLoading ? <ChartFallback /> : (
            <Suspense fallback={<ChartFallback />}>
              <SimpleBarChart
                data={chartData}
                xKey="name"
                bars={[
                  { dataKey: 'Assigned', name: 'Assigned', color: '#a8cdec' },
                  { dataKey: 'Converted', name: 'Converted', color: '#2593f4' },
                  { dataKey: 'Resolved', name: 'Resolved', color: '#2593f4' },
                ]}
                height={200}
              />
            </Suspense>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {showLeads && (
            <Link to="/leads">
              <StatCard label="Assigned leads" value={leadsLoading ? '—' : leads?.length ?? 0} icon={UserPlus} hint={leadsLoading ? undefined : `${convertedLeads} converted`} />
            </Link>
          )}
          {showCases && (
            <Link to="/collection">
              <StatCard label="Assigned cases" value={casesLoading ? '—' : cases?.length ?? 0} icon={ClipboardList} hint={casesLoading ? undefined : `${resolvedCases} resolved · ${formatNaira(amountRecovered)} recovered`} />
            </Link>
          )}
          {showComplaints && (
            <Link to="/complaints">
              <StatCard label="Assigned complaints" value={complaintsLoading ? '—' : complaints?.length ?? 0} icon={MessageCircleWarning} hint={complaintsLoading ? undefined : `${resolvedComplaints} resolved`} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ─── INDIVIDUAL CONTRIBUTOR: MY KPI ───────────────────────────────────────────
function MyKpiSection({ mode }) {
  const { hasPermission } = useAuth();
  const enabled = hasPermission('view_own_kpi');
  const { data, isLoading } = useOwnKPI(enabled);

  if (!enabled) return null;

  const results = data?.results || [];
  const chartableResults = results.filter((r) => typeof r.value === 'number');
  const chartData = chartableResults.map((r) => ({ name: humanizeMetricKey(r.metric), Actual: r.value, Target: r.targetValue }));

  return (
    <Card className="p-4">
      <SectionHeader title="My KPI" action={<Link to="/kpi" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">View details <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : results.length === 0 ? <p className="text-sm text-ink-500">No KPI targets have been set for you yet.</p>
        : mode === 'chart' ? (
          chartableResults.length === 0 ? (
            <p className="text-sm text-ink-500">No numeric results to chart yet — check table view for manual metrics awaiting submission.</p>
          ) : (
            <Suspense fallback={<ChartFallback />}>
              <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'Actual', name: 'Actual', color: '#2593f4' }, { dataKey: 'Target', name: 'Target', color: '#a8cdec' }]} />
            </Suspense>
          )
        ) : (
          <div className="flex flex-col">
            {results.map((r, i) => (
              <div key={`${r.metric}-${i}`} className="flex items-center justify-between border-b border-ink-50 py-2 text-sm last:border-0">
                <span className="text-ink-700">{humanizeMetricKey(r.metric)}</span>
                <span className="font-medium text-ink-900">
                  {r.value === null || r.value === undefined
                    ? <span className="font-normal text-ink-400">Not yet submitted</span>
                    : <>{r.value}{r.targetValue !== undefined && <span className="font-normal text-ink-400"> / {r.targetValue}</span>}</>}
                </span>
              </div>
            ))}
          </div>
        )}
    </Card>
  );
}

// ─── TEAM LEAD: MY TEAM ────────────────────────────────────────────────────────
// Shown to Team Leads specifically — those with visibility into ONE team's
// KPI/activity but not the broad view_all_staff_reports an Operations
// Manager/Management holds. Answers "are the people under me working."
function useTeamNameMap(roleFunction, enabled) {
  const { data: admins } = useAssignableAdmins(roleFunction, enabled);
  return useMemo(() => {
    const map = {};
    (admins || []).forEach((a) => { map[a.adminID] = a.fullName; });
    return map;
  }, [admins]);
}

function nameOrID(nameByID, id) {
  return id ? (nameByID[id] || id) : 'Unassigned';
}

function TelemarketerTeamSection({ mode, visible }) {
  const { data, isLoading } = useTelemarketerTeamReport({}, visible);
  const nameByID = useTeamNameMap('telemarketer', visible);
  if (!visible) return null;

  const rows = (data || []).slice(0, 5);
  const chartData = rows.map((r) => ({ name: nameOrID(nameByID, r._id), Converted: r.converted, 'Total Leads': r.totalLeads }));

  return (
    <Card className="p-4">
      <SectionHeader title="My Team — Telemarketers" action={<Link to="/reports" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">Full report <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : rows.length === 0 ? <p className="text-sm text-ink-500">No lead activity from your team yet.</p>
        : mode === 'chart' ? (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'Converted', name: 'Converted', color: '#2593f4' }, { dataKey: 'Total Leads', name: 'Total Leads', color: '#a8cdec' }]} />
          </Suspense>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b border-ink-50 py-2 text-sm last:border-0">
                <span className="text-ink-700">{nameOrID(nameByID, r._id)}</span>
                <span className="text-ink-900">{r.converted} converted / {r.totalLeads} total</span>
              </div>
            ))}
          </div>
        )}
    </Card>
  );
}

function CollectionTeamSection({ mode, visible }) {
  const { data, isLoading } = useCollectionTeamReport({}, visible);
  const nameByID = useTeamNameMap('collection_officer', visible);
  if (!visible) return null;

  const rows = (data || []).slice(0, 5);
  const chartData = rows.map((r) => ({ name: nameOrID(nameByID, r._id), Recovered: r.totalAmountRecovered }));

  return (
    <Card className="p-4">
      <SectionHeader title="My Team — Collection Officers" action={<Link to="/reports" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">Full report <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : rows.length === 0 ? <p className="text-sm text-ink-500">No collection case activity from your team yet.</p>
        : mode === 'chart' ? (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'Recovered', name: 'Amount Recovered', color: '#2593f4' }]} />
          </Suspense>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b border-ink-50 py-2 text-sm last:border-0">
                <span className="text-ink-700">{nameOrID(nameByID, r._id)}</span>
                <span className="text-ink-900">{formatNaira(r.totalAmountRecovered)} recovered · {r.totalCases} cases</span>
              </div>
            ))}
          </div>
        )}
    </Card>
  );
}

function CustomerCareTeamSection({ mode, visible }) {
  const { data, isLoading } = useCustomerCareTeamReport({}, visible);
  const nameByID = useTeamNameMap('customer_care', visible);
  if (!visible) return null;

  const rows = (data || []).slice(0, 5);
  const chartData = rows.map((r) => ({ name: nameOrID(nameByID, r._id), Resolved: r.resolved, 'Total Complaints': r.totalComplaints }));

  return (
    <Card className="p-4">
      <SectionHeader title="My Team — Customer Care" action={<Link to="/reports" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">Full report <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : rows.length === 0 ? <p className="text-sm text-ink-500">No complaint activity from your team yet.</p>
        : mode === 'chart' ? (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'Resolved', name: 'Resolved', color: '#2593f4' }, { dataKey: 'Total Complaints', name: 'Total Complaints', color: '#a8cdec' }]} />
          </Suspense>
        ) : (
          <div className="flex flex-col">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b border-ink-50 py-2 text-sm last:border-0">
                <span className="text-ink-700">{nameOrID(nameByID, r._id)}</span>
                <span className="text-ink-900">{r.resolved} resolved / {r.totalComplaints} total</span>
              </div>
            ))}
          </div>
        )}
    </Card>
  );
}

// ─── EXECUTIVE: COMPANY / REVENUE / NPL ───────────────────────────────────────
function CompanySnapshotSection({ mode }) {
  const { hasPermission } = useAuth();
  const enabled = hasPermission('view_company_wide_kpis');
  const { data, isLoading } = useCompanyKPISummary({}, enabled);
  if (!enabled) return null;

  const chartData = data ? [
    { name: 'Total Users', value: data.totalUsers },
    { name: 'Loans (mo.)', value: data.loansThisMonth },
    { name: 'Overdue', value: data.totalOverdueLoans },
    { name: 'Converted (mo.)', value: data.leadsConvertedThisMonth },
    { name: 'Open Complaints', value: data.openComplaints },
  ] : [];

  return (
    <div>
      <SectionHeader title="Company Snapshot" action={<Link to="/reports" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">Full reports <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : mode === 'chart' ? (
          <Card className="p-4">
            <Suspense fallback={<ChartFallback />}>
              <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'value', name: 'Count', color: '#2593f4' }]} />
            </Suspense>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total users" value={data?.totalUsers ?? '—'} icon={Users} />
            <StatCard label="Loans this month" value={data?.loansThisMonth ?? '—'} icon={TrendingUp} />
            <StatCard label="Overdue loans" value={data?.totalOverdueLoans ?? '—'} icon={AlertTriangle} tone="danger" />
            <StatCard label="Leads converted (mo.)" value={data?.leadsConvertedThisMonth ?? '—'} icon={TrendingUp} tone="success" />
            <StatCard label="Open complaints" value={data?.openComplaints ?? '—'} icon={MessageCircleWarning} tone="warning" />
          </div>
        )}
    </div>
  );
}

function RevenueSection({ mode }) {
  const { hasPermission } = useAuth();
  const enabled = hasPermission('view_revenue');
  const { data, isLoading } = useRevenueReport({}, enabled);
  if (!enabled) return null;

  const chartData = data ? [
    { name: 'Interest', value: data.totalInterestCollected },
    { name: 'Admin Cost', value: data.totalAdminCostCollected },
    { name: 'Penalty', value: data.totalPenaltyCollected },
  ] : [];

  return (
    <Card className="p-4">
      <SectionHeader title="Revenue" action={<Link to="/reports" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">Full report <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : mode === 'chart' ? (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'value', name: 'Amount (₦)', color: '#22c55e' }]} height={200} />
          </Suspense>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total revenue" value={data ? formatNaira(data.totalRevenue) : '—'} icon={Banknote} tone="success" />
            <StatCard label="Loans repaid" value={data?.totalLoansRepaid ?? '—'} icon={TrendingUp} tone="success" />
          </div>
        )}
    </Card>
  );
}

function NPLSection({ mode }) {
  const { hasPermission } = useAuth();
  const enabled = hasPermission('view_npl_default_reports');
  const { data, isLoading } = useNPLReport(enabled);
  if (!enabled) return null;

  const chartData = data ? [
    { name: 'Overdue Loans', value: data.totalOverdueLoans },
    { name: 'Overdue Amount (₦k)', value: Math.round((data.totalOverdueAmount || 0) / 1000) },
  ] : [];

  return (
    <Card className="p-4">
      <SectionHeader title="NPL / Default" action={<Link to="/reports" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">Full report <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : mode === 'chart' ? (
          <Suspense fallback={<ChartFallback />}>
            <SimpleBarChart data={chartData} xKey="name" bars={[{ dataKey: 'value', name: 'Value', color: '#ef4444' }]} height={200} />
          </Suspense>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Overdue loans" value={data?.totalOverdueLoans ?? '—'} icon={AlertTriangle} tone="danger" />
            <StatCard label="Overdue amount" value={data ? formatNaira(data.totalOverdueAmount) : '—'} icon={Banknote} tone="danger" />
          </div>
        )}
    </Card>
  );
}

function RecentActivitySection() {
  const { hasPermission } = useAuth();
  const enabled = hasPermission('view_audit_logs');
  const { data, isLoading } = useAuditLogs({}, 1, enabled);
  if (!enabled) return null;

  const recent = (data || []).slice(0, 5);
  return (
    <Card className="p-4">
      <SectionHeader title="Recent Activity" action={<Link to="/audit" className="flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>} />
      {isLoading ? <div className="flex justify-center py-6"><Spinner /></div>
        : recent.length === 0 ? <p className="text-sm text-ink-500">No activity recorded yet.</p>
        : (
          <div className="flex flex-col divide-y divide-ink-50">
            {recent.map((log, i) => (
              <div key={`${log.adminID}-${log.createdAt}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge tone={ACTION_TONES[log.action] || 'neutral'}>{log.action}</Badge>
                  <span className="text-ink-700">{log.description}</span>
                </div>
                <span className="shrink-0 text-xs text-ink-400">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
    </Card>
  );
}

export default function DashboardHome() {
  const { session, hasPermission } = useAuth();
  const [mode, setMode] = useViewMode('chart');

  // Executive tier — broad, company-level visibility. Someone at this
  // level gets the aggregate Company/Revenue/NPL view *and* full visibility
  // into every team's performance — not personal-workload widgets, which
  // don't apply at this level.
  const isExecutive = hasPermission('view_all_staff_reports') || hasPermission('view_company_wide_kpis');

  // Team cards: visible to a Team Lead for their own specific team, AND to
  // an executive (via the broad view_all_staff_reports) for every team —
  // no !isExecutive exclusion here anymore, both tiers can see these.
  const showTelemarketerTeam = hasPermission('view_telemarketer_kpi') || hasPermission('view_telemarketer_team_reports') || hasPermission('view_all_staff_reports');
  const showCollectionTeam = hasPermission('view_collection_officer_kpi') || hasPermission('view_collection_officer_team_reports') || hasPermission('view_all_staff_reports');
  const showCustomerCareTeam = hasPermission('view_customer_care_kpi') || hasPermission('view_customer_care_team_reports') || hasPermission('view_all_staff_reports');
  const showAnyTeamCard = showTelemarketerTeam || showCollectionTeam || showCustomerCareTeam;

  // Personal widgets (My Workload / My KPI) are for individual contributors
  // and Team Leads only — explicitly excluded for executives.
  const showPersonalWidgets = !isExecutive && (hasPermission('view_assigned_leads') || hasPermission('view_assigned_collection_cases') || hasPermission('view_assigned_complaints') || hasPermission('view_own_kpi'));

  const hasExecutiveWidget = isExecutive && (hasPermission('view_company_wide_kpis') || hasPermission('view_revenue') || hasPermission('view_npl_default_reports'));

  const hasAnyWidget = showPersonalWidgets || showAnyTeamCard || hasExecutiveWidget || hasPermission('view_audit_logs');

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Welcome, {session?.fullName?.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-ink-500">Signed in as {session?.roleName}.</p>
        </div>
        {hasAnyWidget && <ViewModeToggle mode={mode} onChange={setMode} />}
      </div>

      {!hasAnyWidget ? (
        <Card className="mt-4 p-4">
          <p className="text-sm text-ink-500">Use the sidebar to get started — your role doesn't have any dashboard widgets configured yet.</p>
        </Card>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {!isExecutive && <MyWorkloadSection mode={mode} />}

          {!isExecutive && (hasPermission('view_own_kpi') || showAnyTeamCard) && (
            <div className="grid gap-5 lg:grid-cols-2">
              <MyKpiSection mode={mode} />
              <RecentActivitySection />
            </div>
          )}

          {isExecutive && <CompanySnapshotSection mode={mode} />}

          {showAnyTeamCard && (
            <div className="grid gap-5 lg:grid-cols-2">
              <TelemarketerTeamSection mode={mode} visible={showTelemarketerTeam} />
              <CollectionTeamSection mode={mode} visible={showCollectionTeam} />
              <CustomerCareTeamSection mode={mode} visible={showCustomerCareTeam} />
            </div>
          )}

          {isExecutive && (
            <div className="grid gap-5 lg:grid-cols-2">
              <RevenueSection mode={mode} />
              <NPLSection mode={mode} />
            </div>
          )}

          {isExecutive && <RecentActivitySection />}

          {!isExecutive && !showAnyTeamCard && !hasPermission('view_own_kpi') && <RecentActivitySection />}
        </div>
      )}
    </div>
  );
}
