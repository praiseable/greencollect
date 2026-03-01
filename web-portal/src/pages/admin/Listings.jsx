import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getListings } from '../../services/api';
import DataTable from '../../components/DataTable';

const statusColors = {
  open: 'bg-blue-100 text-blue-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-orange-100 text-orange-700',
  collected: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
};

export default function Listings() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [garbageType, setGarbageType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['listings', status, garbageType, page],
    queryFn: () =>
      getListings({
        status: status || undefined,
        garbage_type: garbageType || undefined,
        page,
        limit: 20,
      }),
  });

  const columns = [
    {
      key: 'garbage_type',
      label: 'Type',
      render: (val) => (
        <span className="font-medium">{val || 'N/A'}</span>
      ),
    },
    { key: 'owner_name', label: 'Owner' },
    { key: 'collector_name', label: 'Collector', render: (val) => val || '-' },
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
      key: 'estimated_weight',
      label: 'Weight',
      render: (val) => val ? `${val}kg` : '-',
    },
    {
      key: 'asking_price',
      label: 'Asking',
      render: (val) => val ? `RS ${val}` : '-',
    },
    {
      key: 'final_price',
      label: 'Final',
      render: (val) => val ? `RS ${val}` : '-',
    },
    {
      key: 'posted_at',
      label: 'Posted',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      key: 'id',
      label: '',
      render: (val) => (
        <button
          onClick={() => navigate(`/listing/${val}`)}
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          View →
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Listings</h1>
        <p className="text-gray-500 text-sm mt-1">
          {data?.total || 0} total listings
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="collected">Collected</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={garbageType}
          onChange={(e) => { setGarbageType(e.target.value); setPage(1); }}
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
      </div>

      <DataTable columns={columns} data={data?.listings} loading={isLoading} />

      {data?.total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} of {Math.ceil(data.total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= data.total}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
