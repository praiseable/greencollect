import { useQuery } from '@tanstack/react-query';
import { getGarbageTypeStats, getWeeklyStats } from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function Analytics() {
  const { data: garbageStats } = useQuery({ queryKey: ['garbage-type-stats'], queryFn: getGarbageTypeStats });
  const { data: weekly } = useQuery({ queryKey: ['weekly-stats'], queryFn: getWeeklyStats });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Detailed platform metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Garbage Types Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Garbage Types — Total Weight</h2>
          {garbageStats?.garbage_type_stats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={garbageStats.garbage_type_stats.filter(g => parseFloat(g.total_weight_kg) > 0)}
                  dataKey="total_weight_kg"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {garbageStats.garbage_type_stats.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No data available yet
            </div>
          )}
        </div>

        {/* Weekly Collection Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Weekly Collection (kg)</h2>
          {weekly?.weekly_stats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekly.weekly_stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="collected_kg" fill="#10b981" name="Collected (kg)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="listings_count" fill="#6366f1" name="Listings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              No weekly data available
            </div>
          )}
        </div>
      </div>

      {/* Garbage Types Table */}
      {garbageStats?.garbage_type_stats && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Garbage Types Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total Listings</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Completed</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Weight (kg)</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Revenue (RS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {garbageStats.garbage_type_stats.map((gt) => (
                  <tr key={gt.slug} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium">{gt.name}</td>
                    <td className="py-3 px-4 text-sm text-right">{gt.total_listings}</td>
                    <td className="py-3 px-4 text-sm text-right">{gt.completed_listings}</td>
                    <td className="py-3 px-4 text-sm text-right">{parseFloat(gt.total_weight_kg).toFixed(1)}</td>
                    <td className="py-3 px-4 text-sm text-right">RS {parseFloat(gt.total_revenue).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
