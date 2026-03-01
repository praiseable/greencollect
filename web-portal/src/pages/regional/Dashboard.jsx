import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAvailableInventory, createBulkOrder } from '../../services/api';
import DataTable from '../../components/DataTable';

export default function RegionalDashboard() {
  const [city, setCity] = useState('');
  const [garbageType, setGarbageType] = useState('');
  const [minWeight, setMinWeight] = useState('');
  const [orderModal, setOrderModal] = useState(null);
  const [orderWeight, setOrderWeight] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['regional-inventory', city, garbageType, minWeight],
    queryFn: () =>
      getAvailableInventory({
        city: city || undefined,
        garbage_type: garbageType || undefined,
        min_weight: minWeight || undefined,
      }),
  });

  const orderMutation = useMutation({
    mutationFn: createBulkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries(['regional-inventory']);
      setOrderModal(null);
      setOrderWeight('');
      setOrderPrice('');
      alert('Order placed successfully!');
    },
    onError: (err) => alert(err.response?.data?.error || 'Failed to place order'),
  });

  function handlePlaceOrder() {
    if (!orderWeight || !orderPrice) return alert('Fill in weight and price');
    orderMutation.mutate({
      collection_point_id: orderModal.collection_point_id,
      garbage_type_id: orderModal.garbage_type_id,
      requested_weight_kg: parseFloat(orderWeight),
      offered_price_per_kg: parseFloat(orderPrice),
    });
  }

  const columns = [
    {
      key: 'collection_point_name',
      label: 'Collection Point',
      render: (val) => <span className="font-medium">{val}</span>,
    },
    { key: 'city', label: 'City' },
    {
      key: 'garbage_type',
      label: 'Garbage Type',
      render: (val) => (
        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
          {val}
        </span>
      ),
    },
    {
      key: 'available_weight_kg',
      label: 'Available (kg)',
      render: (val) => <span className="font-semibold">{parseFloat(val).toFixed(1)}</span>,
    },
    {
      key: 'suggested_price_per_kg',
      label: 'Suggested Price',
      render: (val) => val ? `RS ${val}/kg` : '-',
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <button
          onClick={() => { setOrderModal(row); setOrderPrice(row.suggested_price_per_kg || ''); }}
          className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          Place Order
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Available Inventory</h1>
        <p className="text-gray-500 text-sm mt-1">Browse bulk garbage available at collection points</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="City..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={garbageType}
          onChange={(e) => setGarbageType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Types</option>
          <option value="paper">Paper</option>
          <option value="plastic">Plastic</option>
          <option value="metal">Metal</option>
          <option value="glass">Glass</option>
          <option value="organic">Organic</option>
          <option value="ewaste">E-Waste</option>
          <option value="cloth">Cloth</option>
          <option value="rubber">Rubber</option>
        </select>
        <input
          type="number"
          placeholder="Min weight (kg)"
          value={minWeight}
          onChange={(e) => setMinWeight(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36"
        />
      </div>

      <DataTable columns={columns} data={data?.inventory} loading={isLoading} emptyMessage="No inventory available" />

      {/* Order Modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Place Bulk Order</h2>
            <p className="text-sm text-gray-500">
              {orderModal.garbage_type} from {orderModal.collection_point_name}
            </p>
            <p className="text-xs text-gray-400">Available: {parseFloat(orderModal.available_weight_kg).toFixed(1)} kg</p>
            <input
              type="number"
              placeholder="Weight (kg)"
              value={orderWeight}
              onChange={(e) => setOrderWeight(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Price per kg (RS)"
              value={orderPrice}
              onChange={(e) => setOrderPrice(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm"
            />
            {orderWeight && orderPrice && (
              <p className="text-sm font-medium">Total: RS {(parseFloat(orderWeight) * parseFloat(orderPrice)).toFixed(2)}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setOrderModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                onClick={handlePlaceOrder}
                disabled={orderMutation.isPending}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {orderMutation.isPending ? 'Placing...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
