import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown } from 'react-icons/fi';
import api from '../services/api';
import ListingCard from '../components/ListingCard';

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'latest',
    minPrice: '',
    maxPrice: '',
    city: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.get('/categories').then((res) => {
      setCategories(res.data?.data || res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchListings();
  }, [page, filters.sort]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.sort) params.set('sort', filters.sort);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.city) params.set('city', filters.city);
      params.set('page', page);
      params.set('limit', 12);

      const res = await api.get(`/listings?${params.toString()}`);
      setListings(res.data?.data || res.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch {
      setListings([]);
    }
    setLoading(false);
  };

  const handleFilterSubmit = (e) => {
    e?.preventDefault();
    setPage(1);
    fetchListings();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({ category: '', search: '', sort: 'latest', minPrice: '', maxPrice: '', city: '' });
    setPage(1);
    setSearchParams({});
  };

  const cities = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar', 'Quetta', 'Multan', 'Hyderabad', 'Sialkot'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {filters.category ? `${filters.category} Listings` : 'All Listings'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse recyclable and reusable goods across Pakistan
          </p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary flex items-center gap-2 text-sm md:hidden">
          <FiFilter size={16} /> Filters
        </button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters (desktop) */}
        <div className={`${showFilters ? 'fixed inset-0 z-40 bg-white p-6 overflow-y-auto' : 'hidden'} md:block md:relative md:w-64 md:flex-shrink-0`}>
          <div className="md:sticky md:top-20">
            <div className="flex items-center justify-between md:hidden mb-4">
              <h3 className="font-semibold text-lg">Filters</h3>
              <button onClick={() => setShowFilters(false)}><FiX size={24} /></button>
            </div>

            <form onSubmit={handleFilterSubmit} className="space-y-5">
              {/* Search */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Search</label>
                <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="input-field mt-1" placeholder="copper wire, PET bottles..." />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="input-field mt-1">
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug || c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">City</label>
                <select value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="input-field mt-1">
                  <option value="">All Cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price Range (₨)</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input type="number" placeholder="Min" value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="input-field" />
                  <input type="number" placeholder="Max" value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="input-field" />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full text-sm">Apply Filters</button>
              <button type="button" onClick={clearFilters} className="btn-secondary w-full text-sm">Clear All</button>
            </form>
          </div>
        </div>

        {/* Listing Grid */}
        <div className="flex-1">
          {/* Sort Bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">{listings.length} results</span>
            <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
              <option value="latest">Latest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200" />
                  <div className="p-4 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-5 bg-gray-200 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-medium">No listings found matching your criteria</p>
              <button onClick={clearFilters} className="text-primary-600 text-sm mt-2 hover:underline">Clear filters</button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium ${p === page ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
