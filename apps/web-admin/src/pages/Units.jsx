import { useState, useEffect } from 'react';
import api from '../services/api';

const unitTypes = ['WEIGHT', 'VOLUME', 'COUNT', 'LENGTH', 'AREA', 'OTHER'];

export default function Units() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slug: '', type: 'WEIGHT', nameEn: '', abbrEn: '', nameUr: '', abbrUr: '' });

  useEffect(() => { fetchUnits(); }, []);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/units');
      setUnits(data.units || data || []);
    } catch { setUnits([]); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/units', form);
      setShowForm(false);
      setForm({ slug: '', type: 'WEIGHT', nameEn: '', abbrEn: '', nameUr: '', abbrUr: '' });
      fetchUnits();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add unit');
    }
  };

  const toggleActive = async (unit) => {
    try {
      await api.put(`/admin/units/${unit.id}/toggle`);
      fetchUnits();
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Units of Measurement</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
          {showForm ? 'Cancel' : '+ Add Unit'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-6 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})}
              placeholder="kg" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {unitTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name (English)</label>
            <input value={form.nameEn} onChange={e => setForm({...form, nameEn: e.target.value})}
              placeholder="Kilogram" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation (EN)</label>
            <input value={form.abbrEn} onChange={e => setForm({...form, abbrEn: e.target.value})}
              placeholder="kg" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name (Urdu)</label>
            <input value={form.nameUr} onChange={e => setForm({...form, nameUr: e.target.value})}
              placeholder="کلوگرام" className="w-full border rounded-lg px-3 py-2 text-sm" dir="rtl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation (UR)</label>
            <input value={form.abbrUr} onChange={e => setForm({...form, abbrUr: e.target.value})}
              placeholder="کلو" className="w-full border rounded-lg px-3 py-2 text-sm" dir="rtl" />
          </div>
          <div className="col-span-3">
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Save Unit
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading units...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (EN)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name (UR)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {units.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-semibold">{u.slug}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{u.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{u.translations?.find(t => t.languageId === 'en')?.name || u.slug}</td>
                  <td className="px-6 py-4 text-sm" dir="rtl">{u.translations?.find(t => t.languageId === 'ur')?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {u.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(u)} className="text-sm text-blue-600 hover:underline">
                      {u.isActive !== false ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {units.length === 0 && <p className="text-center py-8 text-gray-400">No units configured</p>}
        </div>
      )}
    </div>
  );
}
