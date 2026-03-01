import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, verifyUser, banUser, unbanUser } from '../../services/api';
import DataTable from '../../components/DataTable';

export default function Users() {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', role, search, page],
    queryFn: () => getUsers({ role: role || undefined, search: search || undefined, page, limit: 20 }),
  });

  const verifyMutation = useMutation({
    mutationFn: verifyUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const banMutation = useMutation({
    mutationFn: banUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const unbanMutation = useMutation({
    mutationFn: unbanUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'role',
      label: 'Role',
      render: (val) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 capitalize">
          {val?.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'is_verified',
      label: 'Verified',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {val ? '✓ Yes' : '✗ No'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {val ? 'Active' : 'Banned'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          {!row.is_verified && (
            <button
              onClick={() => verifyMutation.mutate(row.id)}
              className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
            >
              Verify
            </button>
          )}
          {row.is_active ? (
            <button
              onClick={() => banMutation.mutate(row.id)}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Ban
            </button>
          ) : (
            <button
              onClick={() => unbanMutation.mutate(row.id)}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Unban
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage and verify platform users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Roles</option>
          <option value="house_owner">House Owner</option>
          <option value="local_collector">Local Collector</option>
          <option value="regional_collector">Regional Collector</option>
          <option value="collection_manager">Collection Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <DataTable columns={columns} data={data?.users} loading={isLoading} />

      {/* Pagination */}
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
