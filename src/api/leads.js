import { apiClient } from './client';

// GET /admin/leads — ?status=&assignedTo=&skip=&limit=&search=&export=, requires view_all_leads
export const getAllLeads = async (params = {}) => {
  const { data } = await apiClient.get('/leads', { params });
  return data;
};

// GET /admin/leads/assigned?skip=&limit=&search=&export= — own assigned leads, requires view_assigned_leads
export const getAssignedLeads = async (params = {}) => {
  const { data } = await apiClient.get('/leads/assigned', { params });
  return data;
};

// POST /admin/leads/create — { fullName, phoneNumber, source, assignedTo? }
export const createLead = async (payload) => {
  const { data } = await apiClient.post('/leads/create', payload);
  return data;
};

// POST /admin/leads/bulk-upload — multipart file upload (.xlsx/.xls/.csv)
export const bulkUploadLeads = async (file, source) => {
  const formData = new FormData();
  formData.append('file', file);
  if (source) formData.append('source', source);
  const { data } = await apiClient.post('/leads/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// PATCH /admin/leads/:leadID/status — { status, phoneNumber? }
export const updateLeadStatus = async (leadID, status, phoneNumber) => {
  const { data } = await apiClient.patch(`/leads/${leadID}/status`, {
    status,
    phoneNumber,
  });
  return data;
};

// PATCH /admin/leads/:leadID/reassign — { newAssignee }
export const reassignLead = async (leadID, newAssignee) => {
  const { data } = await apiClient.patch(`/leads/${leadID}/reassign`, {
    newAssignee,
  });
  return data;
};
