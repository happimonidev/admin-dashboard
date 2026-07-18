import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as configApi from '../api/config';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapVoid = (result) => {
  if (!result.success) throw new Error(result.message);
  return result;
};

export const useAllConfigs = () =>
  useQuery({
    queryKey: ['platform-config'],
    queryFn: async () => unwrap(await configApi.getAllConfigs()),
  });

export const useUpdateConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }) => unwrapVoid(await configApi.updateConfig(key, value)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform-config'] }),
  });
};
