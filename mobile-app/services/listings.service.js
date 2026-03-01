import api from './api';

export async function postListing(formData) {
  const res = await api.post('/listings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getMyListings(params = {}) {
  const res = await api.get('/listings/my', { params });
  return res.data;
}

export async function getNearbyListings(lat, lng, radius = 5, garbageType = null) {
  const params = { lat, lng, radius };
  if (garbageType) params.garbage_type = garbageType;
  const res = await api.get('/listings/nearby', { params });
  return res.data.listings;
}

export async function getListingDetails(id) {
  const res = await api.get(`/listings/${id}`);
  return res.data.listing;
}

export async function acceptListing(id) {
  const res = await api.put(`/listings/${id}/accept`);
  return res.data;
}

export async function collectListing(id, data) {
  const res = await api.put(`/listings/${id}/collect`, data);
  return res.data;
}

export async function completePayment(id, data) {
  const res = await api.put(`/listings/${id}/complete-payment`, data);
  return res.data;
}
