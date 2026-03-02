import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus, FiGlobe, FiSearch, FiUpload, FiSave } from 'react-icons/fi';
import { getLanguages, getTranslations, saveTranslation, bulkImportTranslations } from '../services/api';

export default function Translations() {
  const [languages, setLanguages] = useState([]);
  const [selectedLang, setSelectedLang] = useState('');
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ key: '', value: '' });
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    getLanguages().then(r => {
      const langs = r.data?.languages || r.data || [];
      setLanguages(langs);
      if (langs.length > 0) setSelectedLang(langs[0].id);
    }).catch(() => toast.error('Failed to load languages'));
  }, []);

  useEffect(() => {
    if (selectedLang) fetchTranslations();
  }, [selectedLang]);

  const fetchTranslations = async () => {
    setLoading(true);
    try {
      const res = await getTranslations(selectedLang);
      setTranslations(res.data?.translations || res.data || []);
    } catch { toast.error('Failed to load translations'); }
    finally { setLoading(false); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.key || !form.value) { toast.error('Key and value required'); return; }
    try {
      await saveTranslation({ languageId: selectedLang, key: form.key, value: form.value });
      toast.success('Translation added');
      setShowAdd(false);
      setForm({ key: '', value: '' });
      fetchTranslations();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleInlineEdit = async (key) => {
    if (!editValue.trim()) return;
    try {
      await saveTranslation({ languageId: selectedLang, key, value: editValue });
      toast.success('Updated');
      setEditingKey(null);
      fetchTranslations();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleBulkImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await bulkImportTranslations({ languageId: selectedLang, translations: data });
        toast.success('Bulk import done');
        fetchTranslations();
      } catch (err) {
        toast.error('Invalid JSON or import failed');
      }
    };
    input.click();
  };

  const filtered = translations.filter(t =>
    !search || t.key?.toLowerCase().includes(search.toLowerCase()) || t.value?.toLowerCase().includes(search.toLowerCase())
  );

  const currentLang = languages.find(l => l.id === selectedLang);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Translations</h1>
          <p className="text-sm text-gray-500 mt-1">Manage i18n for Urdu + English</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleBulkImport} className="btn-secondary"><FiUpload size={16} /> Import JSON</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><FiPlus size={16} /> Add Key</button>
        </div>
      </div>

      {/* Language Tabs */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <FiGlobe size={18} className="text-gray-400" />
          <div className="flex gap-2">
            {languages.map(l => (
              <button
                key={l.id}
                onClick={() => setSelectedLang(l.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedLang === l.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {l.name} ({l.code})
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input pl-9" placeholder="Search keys or values..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-6 py-3 font-medium w-1/3">Key</th>
                <th className="px-6 py-3 font-medium">Value ({currentLang?.code || ''})</th>
                <th className="px-6 py-3 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400">No translations</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.key || t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">{t.key}</td>
                    <td className="px-6 py-3" dir={currentLang?.code === 'ur' ? 'rtl' : 'ltr'}>
                      {editingKey === t.key ? (
                        <div className="flex gap-2">
                          <input
                            className="input text-sm flex-1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            dir={currentLang?.code === 'ur' ? 'rtl' : 'ltr'}
                            autoFocus
                          />
                          <button onClick={() => handleInlineEdit(t.key)} className="btn-primary text-xs py-1"><FiSave size={12} /></button>
                          <button onClick={() => setEditingKey(null)} className="btn-secondary text-xs py-1">✕</button>
                        </div>
                      ) : (
                        <span className="text-gray-800">{t.value}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {editingKey !== t.key && (
                        <button
                          onClick={() => { setEditingKey(t.key); setEditValue(t.value); }}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Key Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add Translation Key</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
                <input className="input font-mono text-sm" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="e.g. common.save" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value ({currentLang?.code}) *</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  dir={currentLang?.code === 'ur' ? 'rtl' : 'ltr'}
                  placeholder={currentLang?.code === 'ur' ? 'اردو ترجمہ...' : 'English text...'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Add</button>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
