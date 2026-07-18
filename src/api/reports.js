import { apiClient } from './client';

// GET /admin/reports/telemarketer-team?from=&to= — filters on statusUpdatedAt
export const getTelemarketerTeamReport = async (params = {}) => {
  const { data } = await apiClient.get('/reports/telemarketer-team', { params });
  return data;
};

// GET /admin/reports/collection-team?from=&to= — filters on resolvedAt
export const getCollectionTeamReport = async (params = {}) => {
  const { data } = await apiClient.get('/reports/collection-team', { params });
  return data;
};

// GET /admin/reports/customer-care-team?from=&to= — filters on resolvedAt
export const getCustomerCareTeamReport = async (params = {}) => {
  const { data } = await apiClient.get('/reports/customer-care-team', { params });
  return data;
};

// GET /admin/reports/npl — no date params, always current state
export const getNPLReport = async () => {
  const { data } = await apiClient.get('/reports/npl');
  return data;
};

// GET /admin/reports/revenue?from=&to= — filters on updatedAt (repayment date), status:'closed'
export const getRevenueReport = async (params = {}) => {
  const { data } = await apiClient.get('/reports/revenue', { params });
  return data;
};

// GET /admin/reports/company-kpi?from=&to= — only loansThisMonth/leadsConvertedThisMonth
// respect the range; totalUsers/totalOverdueLoans/openComplaints remain always-current
export const getCompanyKPISummary = async (params = {}) => {
  const { data } = await apiClient.get('/reports/company-kpi', { params });
  return data;
};

// GET /admin/reports/payout-logs?skip=&limit=&search=&export= — no date-range params, always current state
export const getPayoutLogs = async (params = {}) => {
  const { data } = await apiClient.get('/reports/payout-logs', { params });
  return data;
};
