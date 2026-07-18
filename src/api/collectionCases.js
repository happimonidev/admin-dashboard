import { apiClient } from './client';

// GET /admin/collection?status=&assignedTo=&skip=&limit=&search=&export= — requires view_all_collection_cases
export const getAllCases = async (params = {}) => {
  const { data } = await apiClient.get('/collection', { params });
  return data;
};

// GET /admin/collection/assigned?skip=&limit=&search=&export= — own assigned cases, requires view_assigned_collection_cases
export const getAssignedCases = async (params = {}) => {
  const { data } = await apiClient.get('/collection/assigned', { params });
  return data;
};

// GET /admin/collection/overdue-loans — for picking a loan to create a case from
export const getOverdueLoansForCase = async () => {
  const { data } = await apiClient.get('/collection/overdue-loans');
  return data;
};

// POST /admin/collection/create — { loanID, userID, loanAmount, amountOverdue, daysOverdue, customerName?, customerPhone?, assignedTo? }
export const createCase = async (payload) => {
  const { data } = await apiClient.post('/collection/create', payload);
  return data;
};

// PATCH /admin/collection/:caseID/status — { status, amountRecovered? }
export const updateCaseStatus = async (caseID, status, amountRecovered) => {
  const { data } = await apiClient.patch(`/collection/${caseID}/status`, {
    status,
    amountRecovered,
  });
  return data;
};

// PATCH /admin/collection/:caseID/reassign — { newAssignee }
export const reassignCase = async (caseID, newAssignee) => {
  const { data } = await apiClient.patch(`/collection/${caseID}/reassign`, {
    newAssignee,
  });
  return data;
};
