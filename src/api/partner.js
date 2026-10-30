import { api } from './client';

export async function fetchPartnerAssignments() {
  const res = await api.get('/api/partner/assignments');
  return res.data || [];
}

export async function submitInspection(assignmentId, inspectionData) {
  return await api.post(`/api/partner/assignments/${assignmentId}/inspection`, inspectionData);
}
