import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCollectionPoints } from '../../services/api';
import DataTable from '../../components/DataTable';
import MapView from '../../components/MapView';

export default function CollectionPoints() {
  const { data, isLoading } = useQuery({
    queryKey: ['collection-points'],
    queryFn: getCollectionPoints,
  });

  const markers = useMemo(() => {
    if (!data?.collection_points) return [];
    return data.collection_points
      .filter((cp) => cp.latitude && cp.longitude)
      .map((cp) => ({
        lat: cp.latitude,
        lng: cp.longitude,
        popup: `<strong>${cp.name}</strong><br/>${cp.address || ''}<br/>${cp.city || ''}`,
      }));
  }, [data]);

  const columns = [
    { key: 'name', label: 'Name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'manager_name', label: 'Manager', render: (val) => val || '-' },
    {
      key: 'is_active',
      label: 'Status',
      render: (val) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collection Points</h1>
        <p className="text-gray-500 text-sm mt-1">Manage collection centers</p>
      </div>

      {/* Map View */}
      {markers.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Locations Map</h2>
          <MapView markers={markers} height="350px" />
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.collection_points}
        loading={isLoading}
        emptyMessage="No collection points found"
      />
    </div>
  );
}
