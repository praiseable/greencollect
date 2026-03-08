import { useState } from 'react';
import { toast } from 'react-toastify';
import { FiUser, FiPhone, FiMail, FiMapPin, FiFileText, FiCamera, FiShield, FiDollarSign, FiCheck, FiX, FiUpload } from 'react-icons/fi';

const ROLES = [
  { value: 'DEALER', label: '🏪 Local Dealer', desc: 'Zone-based area dealer' },
  { value: 'FRANCHISE_ADMIN', label: '🏢 City Franchise', desc: 'City-level franchise owner' },
  { value: 'COLLECTOR', label: '🏭 Wholesale', desc: 'Bulk buyer / nationwide' },
];

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala',
  'Hyderabad', 'Bahawalpur',
];

export default function DealerOnboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    // Personal
    firstName: '', lastName: '', phone: '', email: '',
    // Role & Location
    role: 'DEALER', city: 'Islamabad', area: '', geoZoneId: '',
    // Identity
    cnicNumber: '', cnicFront: null, cnicBack: null,
    // Business
    businessName: '', businessAddress: '',
    // Warehouse (3 mandatory photos)
    warehouseAddress: '', warehouseInside: null, warehouseStreet: null, warehouseFrontDoor: null,
    // SIM owner
    simOwnerName: '',
    // Verification Documents
    policeVerification: null, characterCertificate: null,
    dealerPhoto: null, shopPhoto: null,
    // Banking (optional)
    ntnNumber: '', bankName: '', accountTitle: '', accountNumber: '',
    // Initial Balance & Deposit
    initialBalance: '0', requiredDeposit: '5000',
  });
  const [previewUrls, setPreviewUrls] = useState({});

  const handleInput = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFile = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      setForm(prev => ({ ...prev, [field]: file }));
      setPreviewUrls(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // In production, this would POST to /api/admin/dealers with FormData
      await new Promise(r => setTimeout(r, 2000));
      toast.success(`✅ Dealer account created for ${form.firstName} ${form.lastName}! Initial balance: ₨${form.initialBalance}`);
      setStep(1);
      setForm({
        firstName: '', lastName: '', phone: '', email: '',
        role: 'DEALER', city: 'Islamabad', area: '', geoZoneId: '',
        cnicNumber: '', cnicFront: null, cnicBack: null,
        businessName: '', businessAddress: '',
        warehouseAddress: '', warehouseInside: null, warehouseStreet: null, warehouseFrontDoor: null,
        simOwnerName: '',
        policeVerification: null, characterCertificate: null,
        dealerPhoto: null, shopPhoto: null,
        ntnNumber: '', bankName: '', accountTitle: '', accountNumber: '',
        initialBalance: '0', requiredDeposit: '5000',
      });
      setPreviewUrls({});
    } catch (err) {
      toast.error('Failed to create dealer account');
    } finally {
      setLoading(false);
    }
  };

  const stepValid = () => {
    switch (step) {
      case 1: return form.firstName && form.lastName && form.phone && form.role && form.simOwnerName;
      case 2: return form.cnicNumber && form.businessName && form.city && form.area && form.warehouseAddress;
      case 3: return true; // documents are important but can be added later
      case 4: return true;
      default: return true;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🏪 Dealer / Franchise Onboarding
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create new Pro account with full KYC verification • Only admin can create dealer accounts
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {['Personal Info', 'Identity & Business', 'Documents', 'Balance & Review'].map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step > i + 1 ? 'bg-green-600 text-white' :
              step === i + 1 ? 'bg-primary-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden md:block ${step === i + 1 ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < 3 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="card p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiUser /> Personal Information & Role
            </h2>

            {/* Role Selection */}
            <div>
              <label className="label">Account Type *</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ROLES.map(r => (
                  <div
                    key={r.value}
                    onClick={() => handleInput('role', r.value)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      form.role === r.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold">{r.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name *</label>
                <input className="input" value={form.firstName}
                  onChange={e => handleInput('firstName', e.target.value)}
                  placeholder="e.g. Bilal" />
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input className="input" value={form.lastName}
                  onChange={e => handleInput('lastName', e.target.value)}
                  placeholder="e.g. Ahmed" />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input className="input pl-9" value={form.phone}
                    onChange={e => handleInput('phone', e.target.value)}
                    placeholder="03XX-XXXXXXX" />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input className="input pl-9" value={form.email}
                    onChange={e => handleInput('email', e.target.value)}
                    placeholder="dealer@email.com" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="label">SIM Owner Name * (must match CNIC)</label>
                <input className="input" value={form.simOwnerName}
                  onChange={e => handleInput('simOwnerName', e.target.value)}
                  placeholder="Name registered on SIM card — must match CNIC" />
                <p className="text-xs text-amber-600 mt-1">⚠️ SIM must be registered in the dealer's own name. OTP will be sent to this number.</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiFileText /> Identity & Business Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">CNIC Number *</label>
                <input className="input" value={form.cnicNumber}
                  onChange={e => handleInput('cnicNumber', e.target.value)}
                  placeholder="XXXXX-XXXXXXX-X" />
              </div>
              <div>
                <label className="label">Business / Shop Name *</label>
                <input className="input" value={form.businessName}
                  onChange={e => handleInput('businessName', e.target.value)}
                  placeholder="e.g. Bilal Traders & Recycling" />
              </div>
              <div>
                <label className="label">City *</label>
                <select className="input" value={form.city}
                  onChange={e => handleInput('city', e.target.value)}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Area / Zone *</label>
                <input className="input" value={form.area}
                  onChange={e => handleInput('area', e.target.value)}
                  placeholder="e.g. Korangi, G-6, Bara Kahu" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Business Address *</label>
                <textarea className="input h-20" value={form.businessAddress}
                  onChange={e => handleInput('businessAddress', e.target.value)}
                  placeholder="Full address of shop/office..." />
              </div>
            </div>

            {/* CNIC Images */}
            <div>
              <label className="label">CNIC Images (Original front & back required)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUpload label="CNIC Front (Original)" field="cnicFront"
                  preview={previewUrls.cnicFront}
                  onChange={e => handleFile('cnicFront', e)} />
                <FileUpload label="CNIC Back (Original)" field="cnicBack"
                  preview={previewUrls.cnicBack}
                  onChange={e => handleFile('cnicBack', e)} />
              </div>
            </div>

            {/* Warehouse Details */}
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                🏭 Warehouse / Premises Details
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Address and photos of the existing warehouse. All 3 photos are required.
              </p>
              <div>
                <label className="label">Warehouse Address *</label>
                <textarea className="input h-20" value={form.warehouseAddress}
                  onChange={e => handleInput('warehouseAddress', e.target.value)}
                  placeholder="Complete address of existing warehouse..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <FileUpload label="📦 Inside Premises" field="warehouseInside"
                  preview={previewUrls.warehouseInside}
                  onChange={e => handleFile('warehouseInside', e)} />
                <FileUpload label="🛣️ Street Outside" field="warehouseStreet"
                  preview={previewUrls.warehouseStreet}
                  onChange={e => handleFile('warehouseStreet', e)} />
                <FileUpload label="🚪 Front Door" field="warehouseFrontDoor"
                  preview={previewUrls.warehouseFrontDoor}
                  onChange={e => handleFile('warehouseFrontDoor', e)} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiShield /> Verification Documents
            </h2>
            <p className="text-sm text-gray-500">
              Upload verification documents. These are required before the account can be activated.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload label="Police Verification Certificate" field="policeVerification"
                preview={previewUrls.policeVerification}
                onChange={e => handleFile('policeVerification', e)} />
              <FileUpload label="Character Certificate" field="characterCertificate"
                preview={previewUrls.characterCertificate}
                onChange={e => handleFile('characterCertificate', e)} />
              <FileUpload label="Dealer / Owner Photo (must match CNIC)" field="dealerPhoto"
                preview={previewUrls.dealerPhoto}
                onChange={e => handleFile('dealerPhoto', e)} />
              <FileUpload label="Shop / Office Photo" field="shopPhoto"
                preview={previewUrls.shopPhoto}
                onChange={e => handleFile('shopPhoto', e)} />
            </div>

            {/* Criminal Check Warning */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiShield className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-red-800 text-sm">Criminal Activity Check</p>
                  <p className="text-xs text-red-700 mt-1">
                    If this person is involved in any criminal activity, their ID will <strong>NOT</strong> be generated.
                    Verify police verification certificate and character certificate before proceeding.
                    You can update the criminal check status from the KYC Review page after creation.
                  </p>
                </div>
              </div>
            </div>

            {/* Banking (optional) */}
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
                <FiDollarSign /> Banking Details (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">NTN Number</label>
                  <input className="input" value={form.ntnNumber}
                    onChange={e => handleInput('ntnNumber', e.target.value)}
                    placeholder="Tax number (optional)" />
                </div>
                <div>
                  <label className="label">Bank Name</label>
                  <input className="input" value={form.bankName}
                    onChange={e => handleInput('bankName', e.target.value)}
                    placeholder="e.g. HBL, MCB, UBL" />
                </div>
                <div>
                  <label className="label">Account Title</label>
                  <input className="input" value={form.accountTitle}
                    onChange={e => handleInput('accountTitle', e.target.value)}
                    placeholder="Account holder name" />
                </div>
                <div>
                  <label className="label">Account / IBAN</label>
                  <input className="input" value={form.accountNumber}
                    onChange={e => handleInput('accountNumber', e.target.value)}
                    placeholder="PK00XXXX..." />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FiDollarSign /> Initial Balance & Review
            </h2>

            {/* Initial Balance */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 mb-2">💰 Initial Wallet Balance</h3>
              <p className="text-sm text-green-700 mb-4">
                Set the initial balance for this dealer. They can only access app features when balance {'>'} 0.
                This is your primary revenue source.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-green-800">₨</span>
                <input
                  className="input text-2xl font-bold w-48"
                  type="number"
                  min="0"
                  value={form.initialBalance}
                  onChange={e => handleInput('initialBalance', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex gap-2 mt-3">
                {[1000, 2000, 5000, 10000, 25000, 50000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleInput('initialBalance', amt.toString())}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      form.initialBalance === amt.toString()
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-green-700 border border-green-300 hover:bg-green-100'
                    }`}
                  >
                    ₨{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">📋 Account Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <SummaryRow label="Name" value={`${form.firstName} ${form.lastName}`} />
                <SummaryRow label="Phone" value={form.phone} />
                <SummaryRow label="Email" value={form.email || '—'} />
                <SummaryRow label="Role" value={ROLES.find(r => r.value === form.role)?.label} />
                <SummaryRow label="CNIC" value={form.cnicNumber} />
                <SummaryRow label="Business" value={form.businessName} />
                <SummaryRow label="City" value={form.city} />
                <SummaryRow label="Area" value={form.area} />
                <SummaryRow label="Address" value={form.businessAddress} />
                <SummaryRow label="Warehouse" value={form.warehouseAddress || form.businessAddress} />
                <SummaryRow label="SIM Owner" value={form.simOwnerName} />
                <SummaryRow label="Initial Balance" value={`₨ ${parseInt(form.initialBalance || '0').toLocaleString()}`} highlight />
                <SummaryRow label="Required Deposit" value={`₨ ${parseInt(form.requiredDeposit || '0').toLocaleString()}`} />
              </div>

              {/* Document Status */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Documents</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <DocStatus label="CNIC Front (Original)" uploaded={!!form.cnicFront} />
                  <DocStatus label="CNIC Back (Original)" uploaded={!!form.cnicBack} />
                  <DocStatus label="Dealer Photo (match CNIC)" uploaded={!!form.dealerPhoto} />
                  <DocStatus label="Warehouse Inside" uploaded={!!form.warehouseInside} />
                  <DocStatus label="Warehouse Street" uploaded={!!form.warehouseStreet} />
                  <DocStatus label="Warehouse Front Door" uploaded={!!form.warehouseFrontDoor} />
                  <DocStatus label="Police Verification" uploaded={!!form.policeVerification} />
                  <DocStatus label="Character Certificate" uploaded={!!form.characterCertificate} />
                  <DocStatus label="Shop Photo" uploaded={!!form.shopPhoto} />
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiShield className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-amber-800 text-sm">Security Notice</p>
                  <p className="text-xs text-amber-700 mt-1">
                    This dealer account will be created with status <strong>ACTIVE</strong>.
                    The dealer can only access listings, deals, and features if their balance {'>'} 0.
                    If involved in criminal activity, their ID will NOT be generated.
                    After creation, dealer must deposit the required amount. Customers register free.
                    You can suspend or deactivate from Users page. Review KYC on KYC Review page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          disabled={step === 1}
          onClick={() => setStep(step - 1)}
          className="btn-secondary disabled:opacity-50"
        >
          ← Previous
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Step {step} of 4</span>
          {step < 4 ? (
            <button
              disabled={!stepValid()}
              onClick={() => setStep(step + 1)}
              className="btn-primary disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <FiCheck /> Create Dealer Account
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FileUpload({ label, field, preview, onChange }) {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary-400 transition">
      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className="h-32 mx-auto rounded-lg object-cover" />
          <p className="text-xs text-green-600 mt-2 font-medium">✓ {label}</p>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <FiUpload className="mx-auto text-gray-400 mb-2" size={24} />
          <p className="text-sm text-gray-600 font-medium">{label}</p>
          <p className="text-xs text-gray-400 mt-1">Click to upload (JPG, PNG, PDF)</p>
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={onChange} />
        </label>
      )}
    </div>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div className={`flex justify-between py-1 ${highlight ? 'bg-green-100 px-2 rounded font-bold text-green-800' : ''}`}>
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function DocStatus({ label, uploaded }) {
  return (
    <div className={`flex items-center gap-2 py-1 px-2 rounded ${uploaded ? 'bg-green-50' : 'bg-red-50'}`}>
      {uploaded
        ? <FiCheck className="text-green-600" size={12} />
        : <FiX className="text-red-400" size={12} />}
      <span className={uploaded ? 'text-green-700' : 'text-red-500'}>{label}</span>
    </div>
  );
}
