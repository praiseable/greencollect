import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiBell, FiCheck, FiCheckCircle, FiEye, FiExternalLink, FiTrash2 } from 'react-icons/fi';
import { getNotifications, markNotificationRead, markAllRead } from '../services/api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL | UNREAD | READ
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => { fetchNotifs(); }, [page, filter]);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filter === 'UNREAD') params.unread = true;
      if (filter === 'READ') params.read = true;
      const res = await getNotifications(params);
      const list = res.data?.data ?? res.data?.notifications ?? res.data;
      setNotifications(Array.isArray(list) ? list : []);
      setTotal(res.data?.total ?? 0);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      fetchNotifs();
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All marked as read');
      fetchNotifs();
    } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalPages = Math.ceil(total / limit);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'NEW_LISTING': return '📦';
      case 'ORDER': return '🛒';
      case 'SYSTEM': return '⚙️';
      case 'ALERT': return '⚠️';
      default: return '🔔';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary">
            <FiCheckCircle size={16} /> Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['ALL', 'UNREAD', 'READ'].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
        ) : notifications.length === 0 ? (
          <div className="card text-center py-12">
            <FiBell size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400">No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start gap-4 transition hover:shadow-md ${!n.isRead ? 'bg-primary-50/30 border-primary-100' : ''}`}
            >
              <div className="text-2xl mt-0.5">{getTypeIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`text-sm font-semibold ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    {n.listing && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs">
                        <p className="font-medium text-gray-900">{n.listing.title}</p>
                        <p className="text-gray-500">
                          {n.listing.category?.name} • ₨ {(n.listing.price || 0).toLocaleString()} • {n.listing.geoZone?.name || ''}
                        </p>
                        <p className="text-gray-400 mt-1">
                          Posted by {n.listing.seller?.firstName} {n.listing.seller?.lastName} ({n.listing.seller?.phone || ''})
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.isRead && (
                      <button onClick={() => handleMarkRead(n.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600" title="Mark read">
                        <FiCheck size={14} />
                      </button>
                    )}
                    {n.actionUrl && (
                      <a href={n.actionUrl} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600" title="View">
                        <FiExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  {new Date(n.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn-secondary text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
