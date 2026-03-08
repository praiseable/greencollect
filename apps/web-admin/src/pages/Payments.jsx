import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Payments() {
  const [gateways, setGateways] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('gateways');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gwRes, payRes] = await Promise.all([
        api.get('/admin/payment-gateways').catch(() => ({ data: { gateways: [] } })),
        api.get('/admin/payments').catch(() => ({ data: { payments: [] } })),
      ]);
      setGateways(gwRes.data.gateways || gwRes.data || []);
      setPayments(payRes.data.payments || payRes.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const toggleGateway = async (gw) => {
    try {
      await api.put(`/admin/payment-gateways/${gw.id}/toggle`);
      fetchData();
    } catch { /* ignore */ }
  };

  const defaultGateways = [
    { id: 'JAZZCASH', name: 'JazzCash', type: 'Mobile Wallet', country: 'PK', status: 'Active', logo: '📱' },
    { id: 'EASYPAISA', name: 'Easypaisa', type: 'Mobile Wallet', country: 'PK', status: 'Active', logo: '📱' },
    { id: 'STRIPE', name: 'Stripe', type: 'International Cards', country: 'Global', status: 'Active', logo: '💳' },
    { id: 'BANK_TRANSFER', name: 'Bank Transfer', type: 'Manual', country: 'PK', status: 'Active', logo: '🏦' },
    { id: 'WALLET', name: 'Platform Wallet', type: 'Internal', country: 'All', status: 'Active', logo: '💰' },
  ];

  const displayGateways = gateways.length > 0 ? gateways : defaultGateways;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Configuration</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[{ key: 'gateways', label: 'Payment Gateways' }, { key: 'history', label: 'Payment History' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : tab === 'gateways' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayGateways.map(gw => (
            <div key={gw.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{gw.logo || '💳'}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{gw.name || gw.displayName}</h3>
                  <p className="text-sm text-gray-500">{gw.type || gw.gateway}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Country: {gw.country || gw.countryId || 'PK'}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  (gw.isActive !== false && gw.status !== 'Inactive') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {gw.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button onClick={() => toggleGateway(gw)}
                className="mt-4 w-full text-sm text-center py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
                {gw.isActive !== false ? 'Disable Gateway' : 'Enable Gateway'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-xs font-mono">{p.id?.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm">{p.user?.firstName || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{p.gateway}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₨ {((Number(p.amountPaisa) || 0) / 100).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{p.purpose}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      p.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <p className="text-center py-8 text-gray-400">No payment records</p>}
        </div>
      )}
    </div>
  );
}
