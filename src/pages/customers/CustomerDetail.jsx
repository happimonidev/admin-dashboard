import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import {
  useCustomer,
  useCustomerKYC,
  useCustomerLoans,
  useCustomerBankAccounts,
  useCustomerVirtualAccount,
  useDeactivateCustomer,
  useReactivateCustomer,
  useUpdateCreditWorthiness,
} from '../../hooks/useCustomers';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import DetailRow from '../../components/ui/DetailRow';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SensitiveValue from '../../components/SensitiveValue';
import DataTable from '../../components/DataTable';
import CrcReportView from '../../components/CrcReportView';
import PermissionGate from '../../components/PermissionGate';
import CallButton from '../../components/CallButton';
import { getLoanStatusMeta, getAdminStatusMeta } from '../../lib/status';
import { formatDate, formatDateTime, formatNaira } from '../../lib/format';
import { toImageSrc } from '../../lib/image';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'kyc', label: 'KYC', anyOf: ['view_kyc_full', 'view_kyc_limited'] },
  {
    key: 'loans',
    label: 'Loans',
    anyOf: [
      'view_loan_history',
      'view_assigned_collection_cases',
      'view_assigned_leads',
      'view_assigned_complaints',
      'view_team_customers',
    ],
  },
  { key: 'bank', label: 'Bank & Virtual Account', permission: 'view_customer_bank_account' },
];

function CrcResultSection({ crcResult }) {
  const [open, setOpen] = useState(false);

  // crcResult is a large nested object from the CRC provider, not a
  // simple value — never render it directly as JSX children (React
  // throws on raw objects/arrays as children). Show a small summary
  // pulled from known-safe string fields, with the full report
  // available as pretty-printed JSON in a modal on demand.
  if (!crcResult || typeof crcResult !== 'object') return null;

  const identity = crcResult.identity || {};
  const loanCount = Array.isArray(crcResult.loanHistory)
    ? crcResult.loanHistory.length
    : 0;

  return (
    <>
      <DetailRow label="CRC scenario" value={crcResult.scenario} />
      {identity.name && <DetailRow label="CRC identity name" value={identity.name} />}
      {loanCount > 0 && (
        <DetailRow label="CRC-reported facilities" value={loanCount} />
      )}
      <div className="pt-2">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          View full CRC report
        </Button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Full CRC report"
        size="xl"
      >
        <CrcReportView crcResult={crcResult} />
      </Modal>
    </>
  );
}

