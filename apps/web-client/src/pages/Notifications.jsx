import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiPackage, FiMessageCircle, FiCheck, FiCheckCircle } from 'react-icons/fi';
import api from '../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then((res) => setNotifications(res.data?.data || res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const getIcon = (type) => {
    switch (type) {
      case 'NEW_LISTING': return <FiPackage className="text-blue-500" />;
      case 'NEW_MESSAGE': return <FiMessageCircle className="text-green-500" />;
      case 'ORDER_UPDATE': return <FiCheckCircle className="text-purple-500" />;
      default: return <FiBell className="text-gray-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Stay updated on new listings, messages and orders</p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button onClick={markAllRead} className="btn-secondary text-sm flex items-center gap-1">
            <FiCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse flex gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n.id}
              className={`card p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors
                ${!n.isRead ? 'border-l-4 border-l-primary-500 bg-primary-50/30' : ''}`}
              onClick={() => markAsRead(n.id)}>
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                  {n.title}
                </p>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                {n.listingId && (
                  <Link to={`/listings/${n.listingId}`} className="text-primary-600 text-xs font-medium hover:underline mt-1 inline-block"
                    onClick={(e) => e.stopPropagation()}>
                    View Listing →
                  </Link>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              {!n.isRead && (
                <div className="w-2.5 h-2.5 bg-primary-500 rounded-full flex-shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <FiBell size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">You'll be notified when new listings match your interests</p>
        </div>
      )}
    </div>
  );
}
