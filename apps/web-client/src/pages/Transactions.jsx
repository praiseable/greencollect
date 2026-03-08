import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const statusColors = {
  OFFERED: 'bg-blue-100 text-blue-800',
  NEGOTIATING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  FINALIZED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [tab]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (tab === 'active') params.status = 'NEGOTIATING';
      if (tab === 'completed') params.status = 'FINALIZED';
      if (tab === 'cancelled') params.status = 'REJECTED';
      const { data } = await api.get('/transactions', { params });
      setTransactions(data.transactions || []);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Transactions</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading transactions...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No transactions yet</p>
          <Link to="/listings" className="text-primary-600 mt-2 inline-block hover:underline">Browse Listings →</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map(tx => (
            <div key={tx.id} className="card p-5 flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                {tx.listing?.images?.[0]?.url ? (
                  <img src={tx.listing.images[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{tx.listing?.title || 'Listing'}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[tx.status] || 'bg-gray-100'}`}>
                    {tx.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Buyer: {tx.buyer?.firstName} {tx.buyer?.lastName} &middot; Offered: {tx.offeredPriceFormatted || `₨ ${tx.offeredPricePaisa}`}
                  {tx.finalPriceFormatted && <> &middot; Final: <strong>{tx.finalPriceFormatted}</strong></>}
                </p>
                <p className="text-xs text-gray-400 mt-1">{new Date(tx.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-2">
                {tx.status === 'FINALIZED' && (
                  <button className="btn-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-emerald-100">
                    View Bond
                  </button>
                )}
                {tx.status === 'NEGOTIATING' && (
                  <button className="btn-sm bg-primary-50 text-primary-700 border border-primary-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-primary-100">
                    Negotiate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
