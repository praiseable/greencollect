import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiHome, FiPhone, FiMessageCircle, FiMapPin } from 'react-icons/fi';
import { getListing } from '../services/api';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getListing(id)
        .then((res) => setListing(res.data))
        .catch(() => setListing(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const priceDisplay = (l) => {
    if (l?.priceFormatted) return l.priceFormatted;
    const paisa = Number(l?.pricePaisa || 0);
    return `₨ ${(paisa / 100).toLocaleString('en-PK')}`;
  };

  const sellerPhone = listing?.seller?.phone || listing?.contactNumber;
  const sellerId = listing?.sellerId || listing?.seller?.id;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="card py-12 text-center">
        <p className="text-gray-500">Listing not found.</p>
        <Link to="/marketplace" className="mt-4 inline-block text-green-600 hover:underline">Back to Home</Link>
      </div>
    );
  }

  const imageUrl = listing.images?.[0]?.url;
  const imgSrc = imageUrl?.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl || ''}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <FiArrowLeft size={20} />
        </button>
        <Link to="/marketplace" className="p-2 rounded-lg hover:bg-gray-100" title="Home">
          <FiHome size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 truncate flex-1">{listing.title}</h1>
      </div>

      <div className="card p-0 overflow-hidden">
        {imageUrl ? (
          <img src={imgSrc} alt="" className="w-full h-72 object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
        ) : (
          <div className="h-72 bg-gray-100 flex items-center justify-center text-gray-400">No image</div>
        )}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-green-600">{priceDisplay(listing)}</p>
              <p className="text-sm text-gray-500">/ {listing.unit?.translations?.[0]?.abbreviation || listing.unit?.slug || 'unit'}</p>
            </div>
            {listing.priceNegotiable && (
              <span className="badge badge-yellow">Negotiable</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Quantity:</span> {listing.quantity} {listing.unit?.translations?.[0]?.abbreviation || listing.unit?.slug}</div>
            <div><span className="text-gray-500">Category:</span> {listing.category?.translations?.[0]?.name || listing.category?.slug}</div>
            <div><span className="text-gray-500">Location:</span> {listing.cityName || listing.geoZone?.name || '—'}</div>
            <div><span className="text-gray-500">Posted:</span> {new Date(listing.createdAt).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}</div>
          </div>
          <p className="text-gray-700">{listing.description}</p>
          {listing.address && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiMapPin size={16} />
              {listing.address}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Seller</p>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  {listing.seller?.firstName} {listing.seller?.lastName}
                </p>
                {sellerPhone && <p className="text-sm text-gray-500">{sellerPhone}</p>}
              </div>
              <div className="flex gap-2">
                {sellerPhone && (
                  <a href={`tel:${sellerPhone.replace(/\D/g, '')}`} className="btn-primary text-sm">
                    <FiPhone size={14} /> Call
                  </a>
                )}
                {sellerId && (
                  <Link to={`/marketplace/chat/${sellerId}`} className="btn-secondary text-sm">
                    <FiMessageCircle size={14} /> Message
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
