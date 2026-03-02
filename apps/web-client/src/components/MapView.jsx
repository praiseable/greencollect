import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Fit map bounds to markers
function FitBounds({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
    } else {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [markers]);
  return null;
}

/**
 * Single marker map — for listing detail page
 */
export function SingleLocationMap({ latitude, longitude, title, height = '250px', className = '' }) {
  if (!latitude || !longitude) return null;

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 shadow-sm ${className}`} style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={greenIcon}>
          {title && <Popup><strong>{title}</strong></Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}

/**
 * Multi-marker map — for listings browse page (map view)
 */
export function ListingsMapView({ listings = [], height = '500px', selectedId, onMarkerClick }) {
  // Filter listings that have valid coordinates
  const markers = listings
    .filter((l) => l.latitude && l.longitude)
    .map((l) => ({
      id: l.id,
      lat: parseFloat(l.latitude),
      lng: parseFloat(l.longitude),
      title: l.title,
      price: l.pricePaisa,
      category: l.category?.name || l.categoryName || '',
      city: l.cityName || l.geoZone?.name || '',
      image: l.images?.[0]?.url,
    }));

  // Default center: Pakistan
  const defaultCenter = [30.3753, 69.3451];
  const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : defaultCenter;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
      <MapContainer
        center={center}
        zoom={markers.length > 0 ? 10 : 5}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.length > 0 && <FitBounds markers={markers} />}
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={m.id === selectedId ? redIcon : greenIcon}
            eventHandlers={{
              click: () => onMarkerClick?.(m.id),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                {m.image && (
                  <img src={m.image} alt="" className="w-full h-24 object-cover rounded-md mb-2" />
                )}
                <Link to={`/listings/${m.id}`} className="font-semibold text-sm text-gray-900 hover:text-primary-600 block">
                  {m.title}
                </Link>
                <div className="text-primary-700 font-bold mt-1">
                  ₨ {Number(m.price).toLocaleString()}
                </div>
                {m.category && (
                  <span className="inline-block bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded mt-1">
                    {m.category}
                  </span>
                )}
                {m.city && (
                  <div className="text-xs text-gray-500 mt-1">📍 {m.city}</div>
                )}
                <Link to={`/listings/${m.id}`} className="text-xs text-primary-600 hover:underline mt-2 block">
                  View Details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default { SingleLocationMap, ListingsMapView };
