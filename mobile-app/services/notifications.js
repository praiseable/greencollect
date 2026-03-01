import api from './api';

export async function getNotifications(page = 1) {
  const res = await api.get('/notifications', { params: { page } });
  return res.data;
}

export async function markNotificationsRead(ids) {
  const res = await api.put('/notifications/mark-read', { ids });
  return res.data;
}
