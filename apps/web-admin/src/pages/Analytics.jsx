import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiBarChart2, FiTrendingUp, FiUsers, FiList, FiDollarSign } from 'react-icons/fi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, PointElement, LineElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { getAnalyticsOverview, getListingsByCategory, getListingsByZone } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, PointElement, LineElement);

const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16'];

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [catData, setCatData] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [oRes, cRes, zRes] = await Promise.allSettled([
        getAnalyticsOverview(),
        getListingsByCategory(),
        getListingsByZone(),
      ]);
      if (oRes.status === 'fulfilled') setOverview(oRes.value.data);
      if (cRes.status === 'fulfilled') setCatData(cRes.value.data || []);
      if (zRes.status === 'fulfilled') setZoneData(zRes.value.data || []);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;

  const statCards = [
    { label: 'Total Revenue', value: `₨ ${(overview?.totalRevenue || 0).toLocaleString()}`, icon: FiDollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Users This Month', value: overview?.usersThisMonth || 0, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Listings This Month', value: overview?.listingsThisMonth || 0, icon: FiList, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Growth Rate', value: `${overview?.growthRate || 0}%`, icon: FiTrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Platform metrics & insights — PKT (Asia/Karachi)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center`}>
              <s.icon size={22} className={s.color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Category Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            {catData.length > 0 ? (
              <Doughnut
                data={{
                  labels: catData.map(c => c.categoryName || c.name),
                  datasets: [{ data: catData.map(c => c.count || 0), backgroundColor: COLORS, borderWidth: 0 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }}
              />
            ) : <p className="text-gray-400 text-sm">No data</p>}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Zone Performance</h3>
          <div className="h-72">
            {zoneData.length > 0 ? (
              <Bar
                data={{
                  labels: zoneData.map(z => z.zoneName || z.name),
                  datasets: [{ label: 'Listings', data: zoneData.map(z => z.count || 0), backgroundColor: '#22c55e', borderRadius: 6 }],
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
              />
            ) : <p className="text-gray-400 text-sm text-center mt-20">No data</p>}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Monthly Listings Trend</h3>
        <div className="h-72">
          {overview?.monthlyTrend?.length > 0 ? (
            <Line
              data={{
                labels: overview.monthlyTrend.map(m => m.month),
                datasets: [{
                  label: 'Listings',
                  data: overview.monthlyTrend.map(m => m.count),
                  borderColor: '#22c55e',
                  backgroundColor: 'rgba(34,197,94,0.1)',
                  fill: true,
                  tension: 0.4,
                }],
              }}
              options={{ responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }}
            />
          ) : <p className="text-gray-400 text-sm text-center mt-20">No trend data available</p>}
        </div>
      </div>
    </div>
  );
}
