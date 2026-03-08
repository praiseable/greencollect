import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiSearch, FiDollarSign, FiPlus, FiMinus, FiUser, FiTrendingUp, FiLock, FiUnlock } from 'react-icons/fi';

// Mock data — in production this reads from /api/admin/wallets
const MOCK_DEALERS = [
  { id: 'u2', name: 'Bilal Traders', role: 'DEALER', phone: '03219876543', area: 'Korangi, Karachi', balance: 12500, status: 'ACTIVE' },
  { id: 'u3', name: 'City Franchise Karachi', role: 'FRANCHISE', phone: '03335551234', area: 'Karachi (City)', balance: 45000, status: 'ACTIVE' },
  { id: 'u4', name: 'National Recyclers', role: 'WHOLESALE', phone: '03451112233', area: 'All Zones', balance: 150000, status: 'ACTIVE' },
  { id: 'u5', name: 'Usman BaraKahu', role: 'DEALER', phone: '03001110001', area: 'Bara Kahu, Islamabad', balance: 5000, status: 'ACTIVE' },
  { id: 'u6', name: 'Tariq G-6 Dealer', role: 'DEALER', phone: '03001110002', area: 'G-6, Islamabad', balance: 8000, status: 'ACTIVE' },
  { id: 'u7', name: 'Kashif G-8 Dealer', role: 'DEALER', phone: '03001110003', area: 'G-8, Islamabad', balance: 0, status: 'LOCKED' },
  { id: 'u8', name: 'Zubair ISB Franchise', role: 'FRANCHISE', phone: '03001110004', area: 'Islamabad (City)', balance: 35000, status: 'ACTIVE' },
];

export default function BalanceManagement() {
  const [dealers, setDealers] = useState(MOCK_DEALERS);
  const [search, setSearch] = useState('');
  const [rechargeModal, setRechargeModal] = useState(null);
  const [deductModal, setDeductModal] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = dealers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search) ||
    d.area.toLowerCase().includes(search.toLowerCase())
  );

  const totalBalance = dealers.reduce((sum, d) => sum + d.balance, 0);
  const activeCount = dealers.filter(d => d.balance > 0).length;
  const lockedCount = dealers.filter(d => d.balance === 0).length;

  const handleRecharge = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setDealers(prev => prev.map(d =>
      d.id === rechargeModal.id
        ? { ...d, balance: d.balance + parseInt(amount), status: 'ACTIVE' }
        : d
    ));
    toast.success(`✅ ₨${parseInt(amount).toLocaleString()} added to ${rechargeModal.name}'s wallet`);
    setRechargeModal(null);
    setAmount('');
    setNote('');
    setLoading(false);
  };

  const handleDeduct = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setDealers(prev => prev.map(d => {
      if (d.id === deductModal.id) {
        const newBal = Math.max(0, d.balance - parseInt(amount));
        return { ...d, balance: newBal, status: newBal > 0 ? 'ACTIVE' : 'LOCKED' };
      }
      return d;
    }));
    toast.success(`💸 ₨${parseInt(amount).toLocaleString()} deducted from ${deductModal.name}'s wallet`);
    setDeductModal(null);
    setAmount('');
    setNote('');
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Balance Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage dealer/franchise wallet balances — your primary revenue source
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<FiDollarSign />} label="Total Platform Balance" value={`₨ ${totalBalance.toLocaleString()}`} color="green" />
        <StatCard icon={<FiUser />} label="Active Dealers" value={activeCount} color="blue" />
        <StatCard icon={<FiLock />} label="Locked (₨0)" value={lockedCount} color="red" />
        <StatCard icon={<FiTrendingUp />} label="Total Pro Users" value={dealers.length} color="purple" />
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by name, phone, area..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">Dealer</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Area</th>
                <th className="px-6 py-3 font-medium">Balance</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(d => (
                <tr key={d.id} className={`hover:bg-gray-50 ${d.balance === 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.phone}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      d.role === 'DEALER' ? 'bg-blue-100 text-blue-700' :
                      d.role === 'FRANCHISE' ? 'bg-purple-100 text-purple-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {d.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">{d.area}</td>
                  <td className="px-6 py-4">
                    <span className={`text-lg font-bold ${d.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₨ {d.balance.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {d.balance > 0 ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                        <FiUnlock size={12} /> ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                        <FiLock size={12} /> LOCKED
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setRechargeModal(d); setAmount(''); setNote(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition"
                      >
                        <FiPlus size={12} /> Add
                      </button>
                      <button
                        onClick={() => { setDeductModal(d); setAmount(''); setNote(''); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition"
                      >
                        <FiMinus size={12} /> Deduct
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FiDollarSign className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-amber-800 text-sm">💰 Business Model</p>
            <p className="text-xs text-amber-700 mt-1">
              Dealers pay you to get balance added to their account. When balance hits ₨0, their app features
              are automatically locked — they can only see the "Account Locked" screen until you recharge them.
              <strong> This is your primary revenue stream.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      {rechargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <FiPlus className="text-green-600" /> Add Balance
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Adding balance to: <strong>{rechargeModal.name}</strong> ({rechargeModal.area})
            </p>
            <p className="text-xs text-gray-400 mb-2">Current Balance: ₨ {rechargeModal.balance.toLocaleString()}</p>

            <div className="space-y-4">
              <div>
                <label className="label">Amount (₨) *</label>
                <input className="input text-xl font-bold" type="number" min="0"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0" autoFocus />
                <div className="flex gap-2 mt-2">
                  {[1000, 2000, 5000, 10000, 25000].map(a => (
                    <button key={a} onClick={() => setAmount(a.toString())}
                      className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 hover:bg-green-200">
                      ₨{a.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Payment Reference / Note</label>
                <input className="input" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. JazzCash payment, Receipt #123" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setRechargeModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleRecharge} disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Processing...' : `Add ₨${parseInt(amount || '0').toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduct Modal */}
      {deductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <FiMinus className="text-red-600" /> Deduct Balance
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Deducting from: <strong>{deductModal.name}</strong> ({deductModal.area})
            </p>
            <p className="text-xs text-gray-400 mb-2">Current Balance: ₨ {deductModal.balance.toLocaleString()}</p>

            {deductModal.balance === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-red-700">⚠️ This dealer already has ₨0 balance and is LOCKED.</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Amount (₨) *</label>
                <input className="input text-xl font-bold" type="number" min="0"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder="0" autoFocus />
              </div>
              <div>
                <label className="label">Reason *</label>
                <input className="input" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Service fee, Platform charge" />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
              <p className="text-xs text-amber-700">
                ⚠️ If balance reaches ₨0 after deduction, the dealer's app will be <strong>automatically locked</strong>.
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeductModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDeduct} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {loading ? 'Processing...' : `Deduct ₨${parseInt(amount || '0').toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
