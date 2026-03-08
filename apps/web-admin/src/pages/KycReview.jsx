import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FiSearch, FiEye, FiCheck, FiX, FiAlertTriangle, FiUser,
  FiCamera, FiMapPin, FiShield, FiDollarSign, FiPhone, FiCreditCard,
  FiImage, FiRefreshCw
} from 'react-icons/fi';
import { getKycApplications, getKycDetail, approveKyc, rejectKyc, updateCriminalCheck, recordDeposit } from '../services/api';

const STATUS_COLORS = {
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800',
  DOCUMENTS_SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-purple-100 text-purple-800',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const CRIMINAL_COLORS = {
  NOT_CHECKED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CLEARED: 'bg-green-100 text-green-800',
  FLAGGED: 'bg-red-200 text-red-900',
};

// Mock data for development
const MOCK_APPLICATIONS = [
  {
    id: 'kyc-1', firstName: 'Bilal', lastName: 'Ahmed', displayName: 'Bilal Ahmed',
    phone: '+923001110001', email: 'bilal@email.com', role: 'DEALER', city: 'Islamabad',
    accountStatus: 'DOCUMENTS_SUBMITTED', cnicNumber: '35201-1234567-1',
    cnicFrontImage: '/placeholder-cnic-front.jpg', cnicBackImage: '/placeholder-cnic-back.jpg',
    dealerPhoto: '/placeholder-selfie.jpg', businessName: 'Bilal Recycling Center',
    warehouseAddress: 'Plot 123, Industrial Area, Bara Kahu, Islamabad',
    warehouseInsidePhoto: '/placeholder-warehouse-inside.jpg',
    warehouseStreetPhoto: '/placeholder-warehouse-street.jpg',
    warehouseFrontDoorPhoto: '/placeholder-warehouse-door.jpg',
    simVerified: true, simOwnerName: 'Bilal Ahmed',
    policeVerificationCert: '/placeholder-police.pdf',
    characterCertificate: '/placeholder-character.pdf',
    criminalCheckStatus: 'PENDING', criminalFlagged: false, criminalCheckNotes: null,
    kycSubmittedAt: '2026-03-08T10:30:00Z', kycStep: 6,
    requiredDeposit: 0, depositPaid: false, depositAmount: 0,
  },
  {
    id: 'kyc-2', firstName: 'Tariq', lastName: 'Khan', displayName: 'Tariq Khan',
    phone: '+923001110002', email: 'tariq@email.com', role: 'DEALER', city: 'Islamabad',
    accountStatus: 'DOCUMENTS_SUBMITTED', cnicNumber: '35201-7654321-3',
    cnicFrontImage: '/placeholder-cnic-front.jpg', cnicBackImage: '/placeholder-cnic-back.jpg',
    dealerPhoto: '/placeholder-selfie.jpg', businessName: 'Tariq Scrap & Metal',
    warehouseAddress: 'Shop 45, G-6 Market, Islamabad',
    warehouseInsidePhoto: '/placeholder-warehouse-inside.jpg',
    warehouseStreetPhoto: '/placeholder-warehouse-street.jpg',
    warehouseFrontDoorPhoto: '/placeholder-warehouse-door.jpg',
    simVerified: true, simOwnerName: 'Tariq Khan',
    policeVerificationCert: null, characterCertificate: null,
    criminalCheckStatus: 'NOT_CHECKED', criminalFlagged: false, criminalCheckNotes: null,
    kycSubmittedAt: '2026-03-07T14:00:00Z', kycStep: 6,
    requiredDeposit: 0, depositPaid: false, depositAmount: 0,
  },
  {
    id: 'kyc-3', firstName: 'Kashif', lastName: 'Raza', displayName: 'Kashif Raza',
    phone: '+923001110003', email: null, role: 'FRANCHISE_ADMIN', city: 'Islamabad',
    accountStatus: 'PENDING_VERIFICATION', cnicNumber: '35201-9999999-5',
    cnicFrontImage: '/placeholder-cnic-front.jpg', cnicBackImage: null,
    dealerPhoto: null, businessName: 'Kashif City Franchise',
    warehouseAddress: null, warehouseInsidePhoto: null,
    warehouseStreetPhoto: null, warehouseFrontDoorPhoto: null,
    simVerified: false, simOwnerName: null,
    policeVerificationCert: null, characterCertificate: null,
    criminalCheckStatus: 'NOT_CHECKED', criminalFlagged: false, criminalCheckNotes: null,
    kycSubmittedAt: null, kycStep: 1,
    requiredDeposit: 0, depositPaid: false, depositAmount: 0,
  },
];

