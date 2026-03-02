import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiSave } from 'react-icons/fi';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function Profile() {
  const { user, fetchProfile } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', address: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const update = (key, val) => setForm({ ...form, [key]: val });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/profile', form);
      await fetchProfile();
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your personal information</p>

      {/* Profile Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 text-2xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <span className="inline-block bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full mt-1 font-medium">
              {user?.role?.name || user?.roleName || 'Member'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiUser className="inline mr-1" size={14} /> First Name
            </label>
            <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
              className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiMail className="inline mr-1" size={14} /> Email
          </label>
          <input type="email" value={user?.email || ''} disabled
            className="input-field bg-gray-50 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiPhone className="inline mr-1" size={14} /> Phone
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-gray-600 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">+92</span>
            <input type="tel" value={form.phone?.replace('+92', '')} onChange={(e) => update('phone', `+92${e.target.value}`)}
              className="input-field !rounded-l-none" placeholder="3001234567" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiMapPin className="inline mr-1" size={14} /> Address
          </label>
          <textarea rows={2} value={form.address} onChange={(e) => update('address', e.target.value)}
            className="input-field resize-none" placeholder="Your address in Pakistan" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <FiSave size={16} /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
