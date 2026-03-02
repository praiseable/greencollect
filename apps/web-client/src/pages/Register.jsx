import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useAuthStore from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '', role: 'CUSTOMER',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone.startsWith('+92') ? form.phone : `+92${form.phone}`,
        password: form.password,
        role: form.role,
      });
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch {
      toast.error('Registration failed. Please try again.');
    }
  };

  const update = (key, val) => setForm({ ...form, [key]: val });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-green-50 px-4 py-12">
      <div className="card max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-xl mb-4">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Pakistan's largest recyclable marketplace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)}
                className="input-field" placeholder="Ali" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)}
                className="input-field" placeholder="Khan" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 text-sm text-gray-600 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">+92</span>
              <input type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)}
                className="input-field !rounded-l-none" placeholder="3001234567" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)}
              className="input-field" placeholder="your@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
            <select value={form.role} onChange={(e) => update('role', e.target.value)} className="input-field">
              <option value="CUSTOMER">Home / Shop Owner (Customer)</option>
              <option value="DEALER">Scrap Dealer</option>
              <option value="FRANCHISE_DEALER">Franchise Dealer</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" required value={form.password} onChange={(e) => update('password', e.target.value)}
                className="input-field" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
              <input type="password" required value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)}
                className="input-field" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
