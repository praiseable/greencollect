import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Countries() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCountries(); }, []);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/countries');
      setCountries(data.countries || data || []);
    } catch { setCountries([]); }
    finally { setLoading(false); }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/admin/countries/${c.id}/toggle`);
      fetchCountries();
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Countries & Regions</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading countries...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Native Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timezone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {countries.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-bold">{c.id}</td>
                  <td className="px-6 py-4 text-sm font-medium">{c.name}</td>
                  <td className="px-6 py-4 text-sm" dir="rtl">{c.nativeName}</td>
                  <td className="px-6 py-4 text-sm font-mono">{c.phoneCode}</td>
                  <td className="px-6 py-4 text-sm">{c.defaultCurrencyId}</td>
                  <td className="px-6 py-4 text-sm">{c.defaultLanguageId}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.timezone}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {c.isDefault && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Default</span>}
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleActive(c)} className="text-sm text-blue-600 hover:underline">
                      {c.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {countries.length === 0 && <p className="text-center py-8 text-gray-400">No countries configured</p>}
        </div>
      )}
    </div>
  );
}
