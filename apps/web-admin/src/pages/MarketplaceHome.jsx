import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiPlusCircle, FiMapPin } from 'react-icons/fi';
import { getListings, getCategories, getMe } from '../services/api';

export default function MarketplaceHome() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [listRes, catRes, meRes] = await Promise.allSettled([
        getListings({ limit: 20, status: 'ACTIVE' }),
        getCategories(),
        getMe().catch(() => null),
      ]);
      if (listRes.status === 'fulfilled') {
        const d = listRes.value.data;
        setListings(d?.data ?? d ?? []);
      }
      if (catRes.status === 'fulfilled') {
        const c = catRes.value.data;
        setCategories(Array.isArray(c) ? c : c?.data ?? []);
      }
      if (meRes.status === 'fulfilled' && meRes.value?.data) setUser(meRes.value.data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? listings.filter((l) =>
        (l.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.description || '').toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  const priceDisplay = (l) => {
    if (l.priceFormatted) return l.priceFormatted;
    const paisa = Number(l.pricePaisa || 0);
    return `₨ ${(paisa / 100).toLocaleString('en-PK')}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-green-600 to-green-700 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Welcome, {user?.firstName || user?.displayName || 'Admin'}!</h1>
        <p className="mt-1 text-green-100">
          {user?.geoZone?.name ? `📍 ${user.geoZone.name}` : 'Browse and manage listings — same as mobile app'}
        </p>
        <Link
          to="/marketplace/create"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-medium text-green-700 shadow hover:bg-green-50"
        >
          <FiPlusCircle size={18} />
          Post a Listing
        </Link>
      </div>

      <div className="card">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Search: copper, iron, plastics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                to={`/listings?categoryId=${c.id}`}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {c.name || c.slug}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Recent Listings</h2>
        <Link to="/marketplace/listings" className="text-sm font-medium text-green-600 hover:underline">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">No listings found. Post one from the button above.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.slice(0, 12).map((l) => (
            <Link
              key={l.id}
              to={`/marketplace/listing/${l.id}`}
              className="card p-0 overflow-hidden transition hover:shadow-md"
            >
              {l.images?.[0]?.url ? (
                <img src={l.images[0].url.startsWith('http') ? l.images[0].url : `${window.location.origin}${l.images[0].url}`} alt="" className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-gray-400">No image</div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{l.title}</h3>
                <p className="mt-1 text-lg font-bold text-green-600">{priceDisplay(l)}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <FiMapPin size={12} />
                  {l.cityName || l.geoZone?.name || '—'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
