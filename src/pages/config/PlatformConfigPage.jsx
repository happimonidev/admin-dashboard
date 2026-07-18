import { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useAllConfigs, useUpdateConfig } from '../../hooks/useConfig';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatDateTime } from '../../lib/format';
import { AlertCircle } from 'lucide-react';

// Confirmed exactly against the updated backend service — every config key
// now has an explicit mapping (admin_cost and the three auto_assign_* keys
// were previously unmapped and fell to the broad fallback; the backend has
// since assigned them specific existing permissions rather than adding new
// ones). The fallback below is now only a safety net for any future config
// key added without a corresponding entry here.
const CONFIG_PERMISSION_MAP = {
  interest_rate: 'configure_interest_rate',
  penalty_rate: 'configure_penalty_rate',
  loan_duration_days: 'configure_loan_duration',
  admin_cost: 'configure_interest_rate',
  min_loan_amount: 'configure_min_loan_amount',
  max_loan_amount: 'configure_max_loan_amount',
  loan_limit_increment: 'configure_loan_limit_increment',
  crc_suspension_days: 'configure_crc_suspension_duration',
  otp_expiry_minutes: 'configure_otp_expiry',
  face_match_threshold: 'configure_face_match_threshold',
  crc_bad_classifications: 'configure_crc_bad_classification_list',
  primary_provider: 'configure_primary_provider',
  sms_provider: 'configure_sms_provider',
  bvn_provider: 'configure_bvn_provider',
  crc_provider: 'configure_crc_provider',
  auto_assign_leads: 'configure_kyc_requirements',
  auto_assign_complaints: 'configure_kyc_requirements',
  auto_assign_collection_cases: 'configure_kyc_requirements',
  admin_session_timeout_telemarketer: 'configure_session_timeouts',
  admin_session_timeout_collection: 'configure_session_timeouts',
  admin_session_timeout_customer_care: 'configure_session_timeouts',
  admin_session_timeout_operations: 'configure_session_timeouts',
};

// Every currently known config key is now explicitly mapped above — this
// fallback only matters if a future config key is added without a
// corresponding entry, matching the backend's own fallback behavior.
const ALL_CONFIGURE_PERMISSIONS = [
  'configure_interest_rate', 'configure_penalty_rate', 'configure_loan_duration',
  'configure_min_loan_amount', 'configure_max_loan_amount', 'configure_loan_limit_increment',
  'configure_crc_suspension_duration', 'configure_otp_expiry', 'configure_face_match_threshold',
  'configure_crc_bad_classification_list', 'configure_kyc_requirements', 'configure_notification_templates',
  'configure_session_timeouts', 'configure_primary_provider', 'configure_sms_provider',
  'configure_payment_provider', 'configure_bvn_provider', 'configure_crc_provider',
  'configure_webhook_urls', 'configure_webhook_signatures', 'configure_api_keys',
];

const NUMERIC_KEYS = [
  'interest_rate', 'penalty_rate', 'loan_duration_days', 'min_loan_amount',
  'max_loan_amount', 'loan_limit_increment', 'admin_cost', 'crc_suspension_days',
  'otp_expiry_minutes', 'face_match_threshold',
  'admin_session_timeout_telemarketer', 'admin_session_timeout_collection',
  'admin_session_timeout_customer_care', 'admin_session_timeout_operations',
];

const BOOLEAN_KEYS = ['auto_assign_leads', 'auto_assign_complaints', 'auto_assign_collection_cases'];

// Confirmed from the spec's own description ("currently
// PRIMARY_PROVIDER=ercas/blusalt") and the thirdParty/ercas and
// thirdParty/blusalt integration folders — these are the two valid values.
const PRIMARY_PROVIDER_OPTIONS = ['ercas', 'blusalt'];

// Hidden from this UI entirely per request — these configs still exist in
// the database and are unaffected server-side, they're just not shown or
// editable from this page. 'configure_session_timeouts' isn't a config key
// itself — it's the permission gating the four session-timeout keys below,
// so all four are hidden as the interpretation of that item.
const HIDDEN_CONFIG_KEYS = [
  'crc_provider',
  'bvn_provider',
  'sms_provider',
  'otp_expiry_minutes',
  'face_match_threshold',
  'admin_session_timeout_telemarketer',
  'admin_session_timeout_collection',
  'admin_session_timeout_customer_care',
  'admin_session_timeout_operations',
];

function EditConfigModal({ open, onClose, config }) {
  const [value, setValue] = useState(config?.value ?? '');
  const mutation = useUpdateConfig();

  const handleClose = () => {
    mutation.reset();
    onClose();
  };

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ key: config.key, value: String(value) });
      handleClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  const isNumeric = NUMERIC_KEYS.includes(config?.key);
  const isBoolean = BOOLEAN_KEYS.includes(config?.key);
  const isPrimaryProvider = config?.key === 'primary_provider';

  return (
    <Modal open={open} onClose={handleClose} title={`Edit ${config?.key}`}>
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      {config?.description && (
        <p className="mb-3 text-sm text-ink-500">{config.description}</p>
      )}
      <label className="block text-sm font-medium text-ink-700">
        Value
        {isPrimaryProvider ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
          >
            {PRIMARY_PROVIDER_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        ) : isBoolean ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        ) : (
          <input
            type={isNumeric ? 'number' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
          />
        )}
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={value === '' || mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}

export default function PlatformConfigPage() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const { data: configs, isLoading, error } = useAllConfigs();
  const [editingConfig, setEditingConfig] = useState(null);

  const canEdit = (key) => {
    const specificPermission = CONFIG_PERMISSION_MAP[key];
    if (specificPermission) return hasPermission(specificPermission);
    return hasAnyPermission(ALL_CONFIGURE_PERMISSIONS);
  };

  const grouped = useMemo(() => {
    const groups = {};
    (configs || [])
      .filter((c) => !HIDDEN_CONFIG_KEYS.includes(c.key))
      .forEach((c) => {
        const group = c.group || 'Other';
        if (!groups[group]) groups[group] = [];
        groups[group].push(c);
      });
    return groups;
  }, [configs]);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-ink-900">Platform Config</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          System-wide settings — rates, limits, providers, and session timeouts.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <EmptyState icon={AlertCircle} title="Couldn't load platform config" description={error.message} />
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([group, items]) => (
            <Card key={group} className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{group}</p>
              <div className="flex flex-col divide-y divide-ink-50">
                {items.map((c) => (
                  <div key={c.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{c.key}</p>
                      {c.description && <p className="mt-0.5 text-xs text-ink-500">{c.description}</p>}
                      {c.updatedAt && (
                        <p className="mt-1 text-xs text-ink-400">
                          Last updated {formatDateTime(c.updatedAt)}{c.updatedBy ? ` by ${c.updatedBy}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-ink-900">{String(c.value)}</span>
                      {canEdit(c.key) && (
                        <button
                          type="button"
                          onClick={() => setEditingConfig(c)}
                          className="text-xs font-medium text-dodger-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <EditConfigModal
        key={editingConfig?.key || 'none'}
        open={!!editingConfig}
        onClose={() => setEditingConfig(null)}
        config={editingConfig}
      />
    </div>
  );
}
