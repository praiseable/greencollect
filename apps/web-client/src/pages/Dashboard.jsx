import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState([]);
  // ✅ FIX: Was /orders/my which doesn't exist — backend has /transactions
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        // ✅ FIX: /listings/my — correct backend endpoint
        const [listingsRes, txRes] = await Promise.allSettled([
          api.get('/listings/my'),
          api.get('/transactions'),
        ]);

        if (listingsRes.status === 'fulfilled') {
          const d = listingsRes.value.data;
          setListings(Array.isArray(d) ? d : d?.listings || d?.data || []);
        }
        if (txRes.status === 'fulfilled') {
          const d = txRes.value.data;
          setTransactions(Array.isArray(d) ? d : d?.transactions || d?.data || []);
        }
      } catch (err) {
        setError('Failed to load dashboard data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleDelete = async (listingId) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await api.delete(`/listings/${listingId}`);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete listing.');
    }
  };

  const handleDeactivate = async (listingId, isActive) => {
    try {
      const endpoint = isActive
        ? `/listings/${listingId}/deactivate`
        : `/listings/${listingId}/reactivate`;
      await api.patch(endpoint);
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, status: isActive ? 'inactive' : 'active' } : l
        )
      );
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update listing.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.firstName || user?.displayName || 'User'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email || user?.phone}</p>
        </div>
        <Link
          to="/create-listing"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
        >
          + New Listing
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Listings" value={listings.length} color="green" />
        <StatCard
          label="Active"
          value={listings.filter((l) => l.status === 'active').length}
          color="blue"
        />
        <StatCard label="Transactions" value={transactions.length} color="purple" />
        <StatCard
          label="Completed Deals"
          value={transactions.filter((t) => t.status === 'completed' || t.status === 'finalized').length}
          color="orange"
        />
      </div>

      {/* My Listings */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">My Listings</h2>
        {listings.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 mb-3">No listings yet</p>
            <Link to="/create-listing" className="text-green-600 font-medium hover:underline">
              Create your first listing →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{listing.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {listing.category?.name || '—'} · {listing.cityName || listing.city || '—'}
                    </p>
                    <p className="text-green-600 font-semibold mt-1">
                      {listing.priceFormatted ||
                        (listing.pricePaisa
                          ? `PKR ${(listing.pricePaisa / 100).toLocaleString()}`
                          : '—')}
                    </p>
                  </div>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                      listing.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : listing.status === 'sold'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {listing.status}
                  </span>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <Link
                    to={`/listings/${listing.id}`}
                    className="flex-1 text-center text-sm text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDeactivate(listing.id, listing.status === 'active')}
                    className="flex-1 text-center text-sm text-yellow-600 hover:underline"
                  >
                    {listing.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="flex-1 text-center text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Transactions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Listing</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[150px]">
                      {tx.listing?.title || tx.listingId?.slice(0, 8) + '…'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tx.sellerId === user?.id ? 'Seller' : 'Buyer'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          tx.status === 'completed' || tx.status === 'finalized'
                            ? 'bg-green-100 text-green-700'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {tx.agreedPrice
                        ? `PKR ${(tx.agreedPrice / 100).toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
