import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiMapPin, FiFilter, FiGlobe } from 'react-icons/fi';
import { getGeoZones, getCities } from '../services/api';

export default function GeoZones() {
  const [zones, setZones] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => { fetchData(); }, [cityFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (cityFilter) params.cityId = cityFilter;
      const [zRes, cRes] = await Promise.all([getGeoZones(params), getCities()]);
      setZones(zRes.data?.geoZones || zRes.data || []);
      setCities(cRes.data?.cities || cRes.data || []);
    } catch { toast.error('Failed to load geo zones'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geo Zones</h1>
          <p className="text-sm text-gray-500 mt-1">Franchise geo-fenced zones across Pakistan</p>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex items-center gap-3">
          <FiFilter size={16} className="text-gray-400" />
          <select className="input w-auto" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Zones */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
      ) : zones.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No geo zones found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => (
            <div key={z.id} className="card hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-700">
                  <FiMapPin size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{z.name}</h3>
                  <p className="text-xs text-gray-500">{z.city?.name || '—'}, {z.city?.country?.name || 'Pakistan'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {z._count?.users != null && <span className="badge-blue">{z._count.users} users</span>}
                {z._count?.listings != null && <span className="badge-green">{z._count.listings} listings</span>}
                {z.isActive !== false && <span className="badge-green">Active</span>}
              </div>
              {z.polygon && (
                <p className="text-xs text-gray-400 mt-2 truncate">Polygon defined ✓</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
