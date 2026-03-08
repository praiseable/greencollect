import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Languages() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', nativeName: '', direction: 'LTR', flagEmoji: '' });

  useEffect(() => { fetchLanguages(); }, []);

  const fetchLanguages = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/languages');
      setLanguages(data.languages || data || []);
    } catch { setLanguages([]); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/languages', form);
      setShowForm(false);
      setForm({ id: '', name: '', nativeName: '', direction: 'LTR', flagEmoji: '' });
      fetchLanguages();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add language');
    }
  };

  const toggleActive = async (lang) => {
    try {
      await api.put(`/admin/languages/${lang.id}/toggle`);
      fetchLanguages();
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Languages</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          {showForm ? 'Cancel' : '+ Add Language'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language Code (BCP 47)</label>
            <input value={form.id} onChange={e => setForm({...form, id: e.target.value})}
              placeholder="e.g. ur, en, ar" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Urdu" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Native Name</label>
            <input value={form.nativeName} onChange={e => setForm({...form, nativeName: e.target.value})}
              placeholder="اردو" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
            <select value={form.direction} onChange={e => setForm({...form, direction: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="LTR">LTR (Left to Right)</option>
              <option value="RTL">RTL (Right to Left)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flag Emoji</label>
            <input value={form.flagEmoji} onChange={e => setForm({...form, flagEmoji: e.target.value})}
              placeholder="🇵🇰" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Save Language
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading languages...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Native</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flag</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {languages.map(lang => (
                <tr key={lang.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-semibold">{lang.id}</td>
                  <td className="px-6 py-4 text-sm">{lang.name}</td>
                  <td className="px-6 py-4 text-sm">{lang.nativeName}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${lang.direction === 'RTL' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {lang.direction}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xl">{lang.flagEmoji || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${lang.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {lang.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(lang)}
                      className="text-sm text-blue-600 hover:underline">
                      {lang.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {languages.length === 0 && <p className="text-center py-8 text-gray-400">No languages configured</p>}
        </div>
      )}
    </div>
  );
}
