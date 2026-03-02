import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiUsers, FiList, FiMapPin, FiTrendingUp, FiDollarSign, FiPackage } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { getDashboard, getListingsByCategory, getListingsByZone } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, PointElement, LineElement);

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [catData, setCatData] = useState(null);
  const [zoneData, setZoneData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, catRes, zoneRes] = await Promise.allSettled([
        getDashboard(),
        getListingsByCategory(),
        getListingsByZone(),
      ]);
      if (dashRes.status === 'fulfilled') setStats(dashRes.value.data);
      if (catRes.status === 'fulfilled') setCatData(catRes.value.data);
      if (zoneRes.status === 'fulfilled') setZoneData(zoneRes.value.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Listings', value: stats?.activeListings || 0, icon: FiList, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Geo Zones', value: stats?.totalGeoZones || 0, icon: FiMapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Categories', value: stats?.totalCategories || 0, icon: FiPackage, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: FiTrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Revenue (₨)', value: `₨ ${(stats?.totalRevenue || 0).toLocaleString()}`, icon: FiDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const categoryChartData = {
    labels: (catData || []).map(c => c.categoryName || c.name),
    datasets: [{
      data: (catData || []).map(c => c.count || c.listingCount || 0),
      backgroundColor: COLORS,
      borderWidth: 0,
    }],
  };

  const zoneChartData = {
    labels: (zoneData || []).map(z => z.zoneName || z.name),
    datasets: [{
      label: 'Listings',
      data: (zoneData || []).map(z => z.count || z.listingCount || 0),
      backgroundColor: '#22c55e',
      borderRadius: 6,
    }],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview — Pakistan Region</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Listings by Category</h3>
          <div className="h-72 flex items-center justify-center">
            {catData && catData.length > 0 ? (
              <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Listings by Zone</h3>
          <div className="h-72">
            {zoneData && zoneData.length > 0 ? (
              <Bar data={zoneChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} />
            ) : (
              <p className="text-gray-400 text-sm text-center mt-20">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {stats?.recentListings?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Listing</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Seller</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentListings.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{l.title}</td>
                    <td className="py-3 text-gray-600">{l.category?.name || '—'}</td>
                    <td className="py-3 text-gray-600">{l.seller?.firstName} {l.seller?.lastName}</td>
                    <td className="py-3 text-gray-600">₨ {(l.price || 0).toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`badge ${l.status === 'ACTIVE' ? 'badge-green' : l.status === 'SOLD' ? 'badge-blue' : 'badge-yellow'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">
                      {new Date(l.createdAt).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">No recent listings</p>
        )}
      </div>
    </div>
  );
}
