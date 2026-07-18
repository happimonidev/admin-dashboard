// Tone/label mappings for the status enums confirmed directly in the
// backend (validators.js, model files). Not extended with guessed values.

const LEAD_STATUS = {
  not_contacted: { label: 'Not contacted', tone: 'neutral' },
  contacted: { label: 'Contacted', tone: 'info' },
  interested: { label: 'Interested', tone: 'warning' },
  not_interested: { label: 'Not interested', tone: 'neutral' },
  converted: { label: 'Converted', tone: 'success' },
  do_not_call: { label: 'Do not call', tone: 'danger' },
};

// Shared by collection cases and complaints — both use this exact enum
// per validators.js (updateCaseStatus / updateComplaintStatus).
const CASE_STATUS = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

// Confirmed from loan query filters seen across loan.js / collection.js /
// report.js ($match: { status: 'overdue' | 'closed' }, $in: ['pending','disbursed']),
// plus 'rejected' confirmed from rejectLoanByAdmin's $set: { status: 'rejected' }.
const LOAN_STATUS = {
  pending: { label: 'Pending', tone: 'neutral' },
  disbursed: { label: 'Disbursed', tone: 'info' },
  overdue: { label: 'Overdue', tone: 'danger' },
  closed: { label: 'Closed', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
};

const fallback = (value) => ({ label: value || '—', tone: 'neutral' });

export const getLeadStatusMeta = (status) => LEAD_STATUS[status] || fallback(status);
export const getCaseStatusMeta = (status) => CASE_STATUS[status] || fallback(status);
export const getLoanStatusMeta = (status) => LOAN_STATUS[status] || fallback(status);

export const getAdminStatusMeta = (isActive) =>
  isActive
    ? { label: 'Active', tone: 'success' }
    : { label: 'Deactivated', tone: 'danger' };

// Matches the exact CRC bad-debt classification block list from platform
// config (configure_crc_bad_classification_list default:
// substandard, doubtful, lost, nonperforming). Anything in that list is
// flagged danger; "Performing" is the known-good state; anything else
// (unrecognized classification text from the CRC provider) stays neutral
// rather than guessing at severity.
const CRC_BAD_CLASSIFICATIONS = ['substandard', 'doubtful', 'lost', 'nonperforming'];

export const getAssetClassificationMeta = (value) => {
  if (!value) return fallback(value);
  const normalized = String(value).toLowerCase().replace(/[\s-]/g, '');
  if (CRC_BAD_CLASSIFICATIONS.includes(normalized)) {
    return { label: value, tone: 'danger' };
  }
  if (normalized === 'performing') {
    return { label: value, tone: 'success' };
  }
  return { label: value, tone: 'neutral' };
};

// pendingReason/rejectionReason are mostly free text (admin-supplied on
// reject, or a fixed system code on a failed retry) — only humanize the
// specific fixed codes confirmed in the backend, leave anything else as-is
// rather than guessing at other possible codes.
const KNOWN_REASON_LABELS = {
  transfer_failed: 'Bank transfer failed',
  rejected_by_admin: 'Rejected by admin (no reason given)',
};

export const humanizeReasonCode = (value) => {
  if (!value) return null;
  return KNOWN_REASON_LABELS[value] || value;
};