function AccountStatusBar({ customer }) {
  const { hasPermission } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deactivateMutation = useDeactivateCustomer(customer.userID);
  const reactivateMutation = useReactivateCustomer(customer.userID);
  const [reason, setReason] = useState('');

  const canManage = hasPermission('manage_customer_status');
  const isActive = customer.status !== false;
  const meta = getAdminStatusMeta(isActive);
  const mutation = isActive ? deactivateMutation : reactivateMutation;

  const handleConfirm = async () => {
    try {
      if (isActive) {
        await deactivateMutation.mutateAsync(reason || undefined);
      } else {
        await reactivateMutation.mutateAsync();
      }
      setConfirmOpen(false);
      setReason('');
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Card className="mb-4 flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink-500">Account status:</span>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>
      {canManage && (
        <Button
          variant={isActive ? 'danger' : 'primary'}
          size="sm"
          onClick={() => setConfirmOpen(true)}
        >
          {isActive ? 'Deactivate account' : 'Reactivate account'}
        </Button>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={isActive ? 'Deactivate customer account' : 'Reactivate customer account'}
      >
        {mutation.isError && (
          <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {mutation.error.message}
          </div>
        )}
        <p className="mb-3 text-sm text-ink-500">
          {isActive
            ? 'This customer will no longer be able to log in or use the app.'
            : 'This customer will regain access to log in and use the app.'}
        </p>
        {isActive && (
          <label className="block text-sm font-medium text-ink-700">
            Reason (optional)
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
            />
          </label>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant={isActive ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : isActive ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function CreditWorthinessEditor({ customer }) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(!!customer.creditWorthy);
  const [reason, setReason] = useState('');
  const mutation = useUpdateCreditWorthiness(customer.userID);

  const canManage = hasPermission('manage_customer_credit_worthiness');

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ creditWorthy: value, reason: reason || undefined });
      setOpen(false);
      setReason('');
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-ink-50 py-2.5 last:border-0">
        <dt className="text-sm text-ink-500">Creditworthy</dt>
        <dd className="flex items-center gap-2 text-right text-sm font-medium text-ink-900">
          {customer.creditWorthy !== undefined ? (
            <Badge tone={customer.creditWorthy ? 'success' : 'danger'}>
              {customer.creditWorthy ? 'Yes' : 'No'}
            </Badge>
          ) : '—'}
          {canManage && (
            <button
              type="button"
              onClick={() => { setValue(!!customer.creditWorthy); setOpen(true); }}
              className="text-xs font-medium text-dodger-600 hover:underline"
            >
              Edit
            </button>
          )}
        </dd>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Update credit worthiness">
        {mutation.isError && (
          <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {mutation.error.message}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant={value ? 'primary' : 'secondary'} size="sm" onClick={() => setValue(true)}>
            Credit worthy
          </Button>
          <Button variant={!value ? 'danger' : 'secondary'} size="sm" onClick={() => setValue(false)}>
            Not credit worthy
          </Button>
        </div>
        <label className="mt-3 block text-sm font-medium text-ink-700">
          Reason (optional)
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function OverviewTab({ customer }) {
  return (
    <div>
      <AccountStatusBar customer={customer} />
      <div className="grid gap-4 sm:grid-cols-2">
      <Card className="p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Identity
        </p>
        <dl>
          <DetailRow label="Full name" value={
            [customer.bvnFirstName, customer.bvnLastName].filter(Boolean).join(' ') || undefined
          } />
          <DetailRow label="Phone" value={
            <span className="inline-flex items-center gap-1.5">
              {customer.phone}
              <PermissionGate permission="call_customer">
                <CallButton phone={customer.phone} />
              </PermissionGate>
            </span>
          } />
          <DetailRow label="Email" value={customer.email} />
          <DetailRow label="Address" value={customer.address} />
          <DetailRow label="Date of birth" value={customer.dateOfBirth ? formatDate(customer.dateOfBirth) : undefined} />
          <DetailRow label="Gender" value={customer.gender} />
          <DetailRow label="Marital status" value={customer.maritalStatus} />
          <DetailRow label="KYC step" value={customer.kycStep} />
        </dl>
      </Card>

      <Card className="p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Verification & credit
        </p>
        <dl>
          <DetailRow label="BVN" value={<SensitiveValue value={customer.bvn} />} />
          <DetailRow
            label="BVN verified"
            value={
              <Badge tone={customer.bvnVerified ? 'success' : 'neutral'}>
                {customer.bvnVerified ? 'Verified' : 'Not verified'}
              </Badge>
            }
          />
          <DetailRow label="BVN verified at" value={customer.bvnVerifiedAt ? formatDateTime(customer.bvnVerifiedAt) : undefined} />
          <DetailRow
            label="CRC checked"
            value={
              <Badge tone={customer.crcChecked ? 'success' : 'neutral'}>
                {customer.crcChecked ? 'Checked' : 'Not checked'}
              </Badge>
            }
          />
          <DetailRow label="CRC checked at" value={customer.crcCheckedAt ? formatDateTime(customer.crcCheckedAt) : undefined} />
          <DetailRow label="CRC suspended until" value={customer.crcSuspendedUntil ? formatDate(customer.crcSuspendedUntil) : undefined} />
          <DetailRow label="CRC suspension reason" value={customer.crcSuspensionReason} />
          <CrcResultSection crcResult={customer.crcResult} />
          <CreditWorthinessEditor customer={customer} />
          <DetailRow label="Loan limit" value={customer.loanLimit !== undefined ? formatNaira(customer.loanLimit) : undefined} />
          <DetailRow label="Minimum loan amount" value={customer.minimumLoanAmount !== undefined ? formatNaira(customer.minimumLoanAmount) : undefined} />
          <DetailRow label="Joined" value={customer.createdAt ? formatDate(customer.createdAt) : undefined} />
        </dl>
      </Card>
      </div>
    </div>
  );
}

function KYCTab({ userID }) {
  const { data, isLoading, error } = useCustomerKYC(userID, true);

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error) return <EmptyState icon={AlertCircle} title="Couldn't load KYC details" description={error.message} />;
  if (!data) return null;

  return (
    <Card className="p-4">
      <dl>
        <DetailRow label="KYC step" value={data.kycStep} />
        <DetailRow
          label="BVN verified"
          value={<Badge tone={data.bvnVerified ? 'success' : 'neutral'}>{data.bvnVerified ? 'Verified' : 'Not verified'}</Badge>}
        />
        <DetailRow label="BVN verified at" value={data.bvnVerifiedAt ? formatDateTime(data.bvnVerifiedAt) : undefined} />
        <DetailRow label="BVN first name" value={data.bvnFirstName} />
        <DetailRow label="BVN last name" value={data.bvnLastName} />
        <DetailRow label="BVN date of birth" value={data.bvnDateOfBirth ? formatDate(data.bvnDateOfBirth) : undefined} />
      </dl>
      {(data.image || data.bvnImage) && (
        <div className="mt-4 flex flex-wrap gap-5">
          {data.image && (
            <div>
              <p className="mb-1.5 text-xs text-ink-400">Uploaded photo</p>
              <img
                src={toImageSrc(data.image)}
                alt="Customer"
                className="h-40 w-40 rounded-card object-cover ring-1 ring-ink-100"
              />
            </div>
          )}
          {data.bvnImage && (
            <div>
              <p className="mb-1.5 text-xs text-ink-400">BVN photo</p>
              <img
                src={toImageSrc(data.bvnImage)}
                alt="BVN"
                className="h-40 w-40 rounded-card object-cover ring-1 ring-ink-100"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function LoansTab({ userID }) {
  const { data, isLoading, error } = useCustomerLoans(userID, true);

  const columns = [
    { key: 'loanID', header: 'Loan ID', className: 'font-mono text-xs text-ink-500' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const meta = getLoanStatusMeta(row.status);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    { key: 'loanAmount', header: 'Amount', render: (row) => formatNaira(row.loanAmount), sortable: true },
    { key: 'repaymentAmount', header: 'Repayment', render: (row) => formatNaira(row.repaymentAmount), hideOnMobile: true },
    { key: 'paidAmount', header: 'Paid', render: (row) => formatNaira(row.paidAmount), hideOnMobile: true },
    { key: 'daysOverdue', header: 'Days overdue', hideOnMobile: true },
    { key: 'repaymentDate', header: 'Repayment date', render: (row) => formatDate(row.repaymentDate), sortable: true },
    { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt), sortable: true },
  ];

  return (
    <Card className="p-4">
      <DataTable
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        error={error}
        getRowId={(row) => row.loanID}
        emptyTitle="No loans yet"
        emptyDescription="This customer hasn't taken any loans."
      />
    </Card>
  );
}

function BankTab({ userID }) {
  const { data: accounts, isLoading, error } = useCustomerBankAccounts(userID, true);
  const { data: virtualAccount } = useCustomerVirtualAccount(userID, true);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
          Linked bank accounts
        </p>
        {isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : error ? (
          <p className="text-sm text-danger-500">{error.message}</p>
        ) : !accounts || accounts.length === 0 ? (
          <p className="text-sm text-ink-500">No bank accounts linked.</p>
        ) : (
          <div className="flex flex-col divide-y divide-ink-50">
            {accounts.map((acc, i) => (
              <div key={i} className="py-2.5">
                <DetailRow label="Bank" value={acc.bankName} />
                <DetailRow label="Account name" value={acc.accountName} />
                <DetailRow label="Account number" value={<SensitiveValue value={acc.accountNumber} />} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {virtualAccount && (
        <Card className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
            Virtual account
          </p>
          <dl>
            <DetailRow label="Bank" value={virtualAccount.accountBank} />
            <DetailRow label="Account name" value={virtualAccount.accountName} />
            <DetailRow label="Account number" value={<SensitiveValue value={virtualAccount.accountNumber} />} />
            <DetailRow label="Provider" value={virtualAccount.provider} />
            <DetailRow label="Reference" value={virtualAccount.reference} />
          </dl>
        </Card>
      )}
    </div>
  );
}

export default function CustomerDetail() {
  const { userID } = useParams();
  const navigate = useNavigate();
  const { hasPermission, hasAnyPermission } = useAuth();
  const { data: customer, isLoading, error } = useCustomer(userID);
  const [activeTab, setActiveTab] = useState('overview');

  const visibleTabs = TABS.filter((tab) => {
    if (tab.permission) return hasPermission(tab.permission);
    if (tab.anyOf) return hasAnyPermission(tab.anyOf);
    return true;
  });

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/customers')}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </button>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load this customer"
          description={error.message}
        />
      ) : customer ? (
        <>
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-ink-900">
              {[customer.bvnFirstName, customer.bvnLastName].filter(Boolean).join(' ') || customer.phone}
            </h1>
            <p className="mt-0.5 font-mono text-xs text-ink-400">{customer.userID}</p>
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

          {activeTab === 'overview' && <OverviewTab customer={customer} />}
          {activeTab === 'kyc' && <KYCTab userID={userID} />}
          {activeTab === 'loans' && <LoansTab userID={userID} />}
          {activeTab === 'bank' && <BankTab userID={userID} />}
        </>
      ) : (
        <Link to="/customers">Back to customers</Link>
      )}
    </div>
  );
}
