import { Link } from 'react-router-dom';
import { FiMapPin, FiClock, FiEye } from 'react-icons/fi';

export default function ListingCard({ listing }) {
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <Link to={`/listings/${listing.id}`} className="card group hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {listing.images?.[0] ? (
          <img src={listing.images[0].url} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">📦</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            {listing.categoryName || listing.category?.slug}
          </span>
        </div>
        {listing.priceNegotiable && (
          <div className="absolute top-2 right-2">
            <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">Negotiable</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">
          {listing.title}
        </h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-lg font-bold text-primary-700">
            {listing.priceFormatted || `₨ ${Number(listing.pricePaisa).toLocaleString()}`}
          </span>
          {listing.unitName && (
            <span className="text-xs text-gray-500">/ {listing.unitName}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <span className="font-medium">{listing.quantity} {listing.unitName}</span>
          <span>available</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <FiMapPin size={12} />
            {listing.cityName || listing.geoZone?.name || 'Pakistan'}
          </span>
          <span className="flex items-center gap-1">
            <FiClock size={12} />
            {timeAgo(listing.createdAt)}
          </span>
        </div>
        {listing.viewCount > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
            <FiEye size={12} /> {listing.viewCount} views
          </div>
        )}
      </div>
    </Link>
  );
}
