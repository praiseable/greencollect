import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications');
      const list = Array.isArray(data) ? data : data?.notifications || data?.data || [];
      setNotifications(list);
    } catch (err) {
      setError('Failed to load notifications.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      // ✅ FIX: Was PUT — backend uses PATCH /notifications/:id/read
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      // ✅ FIX: Was PUT — backend uses PATCH /notifications/read-all
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-sm bg-red-500 text-white rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-green-600 hover:underline font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🔔</p>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                n.isRead
                  ? 'bg-white border-gray-100 text-gray-500'
                  : 'bg-green-50 border-green-200 text-gray-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    n.isRead ? 'bg-gray-300' : 'bg-green-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${n.isRead ? 'font-normal' : 'font-semibold'}`}>
                    {n.title}
                  </p>
                  <p className="text-sm mt-0.5 line-clamp-2">{n.body || n.message}</p>
                  <p className="text-xs mt-1 opacity-60">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
