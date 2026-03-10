import { useEffect, useState } from 'react';
import api from '../services/api';

const GATEWAYS = ['jazzcash', 'easypaisa'];

export default function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rechargeForm, setRechargeForm] = useState({ amount: '', gateway: 'jazzcash' });
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeMsg, setRechargeMsg] = useState('');

  const fetchWallet = async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ FIX: Was /payments/history — backend has GET /wallet (balance + recent ledger)
      //         and GET /wallet/ledger (full paginated ledger)
      const [walletRes, ledgerRes] = await Promise.allSettled([
        api.get('/wallet'),
        api.get('/wallet/ledger?page=1&limit=20'),
      ]);

      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data;
        setWallet(d?.wallet || d);
      }
      if (ledgerRes.status === 'fulfilled') {
        const d = ledgerRes.value.data;
        setLedger(Array.isArray(d) ? d : d?.ledger || d?.data || []);
      }
    } catch (err) {
      setError('Failed to load wallet data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleRecharge = async (e) => {
    e.preventDefault();
    const amountPaisa = Math.round(parseFloat(rechargeForm.amount) * 100);
    if (!amountPaisa || amountPaisa < 10000) {
      setRechargeMsg('Minimum recharge is PKR 100.');
      return;
    }
    setRechargeLoading(true);
    setRechargeMsg('');
    try {
      // ✅ FIX: Backend endpoint is POST /wallet/recharge (not /payments/xxx/initiate)
      const { data } = await api.post('/wallet/recharge', {
        amountPaisa,
        gateway: rechargeForm.gateway,
      });
      if (data.paymentUrl) {
        window.open(data.paymentUrl, '_blank');
        setRechargeMsg('Payment page opened. Complete payment there.');
      } else {
        setRechargeMsg('Recharge initiated.');
      }
    } catch (err) {
      setRechargeMsg(
        err.response?.data?.error?.message || 'Failed to initiate recharge.'
      );
    } finally {
      setRechargeLoading(false);
    }
  };

  const balancePKR = wallet?.balance != null
    ? (wallet.balance / 100).toLocaleString('en-PK', { minimumFractionDigits: 0 })
    : '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white">
        <p className="text-sm opacity-80">Available Balance</p>
        <p className="text-4xl font-bold mt-1">PKR {balancePKR}</p>
      </div>

      {/* Recharge Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Add Funds</h2>
        <form onSubmit={handleRecharge} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (PKR)
            </label>
            <input
              type="number"
              min="100"
              step="1"
              placeholder="e.g. 500"
              value={rechargeForm.amount}
              onChange={(e) => setRechargeForm({ ...rechargeForm, amount: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={rechargeForm.gateway}
              onChange={(e) => setRechargeForm({ ...rechargeForm, gateway: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {GATEWAYS.map((g) => (
                <option key={g} value={g}>
                  {g === 'jazzcash' ? 'JazzCash' : 'Easypaisa'}
                </option>
              ))}
            </select>
          </div>
          {rechargeMsg && (
            <p className={`text-sm ${rechargeMsg.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {rechargeMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={rechargeLoading}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:bg-green-400 font-medium"
          >
            {rechargeLoading ? 'Processing…' : 'Proceed to Payment'}
          </button>
        </form>
      </div>

      {/* Ledger */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Transaction History</h2>
        </div>
        {ledger.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {ledger.map((entry) => (
              <li key={entry.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {entry.note || entry.referenceType || 'Transaction'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`font-semibold text-sm ${
                    entry.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {entry.type === 'credit' ? '+' : '-'}PKR{' '}
                  {(entry.amount / 100).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
