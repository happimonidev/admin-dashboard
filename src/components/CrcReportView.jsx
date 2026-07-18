import { Info } from 'lucide-react';
import Badge from './ui/Badge';
import DataTable from './DataTable';
import { getAssetClassificationMeta } from '../lib/status';

// Treats '' the same as null/undefined — the backend normalizer defaults
// most scalar CRC fields to '' rather than null, so checking only for
// null/undefined (e.g. via `??`) silently misses "field wasn't returned"
// and can misrender it as a real zero value.
const hasValue = (v) => v !== null && v !== undefined && v !== '';

// CRC amount fields arrive as pre-formatted, space-padded strings from the
// provider (e.g. "                    5,000"), already comma-grouped —
// never numeric, so we trim rather than run them through formatNaira.
const cleanAmount = (value, currency) => {
  if (!hasValue(value)) return '—';
  const trimmed = String(value).trim();
  if (trimmed === '') return '—';
  return currency ? `${currency} ${trimmed}` : trimmed;
};

// Generic, field-name-driven risk coloring — not fabricated thresholds.
// Indicators about overdue days/facilities, suits filed, or dishonoured
// cheques are risk signals where >0 is worth flagging; everything else is
// shown plainly rather than guessing at a business threshold.
// Missing data (no value at all) is kept neutral — it must never be
// colored "success", since "unknown" and "confirmed zero" are different.
const riskIndicatorTone = (indicatorType, value) => {
  const isRiskField = /OVERDUE|SUIT|DISHONOUR/i.test(indicatorType || '');
  if (!isRiskField || !hasValue(value)) return 'neutral';
  const num = Number(value);
  if (Number.isNaN(num)) return 'neutral';
  return num > 0 ? 'danger' : 'success';
};

