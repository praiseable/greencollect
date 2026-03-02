import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiPackage, FiDollarSign, FiEye, FiEdit, FiTrash2, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalListings: 0, totalViews: 0, totalEarnings: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [listingsRes, ordersRes] = await Promise.all([
        api.get('/listings/my').catch(() => ({ data: [] })),
        api.get('/orders/my').catch(() => ({ data: [] })),
      ]);

      const myListings = listingsRes.data?.data || listingsRes.data || [];
      const myOrders = ordersRes.data?.data || ordersRes.data || [];
      setListings(myListings);
      setOrders(myOrders);

      setStats({
        totalListings: myListings.length,
        totalViews: myListings.reduce((sum, l) => sum + (l.viewCount || 0), 0),
        totalEarnings: myOrders.filter((o) => o.status === 'COMPLETED').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        pendingOrders: myOrders.filter((o) => o.status === 'PENDING').length,
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const deleteListing = async (id) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await api.delete(`/listings/${id}`);
      toast.success('Listing deleted');
      setListings(listings.filter((l) => l.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const statCards = [
    { label: 'My Listings', value: stats.totalListings, icon: <FiPackage />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Views', value: stats.totalViews, icon: <FiEye />, color: 'text-green-600 bg-green-50' },
    { label: 'Earnings (₨)', value: `₨ ${stats.totalEarnings.toLocaleString()}`, icon: <FiDollarSign />, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Pending Orders', value: stats.pendingOrders, icon: <FiClock />, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.firstName}! Manage your listings and orders.
          </p>
        </div>
        <Link to="/create-listing" className="btn-primary flex items-center gap-2">
          <FiPlus size={16} /> New Listing
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-6 max-w-xs">
        {['listings', 'orders'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-colors
              ${activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Listings Tab */}
      {activeTab === 'listings' && (
        <div>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="card p-4 animate-pulse flex gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="space-y-3">
              {listings.map((listing) => (
                <div key={listing.id} className="card p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {listing.images?.[0]?.url ? (
                      <img src={listing.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/listings/${listing.id}`} className="font-medium text-gray-900 hover:text-primary-600 truncate block">
                      {listing.title}
                    </Link>
                    <div className="text-sm text-gray-500 mt-1">
                      ₨ {Number(listing.pricePaisa || 0).toLocaleString()} · {listing.quantity} {listing.unitName || 'units'} · {listing.viewCount || 0} views
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium
                      ${listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        listing.status === 'SOLD' ? 'bg-gray-100 text-gray-600' :
                        'bg-yellow-100 text-yellow-700'}`}>
                      {listing.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Link to={`/edit-listing/${listing.id}`} className="p-2 text-gray-400 hover:text-blue-600">
                      <FiEdit size={16} />
                    </Link>
                    <button onClick={() => deleteListing(listing.id)} className="p-2 text-gray-400 hover:text-red-600">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium">No listings yet</p>
              <Link to="/create-listing" className="btn-primary mt-4 inline-block">Create Your First Listing</Link>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Order #{order.id?.slice(-8)}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {order.listing?.title || 'N/A'} · ₨ {Number(order.totalAmount || 0).toLocaleString()}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium
                      ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">🧾</p>
              <p className="font-medium">No orders yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
