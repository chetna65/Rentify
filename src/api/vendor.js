import { api } from './client';

export async function fetchVendorListings() {
  const res = await api.get('/api/vendor/listings');
  return res.data || [];
}

export async function submitVendorListing(formData) {
  return await api.post('/api/vendor/listings', formData);
}

export async function resubmitVendorListing(id, formData) {
  return await api.post(`/api/vendor/listings/${id}/resubmit`, formData);
}
