import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiCrosshair, FiSearch } from 'react-icons/fi';

// Fix Leaflet default icon issue
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

// Component to handle map clicks
function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng]);
  return null;
}

export default function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
  height = '300px',
  showSearch = true,
  label = 'Click on the map to select location',
}) {
  const [position, setPosition] = useState(
    latitude && longitude ? [latitude, longitude] : null
  );
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const mapRef = useRef(null);

  // Default center: Karachi, Pakistan
  const defaultCenter = [24.8607, 67.0011];
  const center = position || defaultCenter;

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
      reverseGeocode(latitude, longitude);
    }
  }, [latitude, longitude]);

  const handleLocationSelect = (lat, lng) => {
    setPosition([lat, lng]);
    reverseGeocode(lat, lng);
    if (onLocationSelect) {
      onLocationSelect(lat, lng);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`
      );
      const data = await res.json();
      if (data.display_name) {
        setAddress(data.display_name);
        if (onLocationSelect) {
          onLocationSelect(lat, lng, data.display_name, data.address);
        }
      }
    } catch {
      // Geocoding failed silently
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const query = searchQuery.includes('Pakistan') ? searchQuery : `${searchQuery}, Pakistan`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        handleLocationSelect(parseFloat(lat), parseFloat(lon));
      }
    } catch {
      // Search failed
    }
    setSearching(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Geolocation denied — use default
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      {showSearch && (
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location... (e.g. Gulshan-e-Iqbal, Karachi)"
              className="input-field !pl-9 text-sm"
            />
          </form>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="btn-secondary flex items-center gap-1 text-sm whitespace-nowrap"
            title="Use my current location"
          >
            <FiCrosshair size={14} /> My Location
          </button>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
        <MapContainer
          center={center}
          zoom={position ? 14 : 6}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onLocationSelect={handleLocationSelect} />
          {position && <RecenterMap lat={position[0]} lng={position[1]} />}
          {position && <Marker position={position} icon={greenIcon} />}
        </MapContainer>
      </div>

      {/* Selected Location Info */}
      {position ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">📍</span>
            <div className="text-sm flex-1">
              <div className="font-medium text-green-800">
                Location Selected
              </div>
              {address && (
                <div className="text-green-700 text-xs mt-0.5 line-clamp-2">{address}</div>
              )}
              <div className="text-green-600 text-xs mt-1 font-mono">
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-1">
          {label}
        </p>
      )}
    </div>
  );
}
