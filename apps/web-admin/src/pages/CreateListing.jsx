import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCategories, getUnits, getCities, createListing, getMe } from '../services/api';

const STEPS = ['Category', 'Details', 'Location', 'Preview'];

export default function CreateListing() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    productTypeId: '',
    title: '',
    description: '',
    pricePaisa: '', // will send as number (rupees * 100)
    priceNegotiable: true,
    quantity: '',
    unitId: '',
    geoZoneId: '',
    cityName: '',
    address: '',
    contactNumber: '',
  });

  useEffect(() => {
    Promise.all([
      getCategories().then((r) => setCategories(Array.isArray(r.data) ? r.data : r.data?.data ?? [])),
      getUnits().then((r) => setUnits(Array.isArray(r.data) ? r.data : r.data?.data ?? [])),
      getCities().then((r) => setZones(Array.isArray(r.data) ? r.data : r.data?.data ?? [])).catch(() => []),
      getMe().then((r) => {
        if (r.data?.contactNumber) setForm((f) => ({ ...f, contactNumber: r.data.contactNumber }));
        if (r.data?.phone) setForm((f) => ({ ...f, contactNumber: form.contactNumber || r.data.phone }));
        if (r.data?.geoZoneId) setForm((f) => ({ ...f, geoZoneId: r.data.geoZoneId, cityName: r.data.geoZone?.name || f.cityName }));
      }).catch(() => {}),
    ]);
  }, []);

  const canNext = () => {
    if (step === 0) return !!form.categoryId;
    if (step === 1) return !!(form.title?.trim() && form.quantity && form.pricePaisa && form.unitId && form.description?.trim());
    if (step === 2) return !!(form.geoZoneId || form.cityName);
    return true;
  };

  const handleSubmit = async () => {
    const rupees = parseFloat(form.pricePaisa) || 0;
    const pricePaisa = Math.round(rupees * 100);
    if (pricePaisa <= 0) {
      toast.error('Enter a valid price');
      return;
    }
    setLoading(true);
    try {
      await createListing({
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        productTypeId: form.productTypeId || undefined,
        pricePaisa: String(pricePaisa),
        priceNegotiable: form.priceNegotiable,
        quantity: parseFloat(form.quantity) || 0,
        unitId: form.unitId,
        geoZoneId: form.geoZoneId || undefined,
        cityName: form.cityName || undefined,
        address: form.address || undefined,
        contactNumber: form.contactNumber || undefined,
      });
      toast.success('Listing posted!');
      navigate('/marketplace');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const unitLabel = (u) => u.translations?.[0]?.abbreviation || u.slug;
  const catLabel = (c) => c.translations?.[0]?.name || c.name || c.slug;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Post a Listing</h1>
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded ${i <= step ? 'bg-green-600' : 'bg-gray-200'}`}
            title={s}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="card space-y-4">
          <label className="block font-medium text-gray-700">Category *</label>
          <select
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{catLabel(c)}</option>
            ))}
          </select>
        </div>
      )}

      {step === 1 && (
        <div className="card space-y-4">
          <div>
            <label className="block font-medium text-gray-700">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. 200 kg Copper Wire" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-gray-700">Quantity *</label>
              <input type="number" className="input" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="200" />
            </div>
            <div>
              <label className="block font-medium text-gray-700">Unit *</label>
              <select className="input" value={form.unitId} onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}>
                <option value="">Select</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{unitLabel(u)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-medium text-gray-700">Price (Rs. PKR) *</label>
            <input type="number" className="input" value={form.pricePaisa} onChange={(e) => setForm((f) => ({ ...f, pricePaisa: e.target.value }))} placeholder="25000" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.priceNegotiable} onChange={(e) => setForm((f) => ({ ...f, priceNegotiable: e.target.checked }))} />
            <span className="text-sm text-gray-700">Price negotiable</span>
          </label>
          <div>
            <label className="block font-medium text-gray-700">Description *</label>
            <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe your listing" />
          </div>
          <div>
            <label className="block font-medium text-gray-700">Contact Number</label>
            <input className="input" value={form.contactNumber} onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))} placeholder="+92 3XX-XXXXXXX" />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4">
          <div>
            <label className="block font-medium text-gray-700">City / Zone *</label>
            <select
              className="input"
              value={form.geoZoneId}
              onChange={(e) => {
                const z = zones.find((x) => x.id === e.target.value);
                setForm((f) => ({ ...f, geoZoneId: e.target.value, cityName: z?.name || f.cityName }));
              }}
            >
              <option value="">Select city or zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name || z.slug}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700">Address / Area</label>
            <input className="input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="e.g. Korangi Industrial Area" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-gray-900">{form.title || 'Untitled'}</h3>
          <p className="text-lg font-bold text-green-600">₨ {(parseFloat(form.pricePaisa) || 0).toLocaleString()} / {units.find((u) => u.id === form.unitId) ? unitLabel(units.find((u) => u.id === form.unitId)) : 'unit'}</p>
          <p className="text-sm text-gray-600">{form.quantity} {units.find((u) => u.id === form.unitId) ? unitLabel(units.find((u) => u.id === form.unitId)) : ''} • {form.priceNegotiable ? 'Negotiable' : 'Fixed'}</p>
          <p className="text-gray-700">{form.description || '—'}</p>
          <p className="text-sm text-gray-500">Location: {form.cityName || zones.find((z) => z.id === form.geoZoneId)?.name || form.address || '—'}</p>
        </div>
      )}

      <div className="flex justify-between">
        <button type="button" className="btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Next
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Posting...' : 'Submit Listing'}
          </button>
        )}
      </div>
    </div>
  );
}
