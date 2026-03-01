import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { createListing, getGarbageTypesList } from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PostListing() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [garbageTypeId, setGarbageTypeId] = useState('');
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const { data: typesData } = useQuery({
    queryKey: ['garbage-types-form'],
    queryFn: getGarbageTypesList,
  });

  const garbageTypes = typesData?.garbageTypes || [];

  const mutation = useMutation({
    mutationFn: createListing,
    onSuccess: () => {
      alert('✅ Listing posted successfully! Nearby collectors have been notified.');
      navigate('/admin/listings');
    },
    onError: (err) => {
      alert(err.response?.data?.error || 'Failed to post listing');
    },
  });

  // Generate previews when photos change
  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  function addFiles(files) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => [...prev, ...imageFiles].slice(0, 5));
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!garbageTypeId) return alert('Please select a garbage type');
    if (!position) return alert('Please click on the map to set location');

    const formData = new FormData();
    photos.forEach((file) => formData.append('photos', file));
    formData.append('garbage_type_id', garbageTypeId);
    formData.append('latitude', position.lat);
    formData.append('longitude', position.lng);
    formData.append('full_address', address);
    formData.append('city', city);
    if (weight) formData.append('estimated_weight', weight);
    if (price) formData.append('asking_price', price);
    if (description) formData.append('description', description);

    mutation.mutate(formData);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Post New Listing ♻️</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload photos of garbage and nearby collectors will be notified to pick it up
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Photo Upload ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📸 Photos</h2>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'
            }`}
          >
            <div className="text-4xl mb-2">📷</div>
            <p className="text-gray-600 font-medium">
              Drag & drop photos here or click to browse
            </p>
            <p className="text-gray-400 text-sm mt-1">Up to 5 images, max 5MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {previews.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {previews.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Garbage Type ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🗑️ Garbage Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {garbageTypes.map((gt) => (
              <button
                key={gt.id}
                type="button"
                onClick={() => setGarbageTypeId(gt.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  garbageTypeId === gt.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: gt.color || '#22c55e' }}
                />
                <p className="text-sm font-medium text-gray-800">{gt.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">RS {gt.base_price_per_kg}/kg</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Location (Map) ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">📍 Location</h2>
          <p className="text-sm text-gray-400 mb-4">Click on the map to set the pickup location</p>

          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 350 }}>
            <MapContainer
              center={[31.5204, 74.3587]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onLocationSelect={setPosition} />
              {position && <Marker position={[position.lat, position.lng]} />}
            </MapContainer>
          </div>

          {position && (
            <p className="text-xs text-emerald-600 mt-2">
              📌 Selected: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Mall Road, Lahore"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Lahore"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* ── Details ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">⚖️ Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 5.5"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asking Price (RS)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Old newspapers and cardboard boxes, packed in bags"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg shadow-emerald-200"
        >
          {mutation.isPending ? 'Posting...' : 'Post Listing & Notify Collectors ♻️'}
        </button>
      </form>
    </div>
  );
}
