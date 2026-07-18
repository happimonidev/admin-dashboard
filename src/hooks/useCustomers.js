import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as customersApi from '../api/customers';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapWithTotal = (result) => {
  if (!result.success) throw new Error(result.message);
  return { data: result.data, total: result.total };
};

export const useCustomersList = (params = {}) =>
  useQuery({
    queryKey: ['customers', params],
    queryFn: async () => unwrapWithTotal(await customersApi.getAllCustomers(params)),
    placeholderData: (prev) => prev,
  });

export const useCustomer = (userID) =>
  useQuery({
    queryKey: ['customer', userID],
    queryFn: async () => unwrap(await customersApi.getCustomerByID(userID)),
    enabled: !!userID,
  });

export const useCustomerKYC = (userID, enabled) =>
  useQuery({
    queryKey: ['customer', userID, 'kyc'],
    queryFn: async () => unwrap(await customersApi.getCustomerKYC(userID)),
    enabled: !!userID && enabled,
  });

export const useCustomerLoans = (userID, enabled) =>
  useQuery({
    queryKey: ['customer', userID, 'loans'],
    queryFn: async () => unwrap(await customersApi.getCustomerLoans(userID)),
    enabled: !!userID && enabled,
  });

export const useCustomerBankAccounts = (userID, enabled) =>
  useQuery({
    queryKey: ['customer', userID, 'bank-accounts'],
    queryFn: async () =>
      unwrap(await customersApi.getCustomerBankAccounts(userID)),
    enabled: !!userID && enabled,
  });

export const useCustomerVirtualAccount = (userID, enabled) =>
  useQuery({
    queryKey: ['customer', userID, 'virtual-account'],
    queryFn: async () =>
      unwrap(await customersApi.getCustomerVirtualAccount(userID)),
    enabled: !!userID && enabled,
  });

const unwrapVoid = (result) => {
  if (!result.success) throw new Error(result.message);
};

export const useDeactivateCustomer = (userID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reason) => unwrapVoid(await customersApi.deactivateCustomer(userID, reason)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer', userID] }),
  });
};

export const useReactivateCustomer = (userID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrapVoid(await customersApi.reactivateCustomer(userID)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer', userID] }),
  });
};

export const useUpdateCreditWorthiness = (userID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ creditWorthy, reason }) =>
      unwrapVoid(await customersApi.updateCreditWorthiness(userID, creditWorthy, reason)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer', userID] }),
  });
};
