import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiGlobe, FiTrash2 } from 'react-icons/fi';
import { getCategories, createCategory, updateCategory, upsertCategoryTranslation, getLanguages } from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', iconUrl: '', isRecyclable: false, isReusable: false });
  const [transForm, setTransForm] = useState({ languageId: '', name: '', description: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, langRes] = await Promise.all([getCategories(), getLanguages()]);
      setCategories(catRes.data?.categories || catRes.data || []);
      setLanguages(langRes.data?.languages || langRes.data || []);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', description: '', iconUrl: '', isRecyclable: false, isReusable: false });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditItem(cat);
    setForm({ name: cat.name, description: cat.description || '', iconUrl: cat.iconUrl || '', isRecyclable: cat.isRecyclable, isReusable: cat.isReusable });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (editItem) await updateCategory(editItem.id, form);
      else await createCategory(form);
      toast.success(editItem ? 'Category updated' : 'Category created');
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openTranslation = (cat) => {
    setShowTransModal(cat);
    setTransForm({ languageId: languages[0]?.id || '', name: '', description: '' });
  };

  const handleSaveTranslation = async (e) => {
    e.preventDefault();
    if (!transForm.languageId || !transForm.name) { toast.error('Language and name required'); return; }
    try {
      await upsertCategoryTranslation(showTransModal.id, transForm);
      toast.success('Translation saved');
      setShowTransModal(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Manage waste / product categories</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><FiPlus size={16} /> Add Category</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : categories.length === 0 ? (
          <p className="col-span-full text-center text-gray-400 py-12">No categories yet</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="card hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {cat.iconUrl ? (
                    <img src={cat.iconUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold">
                      {cat.name?.[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{cat.description || 'No description'}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                {cat.isRecyclable && <span className="badge-green">Recyclable</span>}
                {cat.isReusable && <span className="badge-blue">Reusable</span>}
                {cat._count?.productTypes != null && (
                  <span className="badge-gray">{cat._count.productTypes} types</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(cat)} className="btn-secondary text-xs py-1.5 px-3">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => openTranslation(cat)} className="btn-secondary text-xs py-1.5 px-3">
                  <FiGlobe size={12} /> Translate
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editItem ? 'Edit Category' : 'New Category'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Plastic" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon URL</label>
                <input className="input" value={form.iconUrl} onChange={(e) => setForm({ ...form, iconUrl: e.target.value })} placeholder="/icons/plastic.png" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isRecyclable} onChange={(e) => setForm({ ...form, isRecyclable: e.target.checked })} className="rounded text-primary-600" />
                  Recyclable
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isReusable} onChange={(e) => setForm({ ...form, isReusable: e.target.checked })} className="rounded text-primary-600" />
                  Reusable
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">{editItem ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Translation Modal */}
      {showTransModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Translate: {showTransModal.name}</h3>
            <form onSubmit={handleSaveTranslation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language *</label>
                <select className="input" value={transForm.languageId} onChange={(e) => setTransForm({ ...transForm, languageId: e.target.value })}>
                  {languages.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Translated Name *</label>
                <input className="input" value={transForm.name} onChange={(e) => setTransForm({ ...transForm, name: e.target.value })} placeholder="e.g. پلاسٹک" dir="auto" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Translated Description</label>
                <textarea className="input" rows={2} value={transForm.description} onChange={(e) => setTransForm({ ...transForm, description: e.target.value })} dir="auto" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Save Translation</button>
                <button type="button" onClick={() => setShowTransModal(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