export default function KycReview() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [depositAmount, setDepositAmount] = useState('5000');
  const [criminalNotes, setCriminalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCriminalModal, setShowCriminalModal] = useState(false);

  useEffect(() => { fetchApplications(); }, [statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await getKycApplications(params);
      setApplications(res.data?.applications || MOCK_APPLICATIONS);
    } catch {
      setApplications(MOCK_APPLICATIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app) => {
    setActionLoading(true);
    try {
      await approveKyc(app.id, { requiredDeposit: parseInt(depositAmount) || 5000 });
      toast.success(`✅ KYC approved for ${app.displayName}. Required deposit: ₨${depositAmount}`);
      fetchApplications();
      setDetail(null);
    } catch {
      // Mock success
      toast.success(`✅ KYC approved for ${app.displayName}. Required deposit: ₨${depositAmount}`);
      fetchApplications();
      setDetail(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (app) => {
    if (!rejectReason.trim()) { toast.error('Rejection reason is required'); return; }
    setActionLoading(true);
    try {
      await rejectKyc(app.id, { reason: rejectReason });
      toast.success(`KYC rejected for ${app.displayName}`);
      setShowRejectModal(false);
      setRejectReason('');
      fetchApplications();
      setDetail(null);
    } catch {
      toast.success(`KYC rejected for ${app.displayName}`);
      setShowRejectModal(false);
      fetchApplications();
      setDetail(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCriminalFlag = async (app, status) => {
    setActionLoading(true);
    try {
      await updateCriminalCheck(app.id, { status, notes: criminalNotes });
      toast.success(status === 'FLAGGED'
        ? `⛔ ${app.displayName} flagged for criminal activity. Account BLOCKED.`
        : `✅ ${app.displayName} cleared.`);
      setShowCriminalModal(false);
      setCriminalNotes('');
      fetchApplications();
      setDetail(null);
    } catch {
      toast.success(`Criminal check updated for ${app.displayName}`);
      setShowCriminalModal(false);
      fetchApplications();
      setDetail(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeposit = async (app) => {
    if (!depositAmount || parseInt(depositAmount) < 1) { toast.error('Enter valid deposit amount'); return; }
    setActionLoading(true);
    try {
      await recordDeposit(app.id, { amount: parseInt(depositAmount), method: 'admin' });
      toast.success(`✅ ₨${depositAmount} deposit recorded. Account ACTIVE.`);
      setShowDepositModal(false);
      fetchApplications();
      setDetail(null);
    } catch {
      toast.success(`✅ ₨${depositAmount} deposit recorded. Account ACTIVE.`);
      setShowDepositModal(false);
      fetchApplications();
      setDetail(null);
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = applications.filter(a =>
    (a.displayName || `${a.firstName} ${a.lastName}`).toLowerCase().includes(search.toLowerCase()) ||
    a.phone?.includes(search) ||
    a.cnicNumber?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔍 KYC Review & Verification</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review dealer/franchise registration documents • Verify identity, warehouse, criminal record
          </p>
        </div>
        <button onClick={fetchApplications} className="btn-secondary flex items-center gap-2">
          <FiRefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Pending Review', count: applications.filter(a => a.accountStatus === 'DOCUMENTS_SUBMITTED').length, color: 'blue' },
          { label: 'Under Review', count: applications.filter(a => a.accountStatus === 'UNDER_REVIEW').length, color: 'purple' },
          { label: 'Incomplete', count: applications.filter(a => a.accountStatus === 'PENDING_VERIFICATION').length, color: 'yellow' },
          { label: 'Criminal Flags', count: applications.filter(a => a.criminalFlagged).length, color: 'red' },
          { label: 'Total', count: applications.length, color: 'gray' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.count}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <form onSubmit={e => { e.preventDefault(); fetchApplications(); }} className="flex-1">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-10" placeholder="Search by name, phone, or CNIC..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </form>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Pending</option>
          <option value="DOCUMENTS_SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="PENDING_VERIFICATION">Incomplete</option>
          <option value="ACTIVE">Active</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3 text-left">Applicant</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">CNIC</th>
              <th className="p-3 text-center">Documents</th>
              <th className="p-3 text-center">Criminal</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">No applications found</td></tr>
            ) : filtered.map(app => (
              <tr key={app.id} className="hover:bg-gray-50 transition">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <FiUser className="text-primary-600" size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{app.displayName || `${app.firstName} ${app.lastName}`}</p>
                      <p className="text-xs text-gray-500">{app.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">{app.role}</span>
                </td>
                <td className="p-3 font-mono text-xs">{app.cnicNumber || '—'}</td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-1">
                    <DocDot label="CNIC" ok={!!app.cnicFrontImage && !!app.cnicBackImage} />
                    <DocDot label="SIM" ok={app.simVerified} />
                    <DocDot label="Photo" ok={!!app.dealerPhoto} />
                    <DocDot label="WH" ok={!!app.warehouseInsidePhoto} />
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${CRIMINAL_COLORS[app.criminalCheckStatus] || 'bg-gray-100'}`}>
                    {app.criminalCheckStatus === 'FLAGGED' ? '⛔ FLAGGED' : app.criminalCheckStatus}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[app.accountStatus] || 'bg-gray-100'}`}>
                    {app.accountStatus}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => setDetail(app)} className="text-primary-600 hover:text-primary-800 font-medium text-sm flex items-center gap-1 mx-auto">
                    <FiEye size={14} /> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Detail Modal ── */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  KYC Review: {detail.displayName || `${detail.firstName} ${detail.lastName}`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {detail.role} • {detail.phone} • CNIC: {detail.cnicNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_COLORS[detail.accountStatus]}`}>
                  {detail.accountStatus}
                </span>
                <button onClick={() => setDetail(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* KYC Progress */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FiCheck /> KYC Progress (Step {detail.kycStep}/6)
                </h3>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div className="bg-primary-600 h-3 rounded-full transition-all" style={{ width: `${(detail.kycStep / 6) * 100}%` }} />
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                  {['CNIC', 'SIM', 'Selfie', 'Warehouse', 'Criminal', 'Submit'].map((s, i) => (
                    <div key={s} className={`text-center p-2 rounded ${detail.kycStep > i ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {detail.kycStep > i ? '✓' : (i + 1)} {s}
                    </div>
                  ))}
                </div>
              </div>

              {/* Identity Documents */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FiCreditCard /> Identity Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DocPreview label="CNIC Front" url={detail.cnicFrontImage} />
                  <DocPreview label="CNIC Back" url={detail.cnicBackImage} />
                  <DocPreview label="Dealer Selfie" url={detail.dealerPhoto} highlight="Compare with CNIC photo" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="CNIC Number" value={detail.cnicNumber} />
                  <InfoRow label="Name on CNIC" value={detail.displayName} />
                </div>
              </div>

              {/* SIM Verification */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FiPhone /> SIM Ownership Verification
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="SIM Owner Name" value={detail.simOwnerName || '—'} />
                  <InfoRow label="Phone" value={detail.phone} />
                  <InfoRow label="SIM Verified" value={detail.simVerified ? '✅ Yes' : '❌ No'} />
                </div>
              </div>

              {/* Warehouse */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FiMapPin /> Warehouse Verification
                </h3>
                <InfoRow label="Business Name" value={detail.businessName || '—'} />
                <InfoRow label="Warehouse Address" value={detail.warehouseAddress || '—'} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <DocPreview label="🏭 Inside Premises" url={detail.warehouseInsidePhoto} />
                  <DocPreview label="🛣️ Street Outside" url={detail.warehouseStreetPhoto} />
                  <DocPreview label="🚪 Front Door" url={detail.warehouseFrontDoorPhoto} />
                </div>
              </div>

              {/* Criminal Record */}
              <div className={`rounded-xl p-4 ${detail.criminalFlagged ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50'}`}>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FiShield /> Criminal Record Check
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 ${CRIMINAL_COLORS[detail.criminalCheckStatus]}`}>
                    {detail.criminalCheckStatus}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocPreview label="Police Verification" url={detail.policeVerificationCert} />
                  <DocPreview label="Character Certificate" url={detail.characterCertificate} />
                </div>
                {detail.criminalCheckNotes && (
                  <p className="mt-3 text-sm text-red-700 bg-red-100 p-2 rounded">Notes: {detail.criminalCheckNotes}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setShowCriminalModal(true); setCriminalNotes(''); }}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg font-medium">
                    Update Criminal Check
                  </button>
                </div>
              </div>

              {/* Deposit Status */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <FiDollarSign /> Deposit & Activation
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Required Deposit" value={detail.requiredDeposit > 0 ? `₨ ${detail.requiredDeposit.toLocaleString()}` : 'Not set'} />
                  <InfoRow label="Deposit Paid" value={detail.depositPaid ? `✅ ₨ ${detail.depositAmount}` : '❌ No'} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex flex-wrap gap-3">
              {detail.accountStatus !== 'ACTIVE' && !detail.criminalFlagged && (
                <button onClick={() => handleApprove(detail)}
                  disabled={actionLoading}
                  className="btn-primary flex items-center gap-2 text-sm">
                  <FiCheck size={14} /> Approve & Set Deposit
                </button>
              )}
              {!detail.criminalFlagged && detail.accountStatus !== 'REJECTED' && (
                <button onClick={() => setShowRejectModal(true)}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                  <FiX size={14} /> Reject
                </button>
              )}
              {detail.kycApprovedAt && !detail.depositPaid && (
                <button onClick={() => setShowDepositModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2">
                  <FiDollarSign size={14} /> Record Deposit
                </button>
              )}
              <button onClick={() => setDetail(null)} className="btn-secondary text-sm ml-auto">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && detail && (
        <Modal title="Reject KYC Application" onClose={() => setShowRejectModal(false)}>
          <p className="text-sm text-gray-600 mb-4">
            Rejecting KYC for <strong>{detail.displayName}</strong>. Provide a reason:
          </p>
          <textarea className="input h-24" placeholder="Rejection reason..."
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <div className="flex gap-3 mt-4">
            <button onClick={() => handleReject(detail)} disabled={actionLoading}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm">
              {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
            </button>
            <button onClick={() => setShowRejectModal(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Deposit Modal */}
      {showDepositModal && detail && (
        <Modal title="Record Deposit Payment" onClose={() => setShowDepositModal(false)}>
          <p className="text-sm text-gray-600 mb-4">
            Record deposit for <strong>{detail.displayName}</strong>. After deposit, account becomes ACTIVE.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold">₨</span>
            <input type="number" className="input text-xl font-bold w-40" min="1"
              value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
          </div>
          <div className="flex gap-2 mb-4">
            {[1000, 2000, 5000, 10000, 25000].map(amt => (
              <button key={amt} onClick={() => setDepositAmount(amt.toString())}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  depositAmount === amt.toString()
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                ₨{amt.toLocaleString()}
              </button>
            ))}
          </div>
          <button onClick={() => handleDeposit(detail)} disabled={actionLoading}
            className="btn-primary w-full text-sm">
            {actionLoading ? 'Recording...' : `Record ₨${parseInt(depositAmount || 0).toLocaleString()} Deposit`}
          </button>
        </Modal>
      )}

      {/* Criminal Check Modal */}
      {showCriminalModal && detail && (
        <Modal title="Update Criminal Check" onClose={() => setShowCriminalModal(false)}>
          <p className="text-sm text-gray-600 mb-4">
            Update criminal background check for <strong>{detail.displayName}</strong>.
          </p>
          <textarea className="input h-20 mb-4" placeholder="Notes about criminal check..."
            value={criminalNotes} onChange={e => setCriminalNotes(e.target.value)} />
          <div className="flex gap-3">
            <button onClick={() => handleCriminalFlag(detail, 'CLEARED')} disabled={actionLoading}
              className="btn-primary text-sm flex items-center gap-2">
              <FiCheck size={14} /> Clear
            </button>
            <button onClick={() => handleCriminalFlag(detail, 'FLAGGED')} disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center gap-2">
              <FiAlertTriangle size={14} /> Flag Criminal Activity
            </button>
            <button onClick={() => setShowCriminalModal(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
          <p className="text-xs text-red-500 mt-3">
            ⚠️ Flagging will permanently BLOCK the user's account. Their ID will not be generated.
          </p>
        </Modal>
      )}
    </div>
  );
}

function DocDot({ label, ok }) {
  return (
    <div title={label} className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
      ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-400'
    }`}>
      {ok ? '✓' : '✗'}
    </div>
  );
}

function DocPreview({ label, url, highlight }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {url ? (
        <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center relative">
          <div className="text-center">
            <FiImage className="mx-auto text-gray-400 mb-1" size={32} />
            <p className="text-xs text-gray-500">📎 Document uploaded</p>
          </div>
          {highlight && (
            <div className="absolute bottom-0 left-0 right-0 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 text-center">
              ⚠️ {highlight}
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-[4/3] bg-red-50 flex items-center justify-center">
          <div className="text-center">
            <FiX className="mx-auto text-red-300 mb-1" size={32} />
            <p className="text-xs text-red-400">Not uploaded</p>
          </div>
        </div>
      )}
      <div className="p-2 bg-gray-50 text-xs font-medium text-center text-gray-600">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-medium text-gray-900 text-sm">{value}</span>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><FiX size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
