import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [gateway, setGateway] = useState('JAZZCASH');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    setLoading(true);
    try {
      const [payRes] = await Promise.all([
        api.get('/payments/history'),
      ]);
      setPayments(payRes.data || []);
      // Derive balance from wallet endpoint or total payments
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    if (!topUpAmount || Number(topUpAmount) <= 0) return;
    try {
      const amountPaisa = Number(topUpAmount) * 100;
      if (gateway === 'JAZZCASH') {
        await api.post('/payments/jazzcash/initiate', { amountPaisa, purpose: 'WALLET_TOPUP', phone: '' });
      } else if (gateway === 'EASYPAISA') {
        await api.post('/payments/easypaisa/initiate', { amountPaisa, purpose: 'WALLET_TOPUP', msisdn: '' });
      } else {
        await api.post('/payments/wallet/topup', { amountPaisa });
      }
      setTopUpAmount('');
      fetchWallet();
    } catch {
      /* handle */
    }
  };

  const gatewayLabels = {
    JAZZCASH: '📱 JazzCash',
    EASYPAISA: '📱 Easypaisa',
    WALLET: '💰 Wallet Balance',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Wallet</h1>

      {/* Balance Card */}
      <div className="card p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white mb-8">
        <p className="text-sm opacity-80">Available Balance</p>
        <p className="text-4xl font-bold mt-1">₨ {balance.toLocaleString()}</p>
        <p className="text-xs opacity-60 mt-2">Currency: PKR</p>
      </div>

      {/* Top Up */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Recharge Wallet</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount (PKR)</label>
            <input type="number" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)}
              placeholder="1000" className="input-field w-full" min="1" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Payment Method</label>
            <select value={gateway} onChange={e => setGateway(e.target.value)} className="input-field w-full">
              {Object.entries(gatewayLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleTopUp} className="btn-primary w-full py-2.5 rounded-lg">
              Top Up
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {[500, 1000, 2000, 5000].map(amt => (
            <button key={amt} onClick={() => setTopUpAmount(String(amt))}
              className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 text-gray-600">
              ₨ {amt.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
        {loading ? (
          <p className="text-gray-400 text-center py-6">Loading...</p>
        ) : payments.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No transactions yet</p>
        ) : (
          <div className="divide-y">
            {payments.map((p, i) => (
              <div key={i} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{p.purpose || 'Payment'}</p>
                  <p className="text-xs text-gray-400">{p.gateway} &middot; {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${p.purpose === 'WALLET_TOPUP' ? 'text-green-600' : 'text-red-600'}`}>
                    {p.purpose === 'WALLET_TOPUP' ? '+' : '-'}₨ {(Number(p.amountPaisa) / 100).toLocaleString()}
                  </p>
                  <p className={`text-xs ${p.status === 'COMPLETED' ? 'text-green-500' : p.status === 'PENDING' ? 'text-yellow-500' : 'text-gray-400'}`}>
                    {p.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
