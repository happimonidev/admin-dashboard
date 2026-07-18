import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useOwnKPI, useTeamKPI, useKpiMetrics, useSetTarget, useUpdateTarget, useKpiHistory, useKpiRecords } from '../../hooks/useKpi';
import { useAssignableAdmins } from '../../hooks/useAdminUsers';
import { useServerPagination, DEFAULT_PAGE_SIZE } from '../../hooks/useServerPagination';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import * as kpiApi from '../../api/kpi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/DataTable';
import PaginationControls from '../../components/PaginationControls';
import SearchInput from '../../components/SearchInput';
import { formatDate, formatDateTime } from '../../lib/format';
import { rowsToCsv, combineCsvSections, downloadCsv } from '../../lib/csv';
import { AlertCircle, TrendingUp, Download } from 'lucide-react';

const SimpleLineChart = lazy(() => import('../../components/charts/SimpleLineChart'));
const ChartFallback = () => <div className="flex h-[180px] items-center justify-center"><Spinner /></div>;

const ROLE_FUNCTIONS = [
  { value: 'telemarketer', label: 'Telemarketer' },
  { value: 'collection_officer', label: 'Collection Officer' },
  { value: 'customer_care', label: 'Customer Care' },
  { value: 'junior_operations', label: 'Junior Operations' },
];

const PERIODS = ['daily', 'weekly', 'monthly'];

