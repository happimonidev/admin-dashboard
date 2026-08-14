import { apiClient } from './client';

// GET /admin/loans?status=&userID=&skip=&limit=&search=&export= — no skip/limit sent = returns everything
export const getAllLoans = async (params = {}) => {
  const { data } = await apiClient.get('/loans', { params });
  return data;
};

// GET /admin/loans/queue?skip=&limit=&search=&export=
export const getLoanQueue = async (params = {}) => {
  const { data } = await apiClient.get('/loans/queue', { params });
  return data;
};

// GET /admin/loans/overdue?skip=&limit=&search=&export=
export const getOverdueLoans = async (params = {}) => {
  const { data } = await apiClient.get('/loans/overdue', { params });
  return data;
};

// GET /admin/loans/due?skip=&limit=&search=&export= — loans due today,
// no from/to (fixed one-day window by definition, not a range)
export const getDueLoans = async (params = {}) => {
  const { data } = await apiClient.get('/loans/due', { params });
  return data;
};

// GET /admin/loans/repayment-logs?skip=&limit=&search=&export=
export const getRepaymentLogs = async (params = {}) => {
  const { data } = await apiClient.get('/loans/repayment-logs', { params });
  return data;
};

// GET /admin/loans/:loanID
export const getLoanByID = async (loanID) => {
  const { data } = await apiClient.get(`/loans/${loanID}`);
  return data;
};

// GET /admin/loans/:loanID/bank-accounts?userID=
// Note: the backend controller reads userID from the query string, not
// from the loanID path param — loanID in the path is otherwise unused
// server-side for this endpoint. Confirmed directly against the controller.
export const getBankAccountsForRetry = async (loanID, userID) => {
  const { data } = await apiClient.get(`/loans/${loanID}/bank-accounts`, {
    params: { userID },
  });
  return data;
};

// PATCH /admin/loans/:loanID/edit — repaymentAmount, repaymentDate, penalty
export const editLoanFinancials = async (loanID, fields) => {
  const { data } = await apiClient.patch(`/loans/${loanID}/edit`, fields);
  return data;
};

// PATCH /admin/loans/:loanID/retry — { accountNumber }
export const retryLoanDisbursement = async (loanID, accountNumber) => {
  const { data } = await apiClient.patch(`/loans/${loanID}/retry`, {
    accountNumber,
  });
  return data;
};

// PATCH /admin/loans/:loanID/reject — { rejectionReason? }
export const rejectLoan = async (loanID, rejectionReason) => {
  const { data } = await apiClient.patch(`/loans/${loanID}/reject`, {
    rejectionReason,
  });
  return data;
};
