import { apiClient } from './client';

// GET /admin/customers?skip=&limit=&search=&export= — no params sent = returns everything (backward compatible)
export const getAllCustomers = async (params = {}) => {
  const { data } = await apiClient.get('/customers', { params });
  return data;
};

// GET /admin/customers/:userID
export const getCustomerByID = async (userID) => {
  const { data } = await apiClient.get(`/customers/${userID}`);
  return data;
};

// GET /admin/customers/:userID/kyc — requires view_kyc_full or view_kyc_limited
export const getCustomerKYC = async (userID) => {
  const { data } = await apiClient.get(`/customers/${userID}/kyc`);
  return data;
};

// GET /admin/customers/:userID/loans — requires view_loan_history
export const getCustomerLoans = async (userID) => {
  const { data } = await apiClient.get(`/customers/${userID}/loans`);
  return data;
};

// GET /admin/customers/:userID/bank-accounts — requires view_customer_bank_account
export const getCustomerBankAccounts = async (userID) => {
  const { data } = await apiClient.get(`/customers/${userID}/bank-accounts`);
  return data;
};

// GET /admin/customers/:userID/virtual-account — requires view_customer_bank_account
export const getCustomerVirtualAccount = async (userID) => {
  const { data } = await apiClient.get(`/customers/${userID}/virtual-account`);
  return data;
};

// PATCH /admin/customers/:userID/deactivate — requires manage_customer_status
export const deactivateCustomer = async (userID, reason) => {
  const { data } = await apiClient.patch(`/customers/${userID}/deactivate`, { reason });
  return data;
};

// PATCH /admin/customers/:userID/reactivate — requires manage_customer_status
export const reactivateCustomer = async (userID) => {
  const { data } = await apiClient.patch(`/customers/${userID}/reactivate`);
  return data;
};

// PATCH /admin/customers/:userID/credit-worthiness — requires manage_customer_credit_worthiness
export const updateCreditWorthiness = async (userID, creditWorthy, reason) => {
  const { data } = await apiClient.patch(`/customers/${userID}/credit-worthiness`, {
    creditWorthy,
    reason,
  });
  return data;
};
