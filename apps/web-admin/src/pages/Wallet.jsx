import { useEffect, useState } from 'react';
import { getMe } from '../services/api';

export default function Wallet() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const balancePaisa = user?.wallet?.balancePaisa != null ? Number(user.wallet.balancePaisa) : 0;
  const balance = balancePaisa / 100;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
      <div className="card rounded-2xl bg-gradient-to-br from-green-600 to-green-700 p-8 text-white shadow-lg">
        <p className="text-sm text-green-100">Available Balance</p>
        <p className="mt-2 text-4xl font-bold">₨ {balance.toLocaleString('en-PK')}</p>
        <p className="mt-1 text-green-100">{user?.firstName} {user?.lastName}</p>
        <p className="mt-4 text-sm text-green-200">
          To add balance, contact platform admin or use Balance Management (admin) to credit your account.
        </p>
      </div>
    </div>
  );
}
