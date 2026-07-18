import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as scoringApi from '../api/scoring';

const unwrap = (result) => {
  if (!result.success) throw new Error(result.message);
  return result.data;
};

const unwrapVoid = (result) => {
  if (!result.success) throw new Error(result.message);
  return result;
};

export const useOwnScores = (enabled = true) =>
  useQuery({
    queryKey: ['scores', 'own'],
    queryFn: async () => unwrap(await scoringApi.getOwnScores()),
    enabled,
  });

export const useScoresByTarget = (adminID, enabled = true) =>
  useQuery({
    queryKey: ['scores', adminID],
    queryFn: async () => unwrap(await scoringApi.getScoresByTarget(adminID)),
    enabled: !!adminID && enabled,
  });

export const useCreateScore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => unwrapVoid(await scoringApi.createScore(payload)),
    onSuccess: (_, payload) =>
      queryClient.invalidateQueries({ queryKey: ['scores', payload.targetAdminID] }),
  });
};

export const useUpdateScore = (targetAdminID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ scoreID, ...payload }) => unwrapVoid(await scoringApi.updateScore(scoreID, payload)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scores', targetAdminID] }),
  });
};

export const useDeleteScore = (targetAdminID) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scoreID) => unwrapVoid(await scoringApi.deleteScore(scoreID)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scores', targetAdminID] }),
  });
};
