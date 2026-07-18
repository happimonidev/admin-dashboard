import { apiClient } from './client';

// POST /admin/scoring/create — { targetAdminID, metricName, score, comments? }
export const createScore = async (payload) => {
  const { data } = await apiClient.post('/scoring/create', payload);
  return data;
};

// GET /admin/scoring/own — self-access, no permission gate
export const getOwnScores = async () => {
  const { data } = await apiClient.get('/scoring/own');
  return data;
};

// GET /admin/scoring/:adminID — requires view_qualitative_scores
export const getScoresByTarget = async (adminID) => {
  const { data } = await apiClient.get(`/scoring/${adminID}`);
  return data;
};

// PATCH /admin/scoring/:scoreID — { score?, comments? }
export const updateScore = async (scoreID, payload) => {
  const { data } = await apiClient.patch(`/scoring/${scoreID}`, payload);
  return data;
};

// DELETE /admin/scoring/:scoreID — requires delete_qualitative_score
export const deleteScore = async (scoreID) => {
  const { data } = await apiClient.delete(`/scoring/${scoreID}`);
  return data;
};
