import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiSearch, FiFilter, FiEye, FiCheck, FiX, FiMapPin } from 'react-icons/fi';
import { getAdminListings, updateListingStatus, getCategories } from '../services/api';

const STATUSES = ['ALL', 'ACTIVE', 'PENDING', 'SOLD', 'EXPIRED', 'FLAGGED', 'REMOVED'];

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const limit = 12;

  useEffect(() => { fetchListings(); }, [page, statusFilter, catFilter]);
  useEffect(() => { getCategories().then(r => setCategories(r.data?.categories || r.data || [])).catch(() => {}); }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (catFilter) params.categoryId = catFilter;
      const res = await getAdminListings(params);
      const list = res.data?.data ?? res.data?.listings ?? res.data ?? [];
      setListings(Array.isArray(list) ? list : []);
      setTotal(res.data?.total ?? 0);
    } catch { toast.error('Failed to load listings'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateListingStatus(id, { status });
      toast.success(`Listing ${status.toLowerCase()}`);
      fetchListings();
      setDetail(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total listings across all zones</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchListings(); }} className="flex-1 min-w-[200px]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input className="input pl-9" placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </form>
          <select className="input w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            {STATUSES.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>)}
          </select>
          <select className="input w-auto" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
      ) : listings.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No listings found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((l) => (
            <div key={l.id} className="card p-0 overflow-hidden hover:shadow-md transition cursor-pointer" onClick={() => setDetail(l)}>
              {l.images?.[0] ? (
                <img src={l.images[0]} alt="" className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-300">No Image</div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{l.title}</h3>
                  <span className={`badge ml-2 ${l.status === 'ACTIVE' ? 'badge-green' : l.status === 'SOLD' ? 'badge-blue' : l.status === 'FLAGGED' ? 'badge-red' : 'badge-yellow'}`}>
                    {l.status}
                  </span>
                </div>
                <p className="text-lg font-bold text-primary-600">₨ {(l.price || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{l.category?.name} → {l.productType?.name}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <FiMapPin size={12} />
                  {l.geoZone?.name || l.city?.name || 'Unknown zone'}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  by {l.seller?.firstName} {l.seller?.lastName} • {new Date(l.createdAt).toLocaleDateString('en-PK')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn-secondary text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {detail.images?.[0] && <img src={detail.images[0]} alt="" className="w-full h-56 object-cover rounded-t-xl" />}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{detail.title}</h2>
                  <p className="text-sm text-gray-500">{detail.category?.name} → {detail.productType?.name}</p>
                </div>
                <span className={`badge ${detail.status === 'ACTIVE' ? 'badge-green' : 'badge-yellow'}`}>{detail.status}</span>
              </div>
              <p className="text-2xl font-bold text-primary-600">₨ {(detail.price || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-600">{detail.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Quantity:</span> {detail.quantity} {detail.unit?.abbreviation}</div>
                <div><span className="text-gray-500">Condition:</span> {detail.condition}</div>
                <div><span className="text-gray-500">Zone:</span> {detail.geoZone?.name || '—'}</div>
                <div><span className="text-gray-500">Seller:</span> {detail.seller?.firstName} {detail.seller?.lastName}</div>
                <div><span className="text-gray-500">Phone:</span> {detail.seller?.phone || '—'}</div>
                <div><span className="text-gray-500">Posted:</span> {new Date(detail.createdAt).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi' })}</div>
              </div>
              {/* Admin actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {detail.status !== 'ACTIVE' && (
                  <button onClick={() => handleStatusChange(detail.id, 'ACTIVE')} className="btn-primary text-sm"><FiCheck size={14} /> Approve</button>
                )}
                {detail.status !== 'FLAGGED' && (
                  <button onClick={() => handleStatusChange(detail.id, 'FLAGGED')} className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2">Flag</button>
                )}
                {detail.status !== 'REMOVED' && (
                  <button onClick={() => handleStatusChange(detail.id, 'REMOVED')} className="btn-danger text-sm"><FiX size={14} /> Remove</button>
                )}
                <button onClick={() => setDetail(null)} className="btn-secondary text-sm ml-auto">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
