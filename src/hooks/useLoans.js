import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as loansApi from '../api/loans';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapWithTotal = (result) => {
  if (!result.success) throw new Error(result.message);
  return { data: result.data, total: result.total };
};

export const useAllLoans = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['loans', 'all', params],
    queryFn: async () => unwrapWithTotal(await loansApi.getAllLoans(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useLoanQueue = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['loans', 'queue', params],
    queryFn: async () => unwrapWithTotal(await loansApi.getLoanQueue(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useOverdueLoans = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['loans', 'overdue', params],
    queryFn: async () => unwrapWithTotal(await loansApi.getOverdueLoans(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useDueLoans = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['loans', 'due', params],
    queryFn: async () => unwrapWithTotal(await loansApi.getDueLoans(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useRepaymentLogs = (params = {}, enabled = true) =>
  useQuery({
    queryKey: ['loans', 'repayment-logs', params],
    queryFn: async () => unwrapWithTotal(await loansApi.getRepaymentLogs(params)),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useLoan = (loanID) =>
  useQuery({
    queryKey: ['loan', loanID],
    queryFn: async () => unwrap(await loansApi.getLoanByID(loanID)),
    enabled: !!loanID,
  });

export const useBankAccountsForRetry = (loanID, userID, enabled) =>
  useQuery({
    queryKey: ['loan', loanID, 'retry-bank-accounts', userID],
    queryFn: async () => unwrap(await loansApi.getBankAccountsForRetry(loanID, userID)),
    enabled: !!loanID && !!userID && enabled,
  });

// Invalidate every loan list variant plus the single-loan cache — simplest
// correct approach given how many list views (all/queue/overdue/repayment)
// could contain this loan.
const invalidateLoanCaches = (queryClient, loanID) => {
  queryClient.invalidateQueries({ queryKey: ['loans'] });
  if (loanID) queryClient.invalidateQueries({ queryKey: ['loan', loanID] });
};

export const useEditLoanFinancials = (loanID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fields) => unwrap(await loansApi.editLoanFinancials(loanID, fields)),
    onSuccess: () => invalidateLoanCaches(queryClient, loanID),
  });
};

export const useRetryLoanDisbursement = (loanID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountNumber) => unwrap(await loansApi.retryLoanDisbursement(loanID, accountNumber)),
    onSuccess: () => invalidateLoanCaches(queryClient, loanID),
  });
};

export const useRejectLoan = (loanID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rejectionReason) => unwrap(await loansApi.rejectLoan(loanID, rejectionReason)),
    onSuccess: () => invalidateLoanCaches(queryClient, loanID),
  });
};
