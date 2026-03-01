import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRegionalOrders, markPickupDone } from '../../services/api';
import DataTable from '../../components/DataTable';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function RegionalOrders() {
  const [status, setStatus] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['regional-orders', status],
    queryFn: () => getRegionalOrders({ status: status || undefined }),
  });

  const pickupMutation = useMutation({
    mutationFn: markPickupDone,
    onSuccess: () => {
      queryClient.invalidateQueries(['regional-orders']);
      alert('Pickup marked as done!');
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to mark pickup'),
  });

  const columns = [
    {
      key: 'collection_point_name',
      label: 'Collection Point',
      render: (val) => <span className="font-medium">{val}</span>,
    },
    { key: 'garbage_type_name', label: 'Type' },
    {
      key: 'requested_weight_kg',
      label: 'Weight (kg)',
      render: (val) => `${parseFloat(val).toFixed(1)}kg`,
    },
    {
      key: 'agreed_price_per_kg',
      label: 'Price/kg',
      render: (val) => `RS ${val}`,
    },
    {
      key: 'total_amount',
      label: 'Total',
      render: (val) => <span className="font-semibold">RS {parseFloat(val).toFixed(0)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[val] || 'bg-gray-100'}`}>
          {val?.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) =>
        row.status === 'confirmed' ? (
          <button
            onClick={() => pickupMutation.mutate(row.id)}
            disabled={pickupMutation.isPending}
            className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
          >
            Mark Pickup Done
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bulk Orders</h1>
        <p className="text-gray-500 text-sm mt-1">Track your bulk purchase orders</p>
      </div>

      <div className="flex gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="picked_up">Picked Up</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataTable columns={columns} data={data?.orders} loading={isLoading} emptyMessage="No orders found" />
    </div>
  );
}
