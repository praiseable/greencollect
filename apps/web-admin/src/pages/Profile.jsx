import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit2, FiCreditCard, FiMap, FiTruck, FiStar, FiFileText, FiPieChart, FiMessageCircle, FiSettings } from 'react-icons/fi';
import { getMe } from '../services/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="card py-12 text-center text-gray-500">Failed to load profile.</div>
    );
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.displayName || 'User';
  const balance = user.wallet?.balancePaisa != null ? Number(user.wallet.balancePaisa) / 100 : 0;

  const menuItems = [
    { to: '/marketplace', icon: FiMap, label: 'Marketplace Home' },
    { to: '/marketplace/create', icon: FiEdit2, label: 'Post a Listing' },
    { to: '/listings', icon: FiFileText, label: 'All Listings (Admin)' },
    { to: '/marketplace/chat', icon: FiMessageCircle, label: 'Chat Inbox' },
    { to: '/marketplace/transactions', icon: FiFileText, label: 'Transactions' },
    { to: '/marketplace/wallet', icon: FiCreditCard, label: 'Wallet' },
    { to: '/territories', icon: FiMap, label: 'My Territory' },
    { to: '/collections', icon: FiTruck, label: 'Collections' },
    { to: '/analytics', icon: FiPieChart, label: 'Analytics' },
    { to: '/subscriptions', icon: FiCreditCard, label: 'Subscription' },
    { to: '/notifications', icon: FiMessageCircle, label: 'Notifications' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <div className="card">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">
            {name.charAt(0)}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
            <p className="text-sm text-gray-500">{user.role?.name || user.role || 'Admin'}</p>
            {user.email && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <FiMail size={14} />
                {user.email}
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiPhone size={14} />
                {user.phone}
              </div>
            )}
            {user.geoZone?.name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiMapPin size={14} />
                {user.geoZone.name}, Pakistan
              </div>
            )}
            {user.wallet && (
              <p className="mt-2 text-lg font-bold text-green-600">₨ {balance.toLocaleString('en-PK')} balance</p>
            )}
          </div>
        </div>
      </div>
      <div className="card">
        <h3 className="mb-4 font-semibold text-gray-900">Quick links (same as mobile app)</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 text-gray-700 hover:bg-gray-50"
            >
              <item.icon size={18} className="text-green-600" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
