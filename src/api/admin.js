import { api } from './client';

export async function fetchQueue(status = 'pending', limit = 50, offset = 0) {
  const res = await api.get(`/api/admin/queue?status=${status}&limit=${limit}&offset=${offset}`);
  return res.data || { total: 0, listings: [] };
}

export async function fetchAdminListingDetails(listingId) {
  const res = await api.get(`/api/admin/listings/${listingId}`);
  return res.data || res;
}

export async function assignPartner(listingId, { partnerId, scheduledFor = null, notes = null }) {
  return await api.patch(`/api/admin/listings/${listingId}/assign`, {
    partnerId,
    scheduledFor,
    notes,
  });
}

export async function decideListing(listingId, { decision, reason = null, flagCategory = null }) {
  return await api.patch(`/api/admin/listings/${listingId}/decision`, {
    decision,
    reason,
    flagCategory,
  });
}

export async function fetchPartners() {
  const res = await api.get('/api/admin/partners');
  return res.data || [];
}

export async function fetchAuditLogs(listingId = null, limit = 50, offset = 0) {
  const url = listingId
    ? `/api/admin/audit?listingId=${listingId}&limit=${limit}&offset=${offset}`
    : `/api/admin/audit?limit=${limit}&offset=${offset}`;
  const res = await api.get(url);
  return res.data || { total: 0, logs: [] };
}
