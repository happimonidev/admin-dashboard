import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import {
  useLoan,
  useBankAccountsForRetry,
  useEditLoanFinancials,
  useRetryLoanDisbursement,
  useRejectLoan,
} from '../../hooks/useLoans';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import DetailRow from '../../components/ui/DetailRow';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { getLoanStatusMeta, humanizeReasonCode } from '../../lib/status';
import { formatDate, formatDateTime, formatNaira } from '../../lib/format';

function EditFinancialsModal({ open, onClose, loan }) {
  const mutation = useEditLoanFinancials(loan?.loanID);
  const [validationError, setValidationError] = useState('');
  const { register, handleSubmit, reset } = useForm({
    values: {
      repaymentAmount: loan?.repaymentAmount ?? '',
      repaymentDate: loan?.repaymentDate ? loan.repaymentDate.slice(0, 10) : '',
      penalty: loan?.penalty ?? '',
    },
  });

  const handleClose = () => {
    mutation.reset();
    setValidationError('');
    reset();
    onClose();
  };

  const onSubmit = async (values) => {
    setValidationError('');

    // Mirrors the backend's cross-field rule exactly: editing penalty
    // requires repaymentAmount to also be sent — but not the reverse.
    if (values.penalty !== '' && values.repaymentAmount === '') {
      setValidationError(
        'Repayment amount must also be provided when editing penalty.'
      );
      return;
    }

    const fields = {};
    if (values.repaymentAmount !== '') fields.repaymentAmount = Number(values.repaymentAmount);
    if (values.repaymentDate !== '') fields.repaymentDate = values.repaymentDate;
    if (values.penalty !== '') fields.penalty = Number(values.penalty);
    try {
      await mutation.mutateAsync(fields);
      handleClose();
    } catch {
      // Error surfaced via mutation.error below — nothing further to do.
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Edit loan financials">
      <form id="edit-financials-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {mutation.isError && (
          <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {mutation.error.message}
          </div>
        )}
        {validationError && (
          <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {validationError}
          </div>
        )}
        <label className="block text-sm font-medium text-ink-700">
          Repayment amount (₦)
          <input
            type="number"
            step="0.01"
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
            {...register('repaymentAmount')}
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-ink-700">
          Repayment date
          <input
            type="date"
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
            {...register('repaymentDate')}
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-ink-700">
          Penalty (₦)
          <input
            type="number"
            step="0.01"
            className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
            {...register('penalty')}
          />
        </label>
        <p className="mt-1.5 text-xs text-ink-400">
          Repayment amount is required if you change the penalty.
        </p>
      </form>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="edit-financials-form" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}

