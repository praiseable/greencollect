import { useQuery } from '@tanstack/react-query';
import { getAdminStats, getWeeklyStats } from '../../services/api';
import StatsCard from '../../components/StatsCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#1e293b'];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });
  const { data: weekly } = useQuery({ queryKey: ['weekly-stats'], queryFn: getWeeklyStats });

  if (isLoading) {
    return <div className="animate-pulse text-gray-400 text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Listings" value={stats?.total_listings || 0} icon="📋" color="emerald" />
        <StatsCard label="Completed" value={stats?.completed_listings || 0} icon="✅" color="blue" />
        <StatsCard label="Open Now" value={stats?.open_listings || 0} icon="📦" color="amber" />
        <StatsCard label="Active Collectors" value={stats?.active_collectors || 0} icon="🚛" color="purple" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Collected" value={`${stats?.total_collected_kg || 0} kg`} icon="♻️" color="emerald" />
        <StatsCard label="Revenue Today" value={`RS ${stats?.revenue_today || 0}`} icon="💰" color="blue" />
        <StatsCard label="Total Revenue" value={`RS ${stats?.total_revenue || 0}`} icon="🏦" color="amber" />
        <StatsCard label="Collection Points" value={stats?.total_collection_points || 0} icon="📍" color="purple" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Garbage by Type */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Collection by Garbage Type</h2>
          {stats?.by_garbage_type?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.by_garbage_type}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v} kg`} />
                <Bar dataKey="weight_kg" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No collection data yet
            </div>
          )}
        </div>

        {/* Weekly Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Weekly Listings Trend</h2>
          {weekly?.weekly_stats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weekly.weekly_stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="listings_count" stroke="#10b981" strokeWidth={2} name="Posted" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed_count" stroke="#6366f1" strokeWidth={2} name="Completed" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No weekly data available
            </div>
          )}
        </div>
      </div>

      {/* Users by Role */}
      {stats?.users_by_role && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Users by Role</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats.users_by_role.map((item) => (
              <div key={item.role} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-500 capitalize">{item.role?.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
