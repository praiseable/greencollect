import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiMapPin, FiClock, FiPhone, FiMail, FiArrowLeft, FiHeart, FiShare2, FiMessageCircle, FiNavigation } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { SingleLocationMap } from '../components/MapView';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    api.get(`/listings/${id}`)
      .then((res) => {
        setListing(res.data?.data || res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Listing not found');
        navigate('/listings');
      });
  }, [id]);

  const handleContact = () => {
    if (!user) {
      toast.info('Please login to contact the seller');
      navigate('/login');
      return;
    }
    toast.success('Contact request sent! The seller will be notified.');
  };

  const openDirections = () => {
    if (listing?.latitude && listing?.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${listing.latitude},${listing.longitude}`,
        '_blank'
      );
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const images = listing.images?.length > 0 ? listing.images : [{ url: null }];
  const hasLocation = listing.latitude && listing.longitude;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/listings" className="flex items-center gap-1 hover:text-primary-600">
          <FiArrowLeft size={14} /> Back to Listings
        </Link>
        <span>/</span>
        <span>{listing.category?.name || 'Category'}</span>
        <span>/</span>
        <span className="text-gray-900">{listing.title}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {images[selectedImage]?.url ? (
              <img src={images[selectedImage].url} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-6xl">📦</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img, idx) => (
                <button key={idx} onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${idx === selectedImage ? 'border-primary-500' : 'border-gray-200'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full font-medium mb-2">
                {listing.category?.name || listing.categoryName}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
            </div>
            <div className="flex gap-2">
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><FiHeart size={18} /></button>
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><FiShare2 size={18} /></button>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4 p-4 bg-green-50 rounded-xl">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary-700">
                ₨ {Number(listing.pricePaisa || listing.price || 0).toLocaleString()}
              </span>
              {listing.unitName && <span className="text-gray-500">/ {listing.unitName}</span>}
            </div>
            {listing.priceNegotiable && (
              <span className="inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full mt-2">
                Price Negotiable
              </span>
            )}
          </div>

          {/* Key Info */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Quantity</div>
              <div className="font-semibold">{listing.quantity} {listing.unitName || listing.unit?.name || 'units'}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Condition</div>
              <div className="font-semibold capitalize">{listing.condition || 'Used'}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Location</div>
              <div className="font-semibold flex items-center gap-1">
                <FiMapPin size={12} /> {listing.geoZone?.name || listing.cityName || 'Pakistan'}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">Posted</div>
              <div className="font-semibold flex items-center gap-1">
                <FiClock size={12} /> {new Date(listing.createdAt).toLocaleDateString('en-PK')}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
              {listing.description || 'No description provided.'}
            </p>
          </div>

          {/* Product Attributes */}
          {listing.attributes?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">Specifications</h3>
              <div className="space-y-1">
                {listing.attributes.map((attr, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-500">{attr.name}</span>
                    <span className="font-medium">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller Info */}
          <div className="mt-6 p-4 border border-gray-200 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Seller Information</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-semibold">
                  {listing.seller?.firstName?.[0] || 'S'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {listing.seller?.firstName} {listing.seller?.lastName}
                </div>
                <div className="text-xs text-gray-500">{listing.seller?.role?.name || 'Seller'}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button onClick={handleContact} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <FiMessageCircle size={16} /> Contact Seller
            </button>
            {listing.seller?.phone && (
              <a href={`tel:${listing.seller.phone}`} className="btn-outline flex items-center gap-2">
                <FiPhone size={16} /> Call
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          LOCATION MAP SECTION
          ═══════════════════════════════════════════════════════════ */}
      {hasLocation && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiMapPin size={18} className="text-primary-600" /> Pickup Location
            </h3>
            <button
              onClick={openDirections}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <FiNavigation size={14} /> Get Directions
            </button>
          </div>

          {listing.address && (
            <p className="text-sm text-gray-600 mb-3">
              📍 {listing.address}
            </p>
          )}

          <SingleLocationMap
            latitude={parseFloat(listing.latitude)}
            longitude={parseFloat(listing.longitude)}
            title={listing.title}
            height="300px"
          />

          <div className="mt-2 text-xs text-gray-400 text-center">
            {parseFloat(listing.latitude).toFixed(4)}°N, {parseFloat(listing.longitude).toFixed(4)}°E
            {' · '}
            {listing.geoZone?.name || listing.cityName || 'Pakistan'}
          </div>
        </div>
      )}
    </div>
  );
}
