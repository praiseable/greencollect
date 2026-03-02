import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiDollarSign, FiRefreshCw } from 'react-icons/fi';
import { getCurrencies, setExchangeRate } from '../services/api';

export default function Currencies() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editRate, setEditRate] = useState('');

  useEffect(() => { fetchCurrencies(); }, []);

  const fetchCurrencies = async () => {
    setLoading(true);
    try {
      const res = await getCurrencies();
      setCurrencies(res.data?.currencies || res.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSaveRate = async (currencyId) => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate <= 0) { toast.error('Invalid rate'); return; }
    try {
      await setExchangeRate({ currencyId, rate });
      toast.success('Exchange rate updated');
      setEditId(null);
      fetchCurrencies();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Currencies</h1>
        <p className="text-sm text-gray-500 mt-1">Manage supported currencies & exchange rates (Primary: PKR ₨)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : currencies.length === 0 ? (
          <p className="col-span-full text-center text-gray-400 py-12">No currencies configured</p>
        ) : (
          currencies.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 font-bold text-lg">
                  {c.symbol}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-xs text-gray-500">{c.code}</p>
                </div>
                {c.isDefault && <span className="badge-green ml-auto">Default</span>}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Rate to USD</p>
                  {editId === c.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        className="input w-28 text-sm"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => handleSaveRate(c.id)} className="btn-primary text-xs py-1 px-3">Save</button>
                      <button onClick={() => setEditId(null)} className="btn-secondary text-xs py-1 px-3">✕</button>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-gray-900">{c.exchangeRateToUSD || '—'}</p>
                  )}
                </div>
                {editId !== c.id && (
                  <button
                    onClick={() => { setEditId(c.id); setEditRate(c.exchangeRateToUSD?.toString() || ''); }}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    <FiRefreshCw size={12} /> Update
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
