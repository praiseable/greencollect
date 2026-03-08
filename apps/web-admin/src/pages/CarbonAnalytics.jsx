import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiDownload, FiFilter } from 'react-icons/fi';
import { getCarbonAnalytics, getCollections } from '../services/api';

const CATEGORY_COLORS = {
  Metals: '#ef4444',
  Plastics: '#3b82f6',
  'Paper & Cardboard': '#f59e0b',
  Electronics: '#8b5cf6',
  Organic: '#22c55e',
  Furniture: '#f97316',
  Household: '#06b6d4',
  Glass: '#64748b',
};

export default function CarbonAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, collectionsRes] = await Promise.all([
        getCarbonAnalytics({ period }).catch(() => ({ data: getMockAnalytics() })),
        getCollections({ status: 'VERIFIED', limit: 10 }).catch(() => ({ data: { data: getMockCollections() } })),
      ]);
      setAnalytics(analyticsRes.data?.summary ? analyticsRes.data : getMockAnalytics());
      setCollections(collectionsRes.data?.data || getMockCollections());
    } catch {
      setAnalytics(getMockAnalytics());
      setCollections(getMockCollections());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const byCategory = analytics?.byCategory || {};
  const byZone = analytics?.byZone || {};

  const maxCarbonCat = Math.max(
    ...Object.values(byCategory).map((c) => c.totalCarbonKg || 0),
    1
  );
  const maxCarbonZone = Math.max(
    ...Object.values(byZone).map((z) => z.totalCarbonKg || 0),
    1
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌿 Carbon Credit Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track environmental impact from garbage collection and carbon offset.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input w-32"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2">
            <FiRefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Collections"
          value={summary.totalCollections || 0}
          icon="📦"
          color="blue"
        />
        <SummaryCard
          title="CO₂ Offset"
          value={`${(summary.totalCarbonOffsetKg || 0).toLocaleString()} kg`}
          icon="🌍"
          color="green"
        />
        <SummaryCard
          title="Credit Value"
          value={`₨ ${(summary.totalCreditValuePkr || 0).toLocaleString()}`}
          icon="💰"
          color="yellow"
        />
        <SummaryCard
          title="Trees Equivalent"
          value={`${summary.estimatedTreesEquivalent || 0} trees/yr`}
          icon="🌳"
          color="emerald"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Carbon Offset by Category</h3>
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, data]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{cat}</span>
                  <span className="text-gray-500">
                    {data.totalCarbonKg.toFixed(1)} kg CO₂ • ₨{' '}
                    {data.totalCreditPkr.toFixed(0)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${(data.totalCarbonKg / maxCarbonCat) * 100}%`,
                      backgroundColor: CATEGORY_COLORS[cat] || '#6b7280',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{data.count} collections</span>
                  <span>{data.totalWeightKg.toFixed(0)} kg collected</span>
                </div>
              </div>
            ))}
            {Object.keys(byCategory).length === 0 && (
              <p className="text-gray-400 text-center py-8">No category data yet</p>
            )}
          </div>
        </div>

        {/* By Zone */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Carbon Offset by Zone</h3>
          <div className="space-y-3">
            {Object.entries(byZone).map(([zone, data]) => (
              <div key={zone}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{zone}</span>
                  <span className="text-gray-500">
                    {data.totalCarbonKg.toFixed(1)} kg CO₂
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-green-500 transition-all duration-500"
                    style={{
                      width: `${(data.totalCarbonKg / maxCarbonZone) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{data.count} collections</span>
                  <span>₨ {data.totalCreditPkr.toFixed(0)} credits</span>
                </div>
              </div>
            ))}
            {Object.keys(byZone).length === 0 && (
              <p className="text-gray-400 text-center py-8">No zone data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <h3 className="font-semibold text-green-900 mb-4">🌿 Environmental Impact Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ImpactBox
            label="CO₂ Prevented"
            value={`${(summary.totalCarbonOffsetKg || 0).toFixed(0)} kg`}
            sub="equivalent to removing cars for a day"
          />
          <ImpactBox
            label="Trees Saved"
            value={`${summary.estimatedTreesEquivalent || 0}`}
            sub="per year equivalent"
          />
          <ImpactBox
            label="Material Diverted"
            value={`${Object.values(byCategory).reduce((s, c) => s + (c.totalWeightKg || 0), 0).toFixed(0)} kg`}
            sub="from landfills"
          />
          <ImpactBox
            label="Carbon Credits"
            value={`₨ ${(summary.totalCreditValuePkr || 0).toFixed(0)}`}
            sub="potential carbon credit value"
          />
        </div>
      </div>

      {/* Recent Verified Collections */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Verified Collections</h3>
          <button className="btn-sm btn-secondary flex items-center gap-1">
            <FiDownload size={14} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Zone</th>
                <th className="px-4 py-3 font-medium">Weight (kg)</th>
                <th className="px-4 py-3 font-medium">CO₂ Offset</th>
                <th className="px-4 py-3 font-medium">Credit (₨)</th>
                <th className="px-4 py-3 font-medium">Dealer</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {collections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No verified collections yet
                  </td>
                </tr>
              ) : (
                collections.map((col) => (
                  <tr key={col.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {col.listingTitle || col.listing?.title || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor:
                            (CATEGORY_COLORS[col.categoryName] || '#6b7280') + '20',
                          color: CATEGORY_COLORS[col.categoryName] || '#6b7280',
                        }}
                      >
                        {col.categoryName || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{col.zone || col.area || '—'}</td>
                    <td className="px-4 py-3 font-medium">{col.weightKg || '—'}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">
                      {col.carbonKg ? `${col.carbonKg} kg` : '—'}
                    </td>
                    <td className="px-4 py-3 text-yellow-700 font-medium">
                      {col.creditPkr ? `₨ ${col.creditPkr}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{col.dealerName || '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{col.date || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <div className={`card p-5 ${colorMap[color] || 'bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-70">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

function ImpactBox({ label, value, sub }) {
  return (
    <div className="text-center p-3">
      <p className="text-xl font-bold text-green-800">{value}</p>
      <p className="text-sm font-medium text-green-700">{label}</p>
      <p className="text-xs text-green-600 mt-1">{sub}</p>
    </div>
  );
}

// ── Mock data for when API is not connected ──
function getMockAnalytics() {
  return {
    summary: {
      totalCollections: 158,
      totalCarbonOffsetKg: 4235.7,
      totalCreditValuePkr: 10589.25,
      estimatedTreesEquivalent: 202,
    },
    byCategory: {
      Metals: { totalWeightKg: 1200, totalCarbonKg: 4800, totalCreditPkr: 12000, count: 45 },
      Plastics: { totalWeightKg: 800, totalCarbonKg: 1200, totalCreditPkr: 3000, count: 38 },
      'Paper & Cardboard': { totalWeightKg: 1500, totalCarbonKg: 1650, totalCreditPkr: 4125, count: 32 },
      Electronics: { totalWeightKg: 300, totalCarbonKg: 750, totalCreditPkr: 1875, count: 18 },
      Organic: { totalWeightKg: 2000, totalCarbonKg: 1000, totalCreditPkr: 2500, count: 15 },
      Glass: { totalWeightKg: 600, totalCarbonKg: 180, totalCreditPkr: 450, count: 10 },
    },
    byZone: {
      'Korangi, Karachi': { totalCarbonKg: 2800, totalCreditPkr: 7000, count: 42 },
      'SITE, Karachi': { totalCarbonKg: 1200, totalCreditPkr: 3000, count: 28 },
      'Bara Kahu, Islamabad': { totalCarbonKg: 850, totalCreditPkr: 2125, count: 22 },
      'G-6, Islamabad': { totalCarbonKg: 650, totalCreditPkr: 1625, count: 18 },
      'G-8, Islamabad': { totalCarbonKg: 420, totalCreditPkr: 1050, count: 15 },
      'Lahore': { totalCarbonKg: 380, totalCreditPkr: 950, count: 12 },
    },
  };
}

function getMockCollections() {
  return [
    {
      id: 'vc1', listingTitle: 'Copper Wire Scrap', categoryName: 'Metals',
      zone: 'Korangi, Karachi', weightKg: 200, carbonKg: 800, creditPkr: 2000,
      dealerName: 'Bilal Traders', date: '2026-03-06',
    },
    {
      id: 'vc2', listingTitle: 'Electronic Waste - PCBs', categoryName: 'Electronics',
      zone: 'G-8, Islamabad', weightKg: 78, carbonKg: 195, creditPkr: 487,
      dealerName: 'Kashif G-8 Dealer', date: '2026-03-05',
    },
    {
      id: 'vc3', listingTitle: 'Copper Cable Waste', categoryName: 'Metals',
      zone: 'Bara Kahu, ISB', weightKg: 115, carbonKg: 460, creditPkr: 1150,
      dealerName: 'Usman BaraKahu', date: '2026-03-04',
    },
    {
      id: 'vc4', listingTitle: 'Plastic Bottles PET', categoryName: 'Plastics',
      zone: 'SITE, Karachi', weightKg: 300, carbonKg: 450, creditPkr: 1125,
      dealerName: 'Bilal Traders', date: '2026-03-03',
    },
    {
      id: 'vc5', listingTitle: 'Paper Waste', categoryName: 'Paper & Cardboard',
      zone: 'G-6, Islamabad', weightKg: 800, carbonKg: 880, creditPkr: 2200,
      dealerName: 'Tariq G-6 Dealer', date: '2026-03-02',
    },
  ];
}
