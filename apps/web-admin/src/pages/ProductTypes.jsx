import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiFilter, FiTag } from 'react-icons/fi';
import { getProductTypes, createProductType, createAttribute, getCategories, getUnits } from '../services/api';

export default function ProductTypes() {
  const [types, setTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAttrModal, setShowAttrModal] = useState(null);
  const [form, setForm] = useState({ name: '', categoryId: '', description: '', iconUrl: '', baseUnitId: '' });
  const [attrForm, setAttrForm] = useState({ name: '', type: 'TEXT', isRequired: false, options: '' });

  useEffect(() => { fetchData(); }, [catFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (catFilter) params.categoryId = catFilter;
      const [tRes, cRes, uRes] = await Promise.all([getProductTypes(params), getCategories(), getUnits()]);
      setTypes(tRes.data?.productTypes || tRes.data || []);
      setCategories(cRes.data?.categories || cRes.data || []);
      setUnits(uRes.data?.units || uRes.data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.categoryId) { toast.error('Name and category required'); return; }
    try {
      await createProductType(form);
      toast.success('Product type created');
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleAddAttr = async (e) => {
    e.preventDefault();
    if (!attrForm.name || !attrForm.type) { toast.error('Name and type required'); return; }
    try {
      const payload = { ...attrForm };
      if (payload.options) payload.options = payload.options.split(',').map(o => o.trim());
      await createAttribute(showAttrModal.id, payload);
      toast.success('Attribute added');
      setShowAttrModal(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Types</h1>
          <p className="text-sm text-gray-500 mt-1">Admin-managed product type catalog</p>
        </div>
        <button onClick={() => { setForm({ name: '', categoryId: categories[0]?.id || '', description: '', iconUrl: '', baseUnitId: '' }); setShowModal(true); }} className="btn-primary">
          <FiPlus size={16} /> Add Type
        </button>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex items-center gap-3">
          <FiFilter size={16} className="text-gray-400" />
          <select className="input w-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : types.length === 0 ? (
          <p className="col-span-full text-center text-gray-400 py-12">No product types</p>
        ) : (
          types.map((t) => (
            <div key={t.id} className="card hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-sm">
                  {t.name?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-gray-500">{t.category?.name || '—'}</p>
                </div>
              </div>
              {t.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>}
              <div className="flex items-center gap-2 mb-3">
                {t.baseUnit && <span className="badge-gray">Unit: {t.baseUnit.abbreviation}</span>}
                {t._count?.attributes != null && <span className="badge-blue">{t._count.attributes} attrs</span>}
              </div>
              {/* Attributes preview */}
              {t.attributes?.length > 0 && (
                <div className="mb-3 space-y-1">
                  {t.attributes.slice(0, 3).map(a => (
                    <div key={a.id} className="text-xs flex items-center gap-1 text-gray-600">
                      <FiTag size={10} /> {a.name} <span className="text-gray-400">({a.type})</span>
                      {a.isRequired && <span className="text-red-400">*</span>}
                    </div>
                  ))}
                  {t.attributes.length > 3 && <p className="text-xs text-gray-400">+{t.attributes.length - 3} more</p>}
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => { setShowAttrModal(t); setAttrForm({ name: '', type: 'TEXT', isRequired: false, options: '' }); }} className="btn-secondary text-xs py-1.5 px-3">
                  <FiPlus size={12} /> Add Attribute
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Type Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">New Product Type</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PET Bottles" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Unit</label>
                <select className="input" value={form.baseUnitId} onChange={(e) => setForm({ ...form, baseUnitId: e.target.value })}>
                  <option value="">Select...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Create</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Attribute Modal */}
      {showAttrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add Attribute to: {showAttrModal.name}</h3>
            <form onSubmit={handleAddAttr} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attribute Name *</label>
                <input className="input" value={attrForm.name} onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })} placeholder="e.g. Color" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select className="input" value={attrForm.type} onChange={(e) => setAttrForm({ ...attrForm, type: e.target.value })}>
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="SELECT">Select (dropdown)</option>
                  <option value="BOOLEAN">Boolean</option>
                  <option value="DATE">Date</option>
                </select>
              </div>
              {attrForm.type === 'SELECT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options (comma separated)</label>
                  <input className="input" value={attrForm.options} onChange={(e) => setAttrForm({ ...attrForm, options: e.target.value })} placeholder="Red, Green, Blue" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={attrForm.isRequired} onChange={(e) => setAttrForm({ ...attrForm, isRequired: e.target.checked })} className="rounded text-primary-600" />
                Required
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Add</button>
                <button type="button" onClick={() => setShowAttrModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
