import { apiClient } from './client';

// GET /admin/complaints?status=&assignedTo=&skip=&limit=&search=&export= — requires view_all_complaints
export const getAllComplaints = async (params = {}) => {
  const { data } = await apiClient.get('/complaints', { params });
  return data;
};

// GET /admin/complaints/assigned?skip=&limit=&search=&export= — own assigned complaints, requires view_assigned_complaints
export const getAssignedComplaints = async (params = {}) => {
  const { data } = await apiClient.get('/complaints/assigned', { params });
  return data;
};

// POST /admin/complaints/create — { userID, subject, description, customerName?, customerPhone?, assignedTo? }
export const createComplaint = async (payload) => {
  const { data } = await apiClient.post('/complaints/create', payload);
  return data;
};

// PATCH /admin/complaints/:complaintID/status — { status, resolution? }
export const updateComplaintStatus = async (complaintID, status, resolution) => {
  const { data } = await apiClient.patch(`/complaints/${complaintID}/status`, {
    status,
    resolution,
  });
  return data;
};

// PATCH /admin/complaints/:complaintID/reassign — { newAssignee }
export const reassignComplaint = async (complaintID, newAssignee) => {
  const { data } = await apiClient.patch(`/complaints/${complaintID}/reassign`, {
    newAssignee,
  });
  return data;
};
