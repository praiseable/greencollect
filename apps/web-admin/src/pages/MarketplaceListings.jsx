import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiMapPin } from 'react-icons/fi';
import { getListings, getCategories } from '../services/api';

export default function MarketplaceListings() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    getCategories().then((r) => setCategories(Array.isArray(r.data) ? r.data : r.data?.data ?? [])).catch(() => []);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { limit: 50, status: 'ACTIVE' };
    if (categoryId) params.categoryId = categoryId;
    if (search.trim()) params.search = search.trim();
    getListings(params)
      .then((res) => {
        const d = res.data;
        setListings(d?.data ?? (Array.isArray(d) ? d : []));
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [categoryId, search]);

  const priceDisplay = (l) => l.priceFormatted || (l.pricePaisa != null ? `₨ ${(Number(l.pricePaisa) / 100).toLocaleString('en-PK')}` : '—');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Browse Listings</h1>
        <Link to="/marketplace" className="text-sm font-medium text-green-600 hover:underline">Back to Home</Link>
      </div>
      <div className="card flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className="input pl-10" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.translations?.[0]?.name || c.name || c.slug}</option>
          ))}
        </select>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      ) : listings.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">No listings found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((l) => (
            <Link key={l.id} to={`/marketplace/listing/${l.id}`} className="card p-0 overflow-hidden transition hover:shadow-md">
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
