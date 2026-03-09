import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTransactions } from '../services/api';

const TABS = [
  { key: '', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function TransactionsApp() {
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTransactions({ status: tab || undefined, limit: 50 })
      .then((res) => {
        const d = res.data;
        setTransactions(d?.transactions ?? d?.data ?? (Array.isArray(d) ? d : []));
      })
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [tab]);

  const priceStr = (t) => t.offeredPriceFormatted || t.finalPriceFormatted || (t.offeredPricePaisa != null ? `₨ ${(Number(t.offeredPricePaisa) / 100).toLocaleString()}` : '—');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">No transactions in this tab.</div>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => (
            <Link
              key={t.id}
              to={`/marketplace/transactions/${t.id}`}
              className="card flex items-center justify-between p-4 transition hover:shadow-md"
            >
              <div>
                <p className="font-medium text-gray-900">{t.listing?.title || 'Listing'}</p>
                <p className="text-sm text-gray-500">
                  {t.buyer?.firstName} {t.buyer?.lastName} • {priceStr(t)}
                </p>
              </div>
              <span className={`badge ${t.status === 'COMPLETED' ? 'badge-green' : t.status === 'CANCELLED' ? 'badge-red' : 'badge-yellow'}`}>
                {t.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
