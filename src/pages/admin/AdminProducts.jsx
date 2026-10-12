import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Save, X } from 'lucide-react';
import { ProductStore, generateId, formatCurrency } from '../../data/storage';

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports', 'Beauty', 'Toys'];
const EMOJIS = { Electronics: '📱', Fashion: '👗', 'Home & Kitchen': '🏠', Books: '📚', Sports: '⚽', Beauty: '💄', Toys: '🧸' };

const EMPTY_PRODUCT = { name: '', category: 'Electronics', brand: '', price: '', originalPrice: '', stock: '', description: '', image: '📱', rating: 4.0, reviews: 0, featured: false };

export default function AdminProducts() {
  const [products, setProducts] = useState(ProductStore.getAll());
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});

  function reload() { setProducts(ProductStore.getAll()); }

  function openAdd() {
    setForm({ ...EMPTY_PRODUCT, image: EMOJIS['Electronics'] });
    setEditing(null);
    setShowForm(true);
    setErrors({});
  }

  function openEdit(product) {
    setForm({ ...product });
    setEditing(product.id);
    setShowForm(true);
    setErrors({});
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    ProductStore.delete(id);
    reload();
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.price || isNaN(form.price) || +form.price <= 0) e.price = 'Valid price required';
    if (!form.stock || isNaN(form.stock) || +form.stock < 0) e.stock = 'Valid stock required';
    if (!form.description.trim()) e.description = 'Description required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const product = {
      ...form,
      price: parseFloat(form.price),
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
      stock: parseInt(form.stock),
      image: EMOJIS[form.category] || '📦',
    };
    if (editing) {
      ProductStore.update({ ...product, id: editing });
    } else {
      ProductStore.add({ ...product, id: generateId() });
    }
    reload();
    setShowForm(false);
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Products</h1>
          <p>{products.length} total products</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Product</button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h2>{editing ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Product Name</label>
                  <input className="form-control dark-input" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  {errors.name && <p className="form-error">{errors.name}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control dark-input" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value, image: EMOJIS[e.target.value] || '📦' }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input className="form-control dark-input" value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Price (₹)</label>
                  <input type="number" className="form-control dark-input" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                  {errors.price && <p className="form-error">{errors.price}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Original Price (₹) — optional</label>
                  <input type="number" className="form-control dark-input" value={form.originalPrice}
                    onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock</label>
                  <input type="number" className="form-control dark-input" value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                  {errors.stock && <p className="form-error">{errors.stock}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Rating</label>
                  <input type="number" min="1" max="5" step="0.1" className="form-control dark-input" value={form.rating}
                    onChange={e => setForm(f => ({ ...f, rating: parseFloat(e.target.value) }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Description</label>
                  <textarea className="form-control dark-input" rows={3} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  {errors.description && <p className="form-error">{errors.description}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.featured}
                      onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                    Featured Product
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <Search size={16} />
        <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{p.image}</span>
                      <div>
                        <p style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '.875rem' }}>{p.name}</p>
                        <p style={{ fontSize: '.75rem', color: '#64748b' }}>{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(p.price)}</td>
                  <td>
                    <span style={{ color: p.stock === 0 ? '#ef4444' : p.stock < 10 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                      {p.stock}
                    </span>
                  </td>
                  <td style={{ color: '#f59e0b' }}>★ {p.rating}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <button className="btn-icon-admin edit" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                      <button className="btn-icon-admin del" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.5rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .search-bar { display: flex; align-items: center; gap: .75rem; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: .5rem 1rem; margin-bottom: 1rem; color: #64748b; }
        .search-input { background: none; border: none; outline: none; color: #e2e8f0; font-size: .9rem; flex: 1; }
        .search-input::placeholder { color: #475569; }
        .admin-table-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
        th { background: #0f172a; padding: .75rem 1rem; font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #475569; border-bottom: 1px solid #334155; text-align: left; }
        td { padding: .875rem 1rem; border-bottom: 1px solid #1e293b; font-size: .875rem; color: #94a3b8; }
        tr:hover td { background: #0f172a; }
        .btn-icon-admin { border: none; border-radius: 6px; padding: .4rem; cursor: pointer; display: flex; align-items: center; transition: background .15s; }
        .btn-icon-admin.edit { background: rgba(99,102,241,.1); color: #818cf8; }
        .btn-icon-admin.edit:hover { background: rgba(99,102,241,.25); }
        .btn-icon-admin.del { background: rgba(239,68,68,.1); color: #f87171; }
        .btn-icon-admin.del:hover { background: rgba(239,68,68,.25); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .modal-box { background: #1e293b; border: 1px solid #334155; border-radius: 16px; width: 100%; max-width: 580px; max-height: 90vh; display: flex; flex-direction: column; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #334155; }
        .modal-header h2 { color: #f1f5f9; font-size: 1.1rem; }
        .modal-close { background: none; border: none; color: #64748b; cursor: pointer; display: flex; padding: .25rem; border-radius: 6px; }
        .modal-close:hover { color: #f1f5f9; }
        .modal-body { padding: 1.5rem; overflow-y: auto; }
        .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: .75rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media(max-width:480px) { .form-grid { grid-template-columns: 1fr; } }
        .dark-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        .dark-input:focus { border-color: #6366f1 !important; }
        .form-label { color: #94a3b8 !important; }
        .form-error { color: #f87171 !important; }
      `}</style>
    </div>
  );
}
