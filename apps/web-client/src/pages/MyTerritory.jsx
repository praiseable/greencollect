import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const ZONE_TYPE_ICONS = {
  LOCAL_AREA: '📍',
  CITY: '🏙️',
  PROVINCE: '🗺️',
  COUNTRY: '🌍',
};

const VISIBILITY_FLOW = ['LOCAL', 'NEIGHBOR', 'CITY', 'PROVINCE', 'NATIONAL', 'PUBLIC'];
const VISIBILITY_COLORS = {
  LOCAL: '#22c55e',
  NEIGHBOR: '#3b82f6',
  CITY: '#8b5cf6',
  PROVINCE: '#f59e0b',
  NATIONAL: '#ef4444',
  PUBLIC: '#6b7280',
};

export default function MyTerritory() {
  const user = useAuthStore((s) => s.user);
  const [territories, setTerritories] = useState([]);
  const [escalationRules, setEscalationRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [terRes, escRes] = await Promise.all([
          api.get('/territories/my'),
          api.get('/territories/escalation-rules'),
        ]);
        setTerritories(terRes.data?.data || []);
        setEscalationRules(escRes.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch territories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-gray-400 mt-3">Loading your territories...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          📍 My Territories
        </h1>
        <p className="text-gray-500 mt-1">
          Your assigned geographic zones. Listings in these areas will be routed to you.
        </p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{territories.length}</p>
          <p className="text-xs text-green-600 mt-1">Assigned Zones</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">
            {territories.filter(t => t.isExclusive).length}
          </p>
          <p className="text-xs text-blue-600 mt-1">Exclusive</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">
            {territories.reduce((sum, t) => sum + (t.geoZone?.children?.length || 0), 0)}
          </p>
          <p className="text-xs text-purple-600 mt-1">Sub-Areas</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-700">{user?.role?.replace('_', ' ')}</p>
          <p className="text-xs text-orange-600 mt-1">Your Role</p>
        </div>
      </div>

      {/* Territory List */}
      {territories.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <p className="text-4xl mb-3">🗺️</p>
          <h3 className="font-semibold text-gray-700">No Territories Assigned Yet</h3>
          <p className="text-sm text-gray-400 mt-1">Contact admin to get your area assigned.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Your Zones</h2>
          {territories.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ZONE_TYPE_ICONS[t.geoZone?.type] || '📍'}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{t.geoZone?.name}</h3>
                    <p className="text-xs text-gray-400">
                      {t.geoZone?.type?.replace('_', ' ')}
                      {t.geoZone?.parent && ` • ${t.geoZone.parent.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.isExclusive && (
                    <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">
                      🛡️ Exclusive
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {t.isActive ? '✅ Active' : '❌ Inactive'}
                  </span>
                </div>
              </div>

              {/* Sub-areas */}
              {t.geoZone?.children && t.geoZone.children.length > 0 && (
                <div className="mt-3 ml-9">
                  <p className="text-xs font-medium text-gray-500 mb-1">Sub-Areas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.geoZone.children.map(child => (
                      <span key={child.id} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                        {child.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Escalation Timeline */}
      {escalationRules.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
          <h2 className="font-semibold text-amber-800 mb-2">⏰ Listing Escalation Timeline</h2>
          <p className="text-sm text-amber-700 mb-4">
            If a listing in your area gets no offers, it automatically widens its reach:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {VISIBILITY_FLOW.map((level, i) => {
              const rule = escalationRules.find(r => r.fromLevel === level);
              return (
                <div key={level} className="flex items-center gap-2">
                  <span
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: VISIBILITY_COLORS[level] }}
                  >
                    {level}
                  </span>
                  {rule && (
                    <>
                      <span className="text-xs text-gray-500">→ {rule.delayHours}h →</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
