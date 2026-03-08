import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiSearch, FiCheckCircle, FiXCircle, FiEye, FiMapPin } from 'react-icons/fi';
import { getCollections, updateCollectionStatus } from '../services/api';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  VERIFIED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCol, setSelectedCol] = useState(null);

  useEffect(() => {
    fetchCollections();
  }, [statusFilter]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await getCollections(params);
      setCollections(res.data?.data || getMockCollections());
    } catch {
      setCollections(getMockCollections());
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (col) => {
    try {
      await updateCollectionStatus(col.id, {
        status: 'VERIFIED',
        notes: `Verified by admin at ${new Date().toISOString()}`,
      });
      toast.success(`Collection verified. Carbon credits issued.`);
      fetchCollections();
    } catch {
      toast.error('Failed to verify collection');
    }
  };

  const handleCancel = async (col) => {
    if (!window.confirm(`Cancel this collection for "${col.listingTitle}"?`)) return;
    try {
      await updateCollectionStatus(col.id, {
        status: 'CANCELLED',
        notes: 'Cancelled by admin',
      });
      toast.success('Collection cancelled');
      fetchCollections();
    } catch {
      toast.error('Failed to cancel collection');
    }
  };

  const filtered = collections.filter(
    (c) =>
      c.listingTitle?.toLowerCase().includes(search.toLowerCase()) ||
      c.dealerName?.toLowerCase().includes(search.toLowerCase()) ||
      c.area?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collection Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track, verify, and manage garbage collection assignments.
          </p>
        </div>
        <button onClick={fetchCollections} className="btn-secondary flex items-center gap-2">
          <FiRefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search by listing, dealer, area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-40"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="VERIFIED">Verified</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Dealer</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">GPS</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    No collections found
                  </td>
                </tr>
              ) : (
                filtered.map((col) => (
                  <tr key={col.id} className={`hover:bg-gray-50 ${col.isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{col.listingTitle}</p>
                      <p className="text-xs text-gray-500">{col.categoryName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{col.dealerName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {col.area}, {col.city}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[col.status] || 'bg-gray-100'}`}>
                        {col.status}
                      </span>
                      {col.isOverdue && (
                        <span className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          OVERDUE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {col.confirmedWeightKg ? `${col.confirmedWeightKg} kg` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {col.gpsVerified ? (
                        <span className="text-green-600">✅ Verified</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {col.qualityRating ? (
                        <span>{'⭐'.repeat(col.qualityRating)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{col.deadline || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedCol(col)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <FiEye size={16} />
                        </button>
                        {col.status === 'COMPLETED' && (
                          <button
                            onClick={() => handleVerify(col)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Verify & Issue Carbon Credits"
                          >
                            <FiCheckCircle size={16} />
                          </button>
                        )}
                        {!['VERIFIED', 'CANCELLED'].includes(col.status) && (
                          <button
                            onClick={() => handleCancel(col)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel Collection"
                          >
                            <FiXCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 text-lg mb-4">
              Collection Details
            </h3>
            <div className="space-y-3 text-sm">
              <DetailRow label="Listing" value={selectedCol.listingTitle} />
              <DetailRow label="Category" value={selectedCol.categoryName} />
              <DetailRow label="Dealer" value={selectedCol.dealerName} />
              <DetailRow label="Area" value={`${selectedCol.area}, ${selectedCol.city}`} />
              <DetailRow label="Status" value={selectedCol.status} />
              <DetailRow label="Weight" value={selectedCol.confirmedWeightKg ? `${selectedCol.confirmedWeightKg} kg` : 'Not confirmed'} />
              <DetailRow label="GPS Verified" value={selectedCol.gpsVerified ? 'Yes ✅' : 'No'} />
              <DetailRow label="Quality Rating" value={selectedCol.qualityRating ? `${selectedCol.qualityRating}/5` : 'Not rated'} />
              <DetailRow label="Notes" value={selectedCol.notes || '—'} />
              {selectedCol.photoUrls?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-2">Proof Photos:</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedCol.photoUrls.map((url, i) => (
                      <img key={i} src={url} alt={`Proof ${i+1}`} className="w-24 h-24 rounded-lg object-cover" />
                    ))}
                  </div>
                </div>
              )}
              {selectedCol.carbonKg && (
                <div className="p-3 bg-green-50 rounded-lg mt-2">
                  <p className="font-medium text-green-800">Carbon Offset: {selectedCol.carbonKg} kg CO₂</p>
                  <p className="text-green-700">Credit Value: ₨ {selectedCol.creditPkr}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setSelectedCol(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex">
      <span className="w-32 text-gray-500 font-medium">{label}:</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function getMockCollections() {
  return [
    {
      id: 'col-1', listingTitle: 'Copper Wire Scrap', categoryName: 'Metals',
      dealerName: 'Bilal Traders', area: 'Korangi', city: 'Karachi',
      status: 'COMPLETED', confirmedWeightKg: 200, gpsVerified: true,
      qualityRating: 4, isOverdue: false, deadline: '2026-03-06 18:00',
      notes: 'Good quality copper, factory-sourced',
      photoUrls: ['https://picsum.photos/seed/c1/200', 'https://picsum.photos/seed/c2/200'],
      carbonKg: 800, creditPkr: 2000,
    },
    {
      id: 'col-2', listingTitle: 'Iron Scrap Bulk', categoryName: 'Metals',
      dealerName: 'Bilal Traders', area: 'SITE', city: 'Karachi',
      status: 'IN_PROGRESS', confirmedWeightKg: null, gpsVerified: false,
      qualityRating: null, isOverdue: false, deadline: '2026-03-08 12:00',
      notes: null, photoUrls: [],
    },
    {
      id: 'col-3', listingTitle: 'Copper Cable Waste', categoryName: 'Metals',
      dealerName: 'Usman BaraKahu', area: 'Bara Kahu', city: 'Islamabad',
      status: 'VERIFIED', confirmedWeightKg: 115, gpsVerified: true,
      qualityRating: 4, isOverdue: false, deadline: '2026-03-05 14:00',
      notes: 'Good quality copper cables',
      photoUrls: ['https://picsum.photos/seed/c3/200'],
      carbonKg: 460, creditPkr: 1150,
    },
    {
      id: 'col-4', listingTitle: 'Office Furniture Scrap', categoryName: 'Furniture',
      dealerName: 'Tariq G-6 Dealer', area: 'G-6', city: 'Islamabad',
      status: 'PENDING', confirmedWeightKg: null, gpsVerified: false,
      qualityRating: null, isOverdue: true, deadline: '2026-03-07 10:00',
      notes: null, photoUrls: [],
    },
    {
      id: 'col-5', listingTitle: 'Electronic Waste - PCBs', categoryName: 'Electronics',
      dealerName: 'Kashif G-8 Dealer', area: 'G-8', city: 'Islamabad',
      status: 'VERIFIED', confirmedWeightKg: 78, gpsVerified: true,
      qualityRating: 5, isOverdue: false, deadline: '2026-03-04 16:00',
      notes: 'High quality PCBs with gold contacts',
      photoUrls: ['https://picsum.photos/seed/c4/200', 'https://picsum.photos/seed/c5/200'],
      carbonKg: 195, creditPkr: 487,
    },
  ];
}