function RetryDisbursementModal({ open, onClose, loan }) {
  const [selected, setSelected] = useState('');
  const { data: accounts, isLoading, error } = useBankAccountsForRetry(loan?.loanID, loan?.userID, open);
  const mutation = useRetryLoanDisbursement(loan?.loanID);

  const handleRetry = async () => {
    try {
      await mutation.mutateAsync(selected);
      onClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Retry loan disbursement">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="mb-3 text-sm text-ink-500">
        Select the bank account to disburse ₦{loan ? formatNaira(loan.loanAmount).replace('₦', '') : ''} to.
      </p>
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : error ? (
        <p className="text-sm text-danger-500">{error.message}</p>
      ) : !accounts || accounts.length === 0 ? (
        <p className="text-sm text-ink-500">This customer has no linked bank accounts.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((acc) => (
            <label
              key={acc.accountNumber}
              className={`flex cursor-pointer items-center gap-3 rounded-control border p-3 text-sm ${
                selected === acc.accountNumber ? 'border-dodger-500 bg-dodger-50' : 'border-ink-200'
              }`}
            >
              <input
                type="radio"
                name="retryAccount"
                value={acc.accountNumber}
                checked={selected === acc.accountNumber}
                onChange={() => setSelected(acc.accountNumber)}
              />
              <div>
                <p className="font-medium text-ink-900">{acc.bankName}</p>
                <p className="text-ink-500">{acc.accountName} · {acc.accountNumber}</p>
              </div>
            </label>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleRetry} disabled={!selected || mutation.isPending}>
          {mutation.isPending ? 'Retrying…' : 'Retry disbursement'}
        </Button>
      </div>
    </Modal>
  );
}

function RejectLoanModal({ open, onClose, loan }) {
  const [reason, setReason] = useState('');
  const mutation = useRejectLoan(loan?.loanID);

  const handleReject = async () => {
    try {
      await mutation.mutateAsync(reason || undefined);
      onClose();
    } catch {
      // Error surfaced via mutation.error below.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reject loan">
      {mutation.isError && (
        <div className="mb-3 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {mutation.error.message}
        </div>
      )}
      <p className="mb-3 text-sm text-ink-500">
        This frees the customer to apply for a new loan. This action cannot be undone.
      </p>
      <label className="block text-sm font-medium text-ink-700">
        Reason (optional)
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm focus:border-dodger-500"
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleReject} disabled={mutation.isPending}>
          {mutation.isPending ? 'Rejecting…' : 'Reject loan'}
        </Button>
      </div>
    </Modal>
  );
}

export default function LoanDetail() {
  const { loanID } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: loan, isLoading, error } = useLoan(loanID);
  const [modal, setModal] = useState(null); // 'edit' | 'retry' | 'reject' | null

  const canEdit = hasPermission('edit_financial_settings');
  const canRetry = hasPermission('retry_loan_disbursement');
  const canReject = hasPermission('reject_loan');
  const isPending = loan?.status === 'pending';

  const reason = loan ? loan.pendingReason || loan.rejectionReason : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/loans')}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to loans
      </button>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <EmptyState icon={AlertCircle} title="Couldn't load this loan" description={error.message} />
      ) : loan ? (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg font-semibold text-ink-900">{loan.loanID}</h1>
                <Badge tone={getLoanStatusMeta(loan.status).tone}>
                  {getLoanStatusMeta(loan.status).label}
                </Badge>
              </div>
              <Link to={`/customers/${loan.userID}`} className="mt-0.5 inline-block text-xs text-dodger-600 hover:underline">
                View customer {loan.userID}
              </Link>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="secondary" size="sm" onClick={() => setModal('edit')}>
                  Edit financials
                </Button>
              )}
              {canRetry && isPending && (
                <Button size="sm" onClick={() => setModal('retry')}>
                  Retry disbursement
                </Button>
              )}
              {canReject && isPending && (
                <Button variant="danger" size="sm" onClick={() => setModal('reject')}>
                  Reject loan
                </Button>
              )}
            </div>
          </div>

          {reason && (
            <div className="mb-4 rounded-card bg-warning-50 p-3 text-sm text-warning-700">
              {loan.pendingReason ? 'Pending reason: ' : 'Rejection reason: '}
              {humanizeReasonCode(reason)}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Amounts</p>
              <dl>
                <DetailRow label="Loan amount" value={formatNaira(loan.loanAmount)} />
                <DetailRow label="Repayment amount" value={formatNaira(loan.repaymentAmount)} />
                <DetailRow label="Base repayment amount" value={loan.baseRepaymentAmount !== undefined ? formatNaira(loan.baseRepaymentAmount) : undefined} />
                <DetailRow label="Interest" value={loan.interest !== undefined ? formatNaira(loan.interest) : undefined} />
                <DetailRow label="Admin cost" value={loan.adminCost !== undefined ? formatNaira(loan.adminCost) : undefined} />
                <DetailRow label="Penalty" value={loan.penalty !== undefined ? formatNaira(loan.penalty) : undefined} />
                <DetailRow label="Penalty per day" value={loan.penaltyPerDay !== undefined ? formatNaira(loan.penaltyPerDay) : undefined} />
                <DetailRow label="Paid amount" value={loan.paidAmount !== undefined ? formatNaira(loan.paidAmount) : undefined} />
                <DetailRow label="Total amount" value={loan.totalAmount !== undefined ? formatNaira(loan.totalAmount) : undefined} />
                <DetailRow label="Days overdue" value={loan.daysOverdue} />
              </dl>
            </Card>

            <Card className="p-4">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">Dates & disbursement</p>
              <dl>
                <DetailRow label="Repayment date" value={loan.repaymentDate ? formatDate(loan.repaymentDate) : undefined} />
                <DetailRow label="Disbursement date" value={loan.disbursementDate ? formatDate(loan.disbursementDate) : undefined} />
                <DetailRow label="Disbursed reference" value={loan.disbursedPaymentReference} />
                <DetailRow label="Disbursed channel" value={loan.disbursedChannel} />
                <DetailRow label="Disbursed method" value={loan.disbursedMethod} />
                <DetailRow label="Created" value={loan.createdAt ? formatDateTime(loan.createdAt) : undefined} />
              </dl>
            </Card>
          </div>

          <EditFinancialsModal open={modal === 'edit'} onClose={() => setModal(null)} loan={loan} />
          <RetryDisbursementModal open={modal === 'retry'} onClose={() => setModal(null)} loan={loan} />
          <RejectLoanModal open={modal === 'reject'} onClose={() => setModal(null)} loan={loan} />
        </>
      ) : null}
    </div>
  );
}
