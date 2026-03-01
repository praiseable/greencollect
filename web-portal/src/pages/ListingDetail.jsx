import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getListingDetail } from '../services/api';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const statusColors = {
  open: 'bg-blue-100 text-blue-700',
  assigned: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-orange-100 text-orange-700',
  collected: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-700',
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['listing-detail', id],
    queryFn: () => getListingDetail(id),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading listing...</div>
      </div>
    );
  }

  if (error || !data?.listing) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <span className="text-4xl mb-3">😕</span>
        <p className="text-gray-500">Listing not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-emerald-600 hover:underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  const l = data.listing;
  const hasPhotos = l.photo_urls && l.photo_urls.length > 0;
  const hasLocation = l.latitude && l.longitude;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-gray-600 text-2xl"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Listing #{l.listing_number}
          </h1>
          <p className="text-gray-500 text-sm">Posted {formatDate(l.posted_at)}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[l.status] || 'bg-gray-100'}`}>
          {l.status?.replace('_', ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Photos + Map */}
        <div className="lg:col-span-2 space-y-6">

          {/* Photos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📸 Photos</h2>
            {hasPhotos ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {l.photo_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url.startsWith('/') ? `${window.location.origin}${url}` : url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-40 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition"
                    onClick={() => window.open(url.startsWith('/') ? `${window.location.origin}${url}` : url, '_blank')}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <span className="text-3xl block mb-2">📷</span>
                No photos uploaded
              </div>
            )}
          </div>

          {/* Map */}
          {hasLocation && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">📍 Pickup Location</h2>
              <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 300 }}>
                <MapContainer
                  center={[parseFloat(l.latitude), parseFloat(l.longitude)]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[parseFloat(l.latitude), parseFloat(l.longitude)]}>
                    <Popup>
                      {l.full_address || `${l.latitude}, ${l.longitude}`}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
              {l.full_address && (
                <p className="text-sm text-gray-600 mt-3">📌 {l.full_address}{l.city ? `, ${l.city}` : ''}</p>
              )}
            </div>
          )}

          {/* Description */}
          {l.description && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">📝 Description</h2>
              <p className="text-gray-600">{l.description}</p>
            </div>
          )}
        </div>

        {/* Right: Info cards */}
        <div className="space-y-6">

          {/* Garbage Type */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">🗑️ Garbage Type</h2>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: l.garbage_type_color || '#22c55e' }}
              >
                {l.garbage_type_icon || '♻️'}
              </div>
              <div>
                <p className="font-medium text-gray-800">{l.garbage_type || '—'}</p>
                <p className="text-xs text-gray-400">RS {l.base_price_per_kg}/kg base price</p>
              </div>
            </div>
          </div>

          {/* Weight & Price */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">⚖️ Weight & Price</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Estimated Weight</span>
                <span className="font-medium text-gray-800">{l.estimated_weight ? `${l.estimated_weight} kg` : '—'}</span>
              </div>
              {l.actual_weight && (
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Actual Weight</span>
                  <span className="font-medium text-gray-800">{l.actual_weight} kg</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Asking Price</span>
                <span className="font-semibold text-emerald-600">{l.asking_price ? `RS ${l.asking_price}` : '—'}</span>
              </div>
              {l.final_price && (
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Final Price</span>
                  <span className="font-semibold text-emerald-600">RS {l.final_price}</span>
                </div>
              )}
            </div>
          </div>

          {/* Owner */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">👤 Posted By</h2>
            <p className="font-medium text-gray-800">{l.owner_name || '—'}</p>
            {l.owner_phone && <p className="text-sm text-gray-500 mt-1">📞 {l.owner_phone}</p>}
            {l.owner_email && <p className="text-sm text-gray-500">✉️ {l.owner_email}</p>}
            {l.owner_role && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {l.owner_role.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Collector (if assigned) */}
          {l.collector_name && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">🚛 Collector</h2>
              <p className="font-medium text-gray-800">{l.collector_name}</p>
              {l.collector_phone && <p className="text-sm text-gray-500 mt-1">📞 {l.collector_phone}</p>}
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">⏱️ Timeline</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Posted</span>
                <span className="text-gray-700">{formatDate(l.posted_at)}</span>
              </div>
              {l.assigned_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned</span>
                  <span className="text-gray-700">{formatDate(l.assigned_at)}</span>
                </div>
              )}
              {l.collected_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Collected</span>
                  <span className="text-gray-700">{formatDate(l.collected_at)}</span>
                </div>
              )}
              {l.completed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed</span>
                  <span className="text-gray-700">{formatDate(l.completed_at)}</span>
                </div>
              )}
              {l.expires_at && l.status === 'open' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Expires</span>
                  <span className="text-orange-600">{formatDate(l.expires_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Collection Point */}
          {l.collection_point_name && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">🏭 Collection Point</h2>
              <p className="font-medium text-gray-800">{l.collection_point_name}</p>
              {l.collection_point_address && (
                <p className="text-sm text-gray-500 mt-1">{l.collection_point_address}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
