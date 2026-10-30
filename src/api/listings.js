import { api } from './client';

export async function fetchListings(filters = {}) {
  const query = new URLSearchParams();
  if (filters.city) query.set('city', filters.city);
  if (filters.types) query.set('types', filters.types);
  if (filters.maxRent) query.set('maxRent', filters.maxRent);
  if (filters.verifiedOnly !== undefined) query.set('verifiedOnly', filters.verifiedOnly);
  if (filters.locality) query.set('locality', filters.locality);
  if (filters.q) query.set('q', filters.q);
  if (filters.sort) query.set('sort', filters.sort);
  if (filters.limit) query.set('limit', filters.limit);
  if (filters.offset) query.set('offset', filters.offset);

  const qs = query.toString();
  const url = qs ? `/api/listings?${qs}` : '/api/listings';
  return await api.get(url);
}

export async function fetchListingById(id) {
  return await api.get(`/api/listings/${id}`);
}

export async function fetchRecommendedListings(params = {}) {
  const query = new URLSearchParams();
  if (params.city && params.city !== 'All') query.set('city', params.city);
  if (params.minRent) query.set('minRent', params.minRent);
  if (params.maxRent) query.set('maxRent', params.maxRent);
  if (params.localities && params.localities.length > 0) {
    query.set('localities', Array.isArray(params.localities) ? params.localities.join(',') : params.localities);
  }

  const qs = query.toString();
  const url = qs ? `/api/listings/recommended?${qs}` : '/api/listings/recommended';
  const res = await api.get(url);
  return res.recommendations || res.data || [];
}

export async function fetchSavedListings() {
  const res = await api.get('/api/me/saved');
  return res.data || [];
}

export async function saveListing(listingId) {
  return await api.post(`/api/me/saved/${listingId}`);
}

export async function unsaveListing(listingId) {
  return await api.delete(`/api/me/saved/${listingId}`);
}