// Human-readable label from the raw metric key — the KPI response only
// returns the key (e.g. 'amount_recovered'), never a display label.
const humanizeMetricKey = (key) =>
  (key || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function KpiResultCard({ result }) {
  const label = humanizeMetricKey(result.metric);
  const isManualPending =
    result.type === 'manual' && (result.value === null || result.value === undefined);

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink-900">{label}</p>
          {isManualPending ? (
            <p className="mt-1 text-sm text-ink-400">Not yet submitted</p>
          ) : (
            <p className="mt-1 text-xl font-semibold text-ink-900">
              {result.value}
              {result.targetValue !== undefined && (
                <span className="ml-1 text-sm font-normal text-ink-400">/ {result.targetValue}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {result.isOverridden && <Badge tone="warning">Overridden</Badge>}
          {result.type && <Badge tone="neutral">{result.type}</Badge>}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-ink-400">
        {[result.period, result.periodStart ? formatDate(result.periodStart) : null]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {result.overrideReason && (
        <p className="mt-1 text-xs text-ink-400">Override note: {result.overrideReason}</p>
      )}
      {result.warning && <p className="mt-1 text-xs text-warning-700">{result.warning}</p>}
    </Card>
  );
}

function KpiResultsList({ results, emptyDescription }) {
  if (!results || results.length === 0) {
    return <EmptyState title="No KPI data yet" description={emptyDescription} />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((r, i) => (
        <KpiResultCard key={`${r.metric}-${r.period}-${i}`} result={r} />
      ))}
    </div>
  );
}

// Compact single-line variant — used on Team KPI, where many staff × many
// metrics made the full cards too large to scan quickly.
function KpiResultRow({ result }) {
  const label = humanizeMetricKey(result.metric);
  const isManualPending =
    result.type === 'manual' && (result.value === null || result.value === undefined);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-ink-50 py-2 text-sm last:border-0">
      <span className="text-ink-700">{label}</span>
      <div className="flex items-center gap-2">
        {isManualPending ? (
          <span className="text-xs text-ink-400">Not yet submitted</span>
        ) : (
          <span className="font-medium text-ink-900">
            {result.value}
            {result.targetValue !== undefined && (
              <span className="font-normal text-ink-400"> / {result.targetValue}</span>
            )}
          </span>
        )}
        <span className="text-xs text-ink-400">{result.period}</span>
        {result.targetCreatedAt && (
          <span className="text-xs text-ink-400">· set {formatDate(result.targetCreatedAt)}</span>
        )}
        {result.isOverridden && <Badge tone="warning">Overridden</Badge>}
      </div>
    </div>
  );
}

function KpiResultRows({ results, emptyDescription }) {
  if (!results || results.length === 0) {
    return <p className="text-sm text-ink-500">{emptyDescription || 'No KPI data yet.'}</p>;
  }
  return (
    <div className="flex flex-col">
      {results.map((r, i) => (
        <KpiResultRow key={`${r.metric}-${r.period}-${i}`} result={r} />
      ))}
    </div>
  );
}

// Shared trend chart — used for both individual (My KPI) and team-aggregate
// (Team KPI) history. History only started accumulating from whenever the
// twice-daily snapshot job went live — there's no backfill — so this
// always renders whatever's actually available rather than assuming a
// full window exists.
function KpiTrendChart({ adminID, roleID, metric, period, aggregate }) {
  const params = useMemo(
    () => ({ ...(adminID ? { adminID } : { roleID }), metric, period, limit: 6 }),
    [adminID, roleID, metric, period]
  );
  const { data, isLoading, error } = useKpiHistory(params, !!metric && !!period);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (!aggregate) {
      return [...data]
        .sort((a, b) => new Date(a.periodStart) - new Date(b.periodStart))
        .map((r) => ({ label: formatDate(r.periodStart), Value: typeof r.value === 'number' ? r.value : null }));
    }
    // Team history returns every admin's raw records mixed together, not
    // pre-summed — aggregate by period here for a team-total trend line.
    const byDate = {};
    data.forEach((r) => {
      if (typeof r.value !== 'number') return;
      const key = r.periodStart;
      if (!byDate[key]) byDate[key] = { date: key, Value: 0 };
      byDate[key].Value += r.value;
    });
    return Object.values(byDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((d) => ({ label: formatDate(d.date), Value: d.Value }));
  }, [data, aggregate]);

  if (isLoading) return <ChartFallback />;
  if (error) return <p className="text-sm text-danger-500">{error.message}</p>;
  if (chartData.length === 0) {
    return <p className="text-sm text-ink-500">No historical data yet — snapshots accumulate automatically as each period closes.</p>;
  }
  if (chartData.length === 1) {
    return (
      <>
        <p className="mb-2 text-xs text-ink-400">Only one period of history so far — the trend will build up over time.</p>
        <Suspense fallback={<ChartFallback />}>
          <SimpleLineChart data={chartData} xKey="label" lines={[{ dataKey: 'Value', name: 'Value', color: '#2593f4' }]} />
        </Suspense>
      </>
    );
  }
  return (
    <Suspense fallback={<ChartFallback />}>
      <SimpleLineChart data={chartData} xKey="label" lines={[{ dataKey: 'Value', name: 'Value', color: '#2593f4' }]} />
    </Suspense>
  );
}

function MyKpiTab() {
  const { session } = useAuth();
  const { data, isLoading, error } = useOwnKPI();
  const [expandedMetric, setExpandedMetric] = useState(null); // `${metric}-${period}` or null

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <EmptyState icon={AlertCircle} title="Couldn't load KPI data" description={error.message} />;

  const results = data?.results || [];

  if (results.length === 0) {
    return <KpiResultsList results={results} emptyDescription="No KPI targets have been set for you yet." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((r, i) => {
        const key = `${r.metric}-${r.period}`;
        const isExpanded = expandedMetric === key;
        return (
          <div key={`${key}-${i}`}>
            <KpiResultCard result={r} />
            <button
              type="button"
              onClick={() => setExpandedMetric(isExpanded ? null : key)}
              className="mt-1 flex items-center gap-1 text-xs font-medium text-dodger-600 hover:underline"
            >
              <TrendingUp className="h-3 w-3" />
              {isExpanded ? 'Hide trend' : 'View trend'}
            </button>
            {isExpanded && (
              <Card className="mt-2 p-3">
                <KpiTrendChart adminID={session?.adminID} metric={r.metric} period={r.period} />
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Aggregates a per-metric total across everyone currently shown, skipping
// non-numeric values (e.g. manual metrics not yet submitted).
function computeMetricTotals(resultsByAdmin) {
  const totals = {};
  Object.values(resultsByAdmin).flat().forEach((r) => {
    if (!totals[r.metric]) totals[r.metric] = { sum: 0, hasValue: false };
    if (typeof r.value === 'number') {
      totals[r.metric].sum += r.value;
      totals[r.metric].hasValue = true;
    }
  });
  return totals;
}

function TeamKpiTab() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission('export_data');
  const [roleFunction, setRoleFunction] = useState('');

  // Team Leads (the primary audience here) don't hold view_roles, so the
  // team's roleID can't come from a roles-list dropdown. Instead, derive it
  // from the assignable-admins list they DO have access to via their
  // reassign_* permission — everyone returned for a given roleFunction
  // shares the same underlying roleID, so the first admin's roleID works.
  const { data: admins, isLoading: adminsLoading } = useAssignableAdmins(roleFunction, !!roleFunction);
  const roleID = admins?.[0]?.roleID;
  const nameByID = useMemo(() => {
    const map = {};
    (admins || []).forEach((a) => { map[a.adminID] = a.fullName; });
    return map;
  }, [admins]);

  const { data, isLoading, error } = useTeamKPI(roleID, !!roleID);
  const resultsByAdmin = data?.results || {};
  const targets = data?.targets || [];
  const adminIDs = Object.keys(resultsByAdmin);
  const metricTotals = useMemo(() => computeMetricTotals(resultsByAdmin), [resultsByAdmin]);

  // Distinct metric+period combinations across the whole team, for the
  // trend picker — a team could have staff on different periods for the
  // same metric, so these are tracked as separate options.
  const trendOptions = useMemo(() => {
    const seen = new Map();
    Object.values(resultsByAdmin).flat().forEach((r) => {
      const key = `${r.metric}-${r.period}`;
      if (!seen.has(key)) seen.set(key, { key, metric: r.metric, period: r.period });
    });
    return Array.from(seen.values());
  }, [resultsByAdmin]);
  const [selectedTrendKey, setSelectedTrendKey] = useState('');
  const selectedTrend = trendOptions.find((o) => o.key === selectedTrendKey) || trendOptions[0];

  // Each result only carries periodStart/periodEnd (the metric's evaluation
  // window), not when the target itself was set — that lives on the target
  // record. Cross-reference by adminID + period + metric membership.
  const enrichWithTargetDate = (results, adminID) =>
    (results || []).map((r) => {
      const matchingTarget = targets.find(
        (t) => t.adminID === adminID && t.period === r.period && t.metrics.includes(r.metric)
      );
      return { ...r, targetCreatedAt: matchingTarget?.createdAt };
    });

  const handleExport = () => {
    const totalsRows = Object.entries(metricTotals).map(([metric, { sum, hasValue }]) => ({
      metric,
      value: hasValue ? sum : '',
    }));
    const totalsColumns = [
      { header: 'Metric', accessor: (r) => humanizeMetricKey(r.metric) },
      { header: 'Team Total', accessor: (r) => r.value },
    ];

    const perPersonRows = adminIDs.flatMap((adminID) =>
      (resultsByAdmin[adminID] || []).map((r) => ({ ...r, staffName: nameByID[adminID] || adminID }))
    );
    const perPersonColumns = [
      { header: 'Staff Member', accessor: (r) => r.staffName },
      { header: 'Metric', accessor: (r) => humanizeMetricKey(r.metric) },
      { header: 'Value', accessor: (r) => (r.value === null || r.value === undefined ? '' : r.value) },
      { header: 'Target', accessor: (r) => (r.targetValue === undefined ? '' : r.targetValue) },
      { header: 'Period', accessor: (r) => r.period },
      { header: 'Overridden', accessor: (r) => (r.isOverridden ? 'Yes' : 'No') },
    ];

    const csv = combineCsvSections([
      { title: 'Team Totals', rows: totalsRows, columns: totalsColumns },
      { title: 'Per-Person Results', rows: perPersonRows, columns: perPersonColumns },
    ]);
    downloadCsv(`team-kpi-${roleFunction}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm font-medium text-ink-700">
          Team
          <select
            value={roleFunction}
            onChange={(e) => setRoleFunction(e.target.value)}
            className="mt-1 block w-full max-w-xs rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
          >
            <option value="">Select a team…</option>
            {ROLE_FUNCTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        {canExport && adminIDs.length > 0 && (
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {!roleFunction ? (
        <p className="text-sm text-ink-500">Pick a team above to view its KPI results.</p>
      ) : adminsLoading || isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : error ? (
        <EmptyState icon={AlertCircle} title="Couldn't load KPI data" description={error.message} />
      ) : !admins || admins.length === 0 ? (
        <EmptyState title="No staff found" description="No active staff members were found for this team." />
      ) : adminIDs.length === 0 ? (
        <EmptyState title="No KPI data yet" description="No KPI targets have been set for anyone in this team." />
      ) : (
        <>
          {Object.keys(metricTotals).length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {Object.entries(metricTotals).map(([metric, { sum, hasValue }]) => (
                <div key={metric} className="rounded-control bg-dodger-50 p-3">
                  <p className="text-lg font-semibold text-dodger-700">{hasValue ? sum : '—'}</p>
                  <p className="mt-0.5 text-xs text-ink-500">Team total · {humanizeMetricKey(metric)}</p>
                </div>
              ))}
            </div>
          )}

          {trendOptions.length > 0 && (
            <Card className="mb-5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Team Trend</p>
              <label className="mb-3 block max-w-xs text-sm font-medium text-ink-700">
                Metric
                <select
                  value={selectedTrend?.key || ''}
                  onChange={(e) => setSelectedTrendKey(e.target.value)}
                  className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
                >
                  {trendOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>{humanizeMetricKey(opt.metric)} ({opt.period})</option>
                  ))}
                </select>
              </label>
              {selectedTrend && (
                <KpiTrendChart roleID={roleID} metric={selectedTrend.metric} period={selectedTrend.period} aggregate />
              )}
            </Card>
          )}

          <div className="flex flex-col gap-5">
            {adminIDs.map((adminID) => (
              <Card key={adminID} className="p-4">
                <p className="mb-2 text-sm font-semibold text-ink-900">
                  {nameByID[adminID] || adminID}
                </p>
                <KpiResultRows results={enrichWithTargetDate(resultsByAdmin[adminID], adminID)} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EditTargetModal({ open, onClose, target }) {
  const [targetValue, setTargetValue] = useState(target?.targetValue ?? '');
  const [period, setPeriod] = useState(target?.period || 'monthly');
  const mutation = useUpdateTarget();

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        targetID: target.targetID,
        targetValue: Number(targetValue),
        period,
      });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Edit target">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="mb-3 text-xs text-ink-400">
        Metrics: {target?.metrics?.map(humanizeMetricKey).join(', ')} — metrics can't be
        changed here; create a new target if different metrics are needed.
      </p>
      <label className="block text-sm font-medium text-ink-700">
        Target value
        <input
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-ink-700">
        Period
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={targetValue === '' || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}

function ManageTargetsTab() {
  const [roleFunction, setRoleFunction] = useState('');
  const [selectedAdminIDs, setSelectedAdminIDs] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [targetValue, setTargetValue] = useState('');
  const [submitSummary, setSubmitSummary] = useState(null); // { succeeded: [], failed: [] }
  const [editingTarget, setEditingTarget] = useState(null);

  const { data: admins, isLoading: adminsLoading } = useAssignableAdmins(roleFunction, !!roleFunction);
  const { data: metrics, isLoading: metricsLoading } = useKpiMetrics(roleFunction, !!roleFunction);
  const setTargetMutation = useSetTarget();

  // Existing targets for this team, so admins can see who already has one
  // before setting a new one — reuses the same team-KPI endpoint as the
  // Team KPI tab (everyone who can reach this tab also holds view_all_kpi,
  // confirmed against the seed roles that carry set_*_targets).
  const roleID = admins?.[0]?.roleID;
  const { data: teamKpiData } = useTeamKPI(roleID, !!roleID);
  const adminIDsWithTargets = useMemo(() => {
    const ids = new Set();
    (teamKpiData?.targets || []).forEach((t) => ids.add(t.adminID));
    return ids;
  }, [teamKpiData]);

  const toggleAdmin = (adminID) => {
    setSelectedAdminIDs((prev) =>
      prev.includes(adminID) ? prev.filter((id) => id !== adminID) : [...prev, adminID]
    );
  };

  const toggleMetric = (key) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    setSubmitSummary(null);
    const succeeded = [];
    const failed = [];

    for (const adminID of selectedAdminIDs) {
      const admin = admins.find((a) => a.adminID === adminID);
      try {
        await setTargetMutation.mutateAsync({
          targetAdminID: adminID,
          targetRoleID: admin?.roleID,
          roleFunction,
          metrics: selectedMetrics,
          period,
          targetValue: Number(targetValue),
        });
        succeeded.push(admin?.fullName || adminID);
      } catch (err) {
        failed.push({ name: admin?.fullName || adminID, message: err.message });
      }
    }

    setSubmitSummary({ succeeded, failed });
    if (failed.length === 0) {
      setSelectedAdminIDs([]);
      setSelectedMetrics([]);
      setTargetValue('');
    }
  };

  return (
    <Card className="max-w-2xl p-4">
      <p className="mb-3 text-sm font-medium text-ink-900">Set a KPI target</p>

      {submitSummary && (
        <div className="mb-3 flex flex-col gap-1.5">
          {submitSummary.succeeded.length > 0 && (
            <div className="rounded-control bg-success-50 px-3 py-2 text-sm text-success-700">
              Target set for: {submitSummary.succeeded.join(', ')}
            </div>
          )}
          {submitSummary.failed.length > 0 && (
            <div className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {submitSummary.failed.map((f) => `${f.name}: ${f.message}`).join(' · ')}
            </div>
          )}
        </div>
      )}

      <label className="block text-sm font-medium text-ink-700">
        Team
        <select
          value={roleFunction}
          onChange={(e) => { setRoleFunction(e.target.value); setSelectedAdminIDs([]); setSelectedMetrics([]); }}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        >
          <option value="">Select a team…</option>
          {ROLE_FUNCTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </label>

      {roleFunction && (
        <>
          <div className="mt-3">
            <p className="block text-sm font-medium text-ink-700">
              Staff members (select one or more)
            </p>
            {adminsLoading ? (
              <div className="mt-1 flex justify-center py-2"><Spinner /></div>
            ) : !admins || admins.length === 0 ? (
              <p className="mt-1 text-sm text-ink-500">No staff found for this team.</p>
            ) : (
              <div className="mt-1 flex max-h-48 flex-col gap-1 overflow-y-auto">
                {admins.map((a) => (
                  <label key={a.adminID} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={selectedAdminIDs.includes(a.adminID)}
                      onChange={() => toggleAdmin(a.adminID)}
                    />
                    {a.fullName}
                    {adminIDsWithTargets.has(a.adminID) && (
                      <Badge tone="info">Already has a target</Badge>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {selectedAdminIDs.some((id) => adminIDsWithTargets.has(id)) && (
            <div className="mt-3 flex flex-col gap-2">
              {selectedAdminIDs
                .filter((id) => adminIDsWithTargets.has(id))
                .map((adminID) => {
                  const admin = admins?.find((a) => a.adminID === adminID);
                  const existingTargets = (teamKpiData?.targets || []).filter((t) => t.adminID === adminID);
                  return (
                    <div key={adminID} className="rounded-control bg-dodger-50 px-3 py-2 text-xs text-ink-700">
                      <p className="font-medium text-ink-900">
                        {admin?.fullName} already has {existingTargets.length === 1 ? 'a target' : `${existingTargets.length} targets`}:
                      </p>
                      {existingTargets.map((t) => (
                        <div key={t.targetID} className="mt-1 flex items-center justify-between gap-2">
                          <span>{t.metrics.map(humanizeMetricKey).join(', ')} — target {t.targetValue} per {t.period}</span>
                          <button
                            type="button"
                            onClick={() => setEditingTarget(t)}
                            className="shrink-0 font-medium text-dodger-600 hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                      <p className="mt-1.5 text-ink-500">
                        Selecting metrics and saving below creates a separate, additional target
                        (metrics can't be added to an existing one) — use "Edit" above to adjust
                        an existing target's value or period instead.
                      </p>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="mt-3">
            <p className="block text-sm font-medium text-ink-700">Metrics</p>
            {metricsLoading ? (
              <div className="mt-1 flex justify-center py-2"><Spinner /></div>
            ) : (
              <div className="mt-1 flex flex-col gap-1">
                {metrics?.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(m.key)}
                      onChange={() => toggleMetric(m.key)}
                    />
                    {m.label || m.key}
                    {m.type && <span className="text-xs text-ink-400">({m.type})</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-ink-700">
              Period
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-ink-700">
              Target value
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={selectedAdminIDs.length === 0 || selectedMetrics.length === 0 || !targetValue || setTargetMutation.isPending}
            >
              {setTargetMutation.isPending
                ? 'Saving…'
                : `Set target for ${selectedAdminIDs.length || ''} ${selectedAdminIDs.length === 1 ? 'person' : 'people'}`.trim()}
            </Button>
          </div>
        </>
      )}

      <EditTargetModal
        key={editingTarget?.targetID || 'none'}
        open={!!editingTarget}
        onClose={() => setEditingTarget(null)}
        target={editingTarget}
      />
    </Card>
  );
}

// New KPI Records tab — browses persisted results directly from
// kpiResultCollection via GET /admin/kpi/records, independent of
// getKPIHistory (used by the trend charts) and getTeamKPI (used by the
// Team KPI tab) — neither of those was touched to build this.
function RecordsTab() {
  const { session, hasPermission } = useAuth();
  const canExport = hasPermission('export_data');
  const [scope, setScope] = useState('mine'); // 'mine' | 'team'
  const [roleFunction, setRoleFunction] = useState('');
  const { data: admins } = useAssignableAdmins(roleFunction, scope === 'team' && !!roleFunction);
  const roleID = admins?.[0]?.roleID;
  const nameByID = useMemo(() => {
    const map = {};
    (admins || []).forEach((a) => { map[a.adminID] = a.fullName; });
    return map;
  }, [admins]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput);
  const { page, setPage, skip, limit } = useServerPagination();

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, roleFunction, from, to, search]);

  const scopeReady = scope === 'mine' ? !!session?.adminID : !!roleID;

  const params = useMemo(() => {
    const p = { skip, limit };
    if (scope === 'mine') p.adminID = session?.adminID;
    else if (roleID) p.roleID = roleID;
    if (from) p.from = from;
    if (to) p.to = to;
    if (search) p.search = search;
    return p;
  }, [scope, roleID, session, from, to, search, skip, limit]);

  const { data: result, isLoading, error } = useKpiRecords(params, scopeReady);
  const records = result?.data;
  const total = result?.total;

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      // Dedicated fetch with export:true, respecting every current filter
      // except pagination — independent of whatever page is on screen.
      const { skip: _skip, limit: _limit, ...filterParams } = params;
      const raw = await kpiApi.getRecords({ ...filterParams, export: true });
      if (!raw.success) throw new Error(raw.message);
      const columns = [
        ...(scope === 'team' ? [{ header: 'Staff Member', accessor: (r) => nameByID[r.adminID] || r.adminID }] : []),
        { header: 'Metric', accessor: (r) => humanizeMetricKey(r.metric) },
        { header: 'Period', accessor: (r) => r.period },
        { header: 'Period Start', accessor: (r) => (r.periodStart ? formatDate(r.periodStart) : '') },
        { header: 'Value', accessor: (r) => (r.value === null || r.value === undefined ? '' : r.value) },
        { header: 'Overridden', accessor: (r) => (r.isOverridden ? 'Yes' : 'No') },
        { header: 'Override Reason', accessor: (r) => r.overrideReason || '' },
      ];
      downloadCsv(`kpi-records-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCsv(raw.data || [], columns));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-card bg-white p-3 shadow-sm ring-1 ring-ink-100">
        <label className="block text-xs font-medium text-ink-700">
          Scope
          <select
            value={scope}
            onChange={(e) => { setScope(e.target.value); setRoleFunction(''); }}
            className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
          >
            <option value="mine">My Records</option>
            <option value="team">Team Records</option>
          </select>
        </label>
        {scope === 'team' && (
          <label className="block text-xs font-medium text-ink-700">
            Team
            <select
              value={roleFunction}
              onChange={(e) => setRoleFunction(e.target.value)}
              className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500"
            >
              <option value="">Select a team…</option>
              {ROLE_FUNCTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-xs font-medium text-ink-700">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500" />
        </label>
        <label className="block text-xs font-medium text-ink-700">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-control border border-ink-200 px-2 py-1.5 text-sm focus:border-dodger-500" />
        </label>
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search by metric or admin ID…" className="w-56" />
        {canExport && (
          <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting || !scopeReady}>
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        )}
      </div>

      {scope === 'team' && !roleFunction ? (
        <p className="text-sm text-ink-500">Pick a team above to view its KPI records.</p>
      ) : (
        <div className="rounded-card bg-white p-4 shadow-sm ring-1 ring-ink-100">
          <DataTable
            data={records || []}
            isLoading={isLoading}
            error={error}
            getRowId={(row) => `${row.adminID}-${row.metric}-${row.periodStart}`}
            emptyTitle="No KPI records found"
            pageSize={DEFAULT_PAGE_SIZE}
            columns={[
              ...(scope === 'team' ? [{ key: 'staff', header: 'Staff', accessor: (row) => nameByID[row.adminID] || row.adminID }] : []),
              { key: 'metric', header: 'Metric', accessor: (row) => humanizeMetricKey(row.metric), sortable: true },
              { key: 'period', header: 'Period' },
              { key: 'periodStart', header: 'Period Start', render: (row) => formatDate(row.periodStart), sortable: true },
              { key: 'value', header: 'Value', render: (row) => (row.value === null || row.value === undefined ? '—' : row.value), sortable: true },
              {
                key: 'isOverridden',
                header: 'Overridden',
                render: (row) => (row.isOverridden ? <Badge tone="warning">Yes</Badge> : <span className="text-ink-400">No</span>),
              },
              { key: 'updatedAt', header: 'Last Updated', render: (row) => formatDateTime(row.updatedAt), hideOnMobile: true },
            ]}
          />
          <PaginationControls page={page} setPage={setPage} total={total} limit={limit} />
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: 'own', label: 'My KPI', permission: 'view_own_kpi' },
  {
    key: 'team',
    label: 'Team KPI',
    anyOf: [
      'view_telemarketer_kpi',
      'view_collection_officer_kpi',
      'view_customer_care_kpi',
      'view_junior_operations_kpi',
      'view_all_kpi',
    ],
  },
  {
    key: 'manage',
    label: 'Manage Targets',
    anyOf: [
      'set_telemarketer_targets',
      'set_collection_officer_targets',
      'set_customer_care_targets',
      'set_junior_operations_targets',
    ],
  },
  {
    key: 'records',
    label: 'Records',
    anyOf: [
      'view_own_kpi',
      'view_telemarketer_kpi',
      'view_collection_officer_kpi',
      'view_customer_care_kpi',
      'view_junior_operations_kpi',
      'view_all_kpi',
    ],
  },
];

export default function KpiPage() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const visibleTabs = TABS.filter((tab) =>
    tab.permission ? hasPermission(tab.permission) : hasAnyPermission(tab.anyOf)
  );
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink-900">KPI</h1>
        <p className="mt-0.5 text-sm text-ink-500">Performance targets and results.</p>
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

      {activeTab === 'own' && <MyKpiTab />}
      {activeTab === 'team' && <TeamKpiTab />}
      {activeTab === 'manage' && <ManageTargetsTab />}
      {activeTab === 'records' && <RecordsTab />}
    </div>
  );
}