function Section({ title, children }) {
  return (
    <div className="border-t border-ink-100 pt-4 first:border-0 first:pt-0">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function CrcReportView({ crcResult }) {
  if (!crcResult || typeof crcResult !== 'object') {
    return <p className="text-sm text-ink-500">No CRC report data available.</p>;
  }

  // Read with `|| fallback` rather than destructuring defaults — the
  // no-hit scenario explicitly sets identity: null, and destructuring
  // defaults only kick in for undefined, not null. `||` catches both.
  const scenario = crcResult.scenario;
  const message = crcResult.message || null;
  const identity = crcResult.identity || {};
  const ids = crcResult.ids || [];
  const bvnDetails = crcResult.bvnDetails || null;
  const loanHistory = crcResult.loanHistory || [];
  const performanceSummary = crcResult.performanceSummary || [];
  const creditOverview = crcResult.creditOverview || [];
  const inquiryHistory = crcResult.inquiryHistory || [];
  const addressHistory = crcResult.addressHistory || [];
  const classificationByInstitution = crcResult.classificationByInstitution || [];
  const classificationByProduct = crcResult.classificationByProduct || [];

  const hasIdentity = hasValue(identity.name);

  return (
    <div className="flex flex-col gap-5">
      {/* ── No-hit / informational message — the primary thing to
          communicate when there's no identity to show ── */}
      {message && !hasIdentity && (
        <div className="flex items-start gap-3 rounded-card bg-dodger-50 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-dodger-500" />
          <div>
            <p className="text-sm font-medium text-ink-900">
              No credit bureau match
            </p>
            <p className="mt-0.5 text-sm text-ink-500">{message}</p>
          </div>
        </div>
      )}

      {/* ── Identity header — the most important context, shown first ── */}
      {hasIdentity && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-card bg-dodger-50 p-4">
          <div>
            <p className="text-base font-semibold text-ink-900">
              {identity.name}
            </p>
            <p className="mt-0.5 text-sm text-ink-500">
              {[identity.gender, identity.dateOfBirth, identity.nationality]
                .filter(hasValue)
                .join(' · ')}
            </p>
            {hasValue(identity.address) && (
              <p className="mt-1 text-xs text-ink-400">{identity.address}</p>
            )}
          </div>
          {hasValue(scenario) && (
            <Badge tone="info" className="shrink-0">
              Scenario: {scenario}
            </Badge>
          )}
        </div>
      )}

      {/* ── Risk snapshot — the part that should jump out first ── */}
      {creditOverview.length > 0 && (
        <Section title="Risk snapshot">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {creditOverview.map((item, i) => {
              const tone = riskIndicatorTone(item.indicatorType, item.value);
              return (
                <div
                  key={i}
                  className={`rounded-control p-3 ${
                    tone === 'danger'
                      ? 'bg-danger-50'
                      : tone === 'success'
                      ? 'bg-success-50'
                      : 'bg-ink-50'
                  }`}
                >
                  <p
                    className={`text-lg font-semibold ${
                      tone === 'danger'
                        ? 'text-danger-700'
                        : tone === 'success'
                        ? 'text-success-700'
                        : 'text-ink-900'
                    }`}
                  >
                    {hasValue(item.value) ? item.value : '—'}
                  </p>
                  <p className="mt-0.5 text-xs leading-tight text-ink-500">
                    {item.indicator}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── BVN details ── */}
      {bvnDetails && (
        <Section title="BVN details">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            {hasValue(bvnDetails.institutionName) && (
              <div><span className="text-ink-400">Institution: </span><span className="text-ink-900">{bvnDetails.institutionName}</span></div>
            )}
            {hasValue(bvnDetails.searchConfidenceScore) && (
              <div><span className="text-ink-400">Confidence: </span><span className="text-ink-900">{bvnDetails.searchConfidenceScore}</span></div>
            )}
            {hasValue(bvnDetails.reportOrderDate) && (
              <div><span className="text-ink-400">Report date: </span><span className="text-ink-900">{bvnDetails.reportOrderDate}</span></div>
            )}
          </div>
        </Section>
      )}

      {/* ── Loan history — classification is the key signal, badge-coded ── */}
      {loanHistory.length > 0 && (
        <Section title={`Loan history (${loanHistory.length})`}>
          <DataTable
            getRowId={(row) => row.accountNumber || row._id}
            data={loanHistory.map((row, i) => ({ ...row, _id: i }))}
            pageSize={10}
            columns={[
              { key: 'institutionName', header: 'Institution' },
              { key: 'loanType', header: 'Type', hideOnMobile: true },
              {
                key: 'assetClassification',
                header: 'Classification',
                render: (row) => {
                  if (!hasValue(row.assetClassification)) return '—';
                  const meta = getAssetClassificationMeta(row.assetClassification);
                  return <Badge tone={meta.tone}>{meta.label}</Badge>;
                },
              },
              {
                key: 'currentBalance',
                header: 'Balance',
                className: 'font-mono text-xs',
                render: (row) => cleanAmount(row.currentBalance, row.currency),
              },
              {
                key: 'amountOverdue',
                header: 'Overdue',
                className: 'font-mono text-xs',
                render: (row) => {
                  const amt = Number(String(row.amountOverdue || '').replace(/,/g, '').trim());
                  const overdue = hasValue(row.amountOverdue) && !Number.isNaN(amt) && amt > 0;
                  return (
                    <span className={overdue ? 'font-semibold text-danger-700' : ''}>
                      {cleanAmount(row.amountOverdue, row.currency)}
                    </span>
                  );
                },
              },
              {
                key: 'daysInArrears',
                header: 'Days in arrears',
                hideOnMobile: true,
                render: (row) => (hasValue(row.daysInArrears) ? row.daysInArrears : '—'),
              },
            ]}
          />
        </Section>
      )}

      {/* ── Performance summary by institution ── */}
      {performanceSummary.length > 0 && (
        <Section title={`Performance summary (${performanceSummary.length})`}>
          <DataTable
            getRowId={(row) => row.institutionName + row._id}
            data={performanceSummary.map((row, i) => ({ ...row, _id: i }))}
            pageSize={10}
            columns={[
              { key: 'institutionName', header: 'Institution' },
              {
                key: 'facilitiesCount',
                header: 'Facilities',
                hideOnMobile: true,
                render: (row) => (hasValue(row.facilitiesCount) ? row.facilitiesCount : '—'),
              },
              {
                key: 'approvedAmount',
                header: 'Approved',
                className: 'font-mono text-xs',
                render: (row) => (hasValue(row.approvedAmount) ? row.approvedAmount : '—'),
              },
              {
                key: 'nonPerformingFacility',
                header: 'Non-performing',
                render: (row) => {
                  if (!hasValue(row.nonPerformingFacility)) {
                    return <Badge tone="neutral">—</Badge>;
                  }
                  const count = Number(row.nonPerformingFacility);
                  const tone = !Number.isNaN(count) && count > 0 ? 'danger' : 'success';
                  return <Badge tone={tone}>{row.nonPerformingFacility}</Badge>;
                },
              },
            ]}
          />
        </Section>
      )}

      {/* ── Classification breakdowns ── */}
      {classificationByInstitution.length > 0 && (
        <Section title="Classification by institution type">
          <DataTable
            getRowId={(row) => row.institutionType + row._id}
            data={classificationByInstitution.map((row, i) => ({ ...row, _id: i }))}
            pageSize={10}
            columns={[
              { key: 'institutionType', header: 'Institution type' },
              {
                key: 'noOfAccounts',
                header: 'Accounts',
                render: (row) => (hasValue(row.noOfAccounts) ? row.noOfAccounts : '—'),
              },
              {
                key: 'outstandingBalance',
                header: 'Outstanding',
                render: (row) => cleanAmount(row.outstandingBalance, row.currency),
              },
              {
                key: 'amountOverdue',
                header: 'Overdue',
                render: (row) => cleanAmount(row.amountOverdue, row.currency),
              },
              {
                key: 'legalFlag',
                header: 'Legal flag',
                render: (row) => {
                  if (!hasValue(row.legalFlag)) return <Badge tone="neutral">—</Badge>;
                  const isYes = String(row.legalFlag).toLowerCase() === 'yes';
                  return <Badge tone={isYes ? 'danger' : 'success'}>{row.legalFlag}</Badge>;
                },
              },
            ]}
          />
        </Section>
      )}

      {classificationByProduct.length > 0 && (
        <Section title="Classification by product type">
          <DataTable
            getRowId={(row) => row.productType + row._id}
            data={classificationByProduct.map((row, i) => ({ ...row, _id: i }))}
            pageSize={10}
            columns={[
              { key: 'productType', header: 'Product type' },
              {
                key: 'noOfAccounts',
                header: 'Accounts',
                render: (row) => (hasValue(row.noOfAccounts) ? row.noOfAccounts : '—'),
              },
              {
                key: 'totalOutstandingBalance',
                header: 'Outstanding',
                render: (row) => cleanAmount(row.totalOutstandingBalance, row.currency),
              },
              {
                key: 'amountOverdue',
                header: 'Overdue',
                render: (row) => cleanAmount(row.amountOverdue, row.currency),
              },
              {
                key: 'recentOverdueDate',
                header: 'Recent overdue date',
                render: (row) => (hasValue(row.recentOverdueDate) ? row.recentOverdueDate : '—'),
              },
            ]}
          />
        </Section>
      )}

      {/* ── Inquiry history ── */}
      {inquiryHistory.length > 0 && (
        <Section title={`Inquiry history (${inquiryHistory.length})`}>
          <DataTable
            getRowId={(row) => row.institutionName + row._id}
            data={inquiryHistory.map((row, i) => ({ ...row, _id: i }))}
            pageSize={5}
            columns={[
              { key: 'institutionName', header: 'Institution' },
              { key: 'institutionType', header: 'Type', hideOnMobile: true },
              { key: 'facilityType', header: 'Facility' },
              { key: 'inquiryDate', header: 'Date' },
            ]}
          />
        </Section>
      )}

      {/* ── IDs on file ── */}
      {ids.length > 0 && (
        <Section title={`IDs on file (${ids.length})`}>
          <DataTable
            getRowId={(row) => row.identifierNumber + row._id}
            data={ids.map((row, i) => ({ ...row, _id: i }))}
            pageSize={10}
            columns={[
              { key: 'idType', header: 'ID type' },
              { key: 'identifierNumber', header: 'Number', className: 'font-mono text-xs' },
              { key: 'expiryDate', header: 'Expiry', render: (row) => (hasValue(row.expiryDate) ? row.expiryDate : '—') },
            ]}
          />
        </Section>
      )}

      {/* ── Address history — lowest priority, kept compact & paginated ── */}
      {addressHistory.length > 0 && (
        <Section title={`Address history (${addressHistory.length})`}>
          <DataTable
            getRowId={(row) => row._id}
            data={addressHistory.map((row, i) => ({ ...row, _id: i }))}
            pageSize={5}
            columns={[
              { key: 'addressType', header: 'Type', render: (row) => (hasValue(row.addressType) ? row.addressType : '—') },
              { key: 'address', header: 'Address' },
              { key: 'dateReported', header: 'Reported' },
            ]}
          />
        </Section>
      )}
    </div>
  );
}
