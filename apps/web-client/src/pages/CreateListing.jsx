import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUpload, FiX } from 'react-icons/fi';
import api from '../services/api';

export default function CreateListing() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    productTypeId: '',
    unitId: '',
    quantity: '',
    pricePaisa: '',
    priceNegotiable: false,
    condition: 'USED',
  });
  const [images, setImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/categories').catch(() => ({ data: [] })),
      api.get('/units').catch(() => ({ data: [] })),
    ]).then(([catRes, unitRes]) => {
      setCategories(catRes.data?.data || catRes.data || []);
      setUnits(unitRes.data?.data || unitRes.data || []);
    });
  }, []);

  useEffect(() => {
    if (form.categoryId) {
      api.get(`/product-types?categoryId=${form.categoryId}`)
        .then((res) => setProductTypes(res.data?.data || res.data || []))
        .catch(() => setProductTypes([]));
    }
  }, [form.categoryId]);

  const update = (key, val) => setForm({ ...form, [key]: val });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages([...images, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreview([...imagePreview, ...previews]);
  };

  const removeImage = (idx) => {
    setImages(images.filter((_, i) => i !== idx));
    setImagePreview(imagePreview.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.categoryId || !form.quantity || !form.pricePaisa) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val !== '' && val !== undefined) formData.append(key, val);
      });
      images.forEach((img) => formData.append('images', img));

      await api.post('/listings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Listing posted successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create listing');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Post a Listing</h1>
      <p className="text-gray-500 text-sm mb-8">List your recyclable or reusable goods for local buyers</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input type="text" required value={form.title} onChange={(e) => update('title', e.target.value)}
            className="input-field" placeholder="e.g. 500kg Copper Wire Scrap — Clean Grade A" />
        </div>

        {/* Category & Product Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
            <select required value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} className="input-field">
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
            <select value={form.productTypeId} onChange={(e) => update('productTypeId', e.target.value)} className="input-field"
              disabled={!form.categoryId}>
              <option value="">Select Type</option>
              {productTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" required value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)} className="input-field" placeholder="e.g. 500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select value={form.unitId} onChange={(e) => update('unitId', e.target.value)} className="input-field">
              <option value="">Select Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₨ PKR) <span className="text-red-500">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₨</span>
              <input type="number" required value={form.pricePaisa}
                onChange={(e) => update('pricePaisa', e.target.value)}
                className="input-field !pl-8" placeholder="5000" />
            </div>
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.priceNegotiable}
                onChange={(e) => update('priceNegotiable', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded" />
              <span className="text-sm text-gray-700">Price Negotiable</span>
            </label>
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
          <div className="flex gap-3">
            {['NEW', 'USED', 'REFURBISHED', 'SCRAP'].map((c) => (
              <label key={c}
                className={`flex-1 text-center py-2 rounded-lg border cursor-pointer text-sm font-medium transition-colors
                  ${form.condition === c ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                <input type="radio" name="condition" value={c} checked={form.condition === c}
                  onChange={() => update('condition', c)} className="sr-only" />
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea rows={4} value={form.description} onChange={(e) => update('description', e.target.value)}
            className="input-field resize-none" placeholder="Describe the material quality, source, pickup location details, etc." />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photos (max 5)</label>
          <div className="flex flex-wrap gap-3">
            {imagePreview.map((src, idx) => (
              <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full">
                  <FiX size={12} />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                <FiUpload size={20} className="text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">Upload</span>
                <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-50">
            {loading ? 'Posting...' : 'Post Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
