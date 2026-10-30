import { api } from './client';

export async function submitFeedback(listingId, { rating, comment = null }) {
  return await api.post(`/api/listings/${listingId}/feedback`, {
    rating: Number(rating),
    comment,
  });
}
