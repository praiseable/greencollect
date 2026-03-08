import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiTrendingUp, FiShield, FiMapPin, FiMap } from 'react-icons/fi';
import api from '../services/api';
import ListingCard from '../components/ListingCard';
import { ListingsMapView } from '../components/MapView';

export default function Home() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/listings?limit=8&sort=latest').catch(() => ({ data: { data: [] } })),
      api.get('/categories').catch(() => ({ data: { data: [] } })),
    ]).then(([listingsRes, categoriesRes]) => {
      setListings(listingsRes.data?.data || listingsRes.data || []);
      setCategories(categoriesRes.data?.data || categoriesRes.data || []);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: 'Active Listings', value: '2,500+' },
    { label: 'Registered Dealers', value: '800+' },
    { label: 'Cities Covered', value: '15+' },
    { label: 'Tons Recycled', value: '10,000+' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-green-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Pakistan's #1 Marketplace for<br />
              <span className="text-yellow-300">Recyclable & Reusable</span> Goods
            </h1>
            <p className="mt-4 text-lg text-green-100">
              Buy and sell scrap metals, plastics, paper, electronics and more.
              Connect with local dealers in your geo-zone. All prices in ₨ PKR.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/listings" className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors">
                Browse Listings
              </Link>
              <Link to="/create-listing" className="bg-primary-800 bg-opacity-50 border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-opacity-75 transition-colors">
                Post a Listing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-primary-600">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>
          <Link to="/listings" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:underline">
            View All <FiArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(categories.length > 0 ? categories : defaultCategories).map((cat, idx) => (
            <Link
              key={cat.id || idx}
              to={`/listings?category=${cat.slug || cat.name?.toLowerCase()}`}
              className="card p-4 text-center hover:shadow-md transition-shadow group"
            >
              <div className="text-3xl mb-2">{cat.icon || categoryIcons[idx % categoryIcons.length]}</div>
              <div className="font-medium text-gray-800 text-sm group-hover:text-primary-600">{cat.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Listings */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Latest Listings</h2>
            <Link to="/listings" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:underline">
              See All <FiArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-[4/3] bg-gray-200" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-5 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium">No listings yet — be the first to post!</p>
              <Link to="/create-listing" className="btn-primary mt-4 inline-block">Post Listing</Link>
            </div>
          )}
        </div>
      </section>

      {/* Listings Map */}
      {listings.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiMap className="text-primary-600" /> Listings on Map
            </h2>
            <Link to="/listings" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
              Explore All <FiArrowRight size={14} />
            </Link>
          </div>
          <p className="text-gray-500 text-sm mb-4">Browse recyclable materials near you across Pakistan</p>
          <ListingsMapView listings={listings} height="400px" />
        </section>
      )}

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Why Kabariya?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <FiMapPin className="text-primary-600" size={28} />, title: 'Geo-Zone Based', desc: 'Find dealers and listings within your local geo-zone. City-level matching across Pakistan.' },
            { icon: <FiTrendingUp className="text-primary-600" size={28} />, title: 'Best Prices in PKR', desc: 'Fair pricing in Pakistani Rupees (₨). Track market rates for scrap and recyclable materials.' },
            { icon: <FiShield className="text-primary-600" size={28} />, title: 'Verified Dealers', desc: 'All franchise dealers are verified. Secure transactions with reputation system.' },
          ].map((f) => (
            <div key={f.title} className="card p-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const categoryIcons = ['♻️', '🔩', '📦', '📱', '🪵', '🧱', '🔋', '🏗️'];
const defaultCategories = [
  { name: 'Plastic', slug: 'plastic' },
  { name: 'Metals', slug: 'metals' },
  { name: 'Paper', slug: 'paper' },
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Glass', slug: 'glass' },
  { name: 'Rubber', slug: 'rubber' },
];
