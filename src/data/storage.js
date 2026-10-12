/**
 * storage.js — Centralized LocalStorage data layer
 * NOTE: LocalStorage authentication is for DEMONSTRATION ONLY — not production-secure.
 */

const KEYS = {
  USERS: 'sd_users',
  PRODUCTS: 'sd_products',
  ORDERS: 'sd_orders',
  RULES: 'sd_rules',
  COMPILER_HISTORY: 'sd_compiler_history',
  COUPONS: 'sd_coupons',
  INITIALIZED: 'sd_initialized',
};

// ─── Generic helpers ─────────────────────────────────────────────────────────
export const Store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(key); },
};

// ─── ID generator ────────────────────────────────────────────────────────────
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ─── Formatters ──────────────────────────────────────────────────────────────
export function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}
export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ─── Users ───────────────────────────────────────────────────────────────────
export const UserStore = {
  getAll() { return Store.get(KEYS.USERS) || []; },
  save(u) { Store.set(KEYS.USERS, u); },
  findByEmail(email) {
    return this.getAll().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  findById(id) { return this.getAll().find(u => u.id === id) || null; },
  add(user) { const u = this.getAll(); u.push(user); this.save(u); },
  update(updated) { this.save(this.getAll().map(u => u.id === updated.id ? updated : u)); },
  delete(id) { this.save(this.getAll().filter(u => u.id !== id)); },
  getCustomers() { return this.getAll().filter(u => u.role === 'customer'); },
};

// ─── Session ─────────────────────────────────────────────────────────────────
export const SessionStore = {
  get() { return Store.get('sd_session'); },
  set(user) {
    Store.set('sd_session', {
      id: user.id, email: user.email, name: user.name,
      role: user.role, phone: user.phone || '', addresses: user.addresses || []
    });
  },
  clear() { Store.remove('sd_session'); },
  isLoggedIn() { return !!this.get(); },
  isAdmin() { const s = this.get(); return s && s.role === 'admin'; },
  isCustomer() { const s = this.get(); return s && s.role === 'customer'; },
};

// ─── Products ────────────────────────────────────────────────────────────────
export const ProductStore = {
  getAll() { return Store.get(KEYS.PRODUCTS) || []; },
  save(p) { Store.set(KEYS.PRODUCTS, p); },
  findById(id) { return this.getAll().find(p => p.id === id) || null; },
  add(product) { const p = this.getAll(); p.push(product); this.save(p); },
  update(updated) { this.save(this.getAll().map(p => p.id === updated.id ? updated : p)); },
  delete(id) { this.save(this.getAll().filter(p => p.id !== id)); },
  getByCategory(cat) { return this.getAll().filter(p => p.category === cat); },
  search(query) {
    const q = query.toLowerCase();
    return this.getAll().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q)
    );
  },
  updateStock(id, delta) {
    const products = this.getAll();
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) {
      products[idx].stock = Math.max(0, products[idx].stock + delta);
      this.save(products);
    }
  },
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const OrderStore = {
  getAll() { return Store.get(KEYS.ORDERS) || []; },
  save(o) { Store.set(KEYS.ORDERS, o); },
  findById(id) { return this.getAll().find(o => o.id === id) || null; },
  getByCustomer(customerId) { return this.getAll().filter(o => o.customerId === customerId); },
  add(order) { const o = this.getAll(); o.unshift(order); this.save(o); },
  updateStatus(id, status) {
    this.save(this.getAll().map(o =>
      o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
    ));
  },
  update(updated) { this.save(this.getAll().map(o => o.id === updated.id ? updated : o)); },
};

// ─── Cart (per-user) ─────────────────────────────────────────────────────────
export const CartStore = {
  _key(userId) { return `sd_cart_${userId}`; },
  get(userId) { return Store.get(this._key(userId)) || []; },
  save(userId, items) { Store.set(this._key(userId), items); },
  clear(userId) { Store.remove(this._key(userId)); },
  addItem(userId, productId, quantity = 1) {
    const items = this.get(userId);
    const ex = items.find(i => i.productId === productId);
    if (ex) ex.quantity += quantity; else items.push({ productId, quantity });
    this.save(userId, items);
  },
  updateQty(userId, productId, quantity) {
    this.save(userId, this.get(userId)
      .map(i => i.productId === productId ? { ...i, quantity } : i)
      .filter(i => i.quantity > 0));
  },
  removeItem(userId, productId) {
    this.save(userId, this.get(userId).filter(i => i.productId !== productId));
  },
  getCount(userId) { return this.get(userId).reduce((s, i) => s + i.quantity, 0); },
};

// ─── Wishlist (per-user) ──────────────────────────────────────────────────────
export const WishlistStore = {
  _key(userId) { return `sd_wish_${userId}`; },
  get(userId) { return Store.get(this._key(userId)) || []; },
  save(userId, items) { Store.set(this._key(userId), items); },
  toggle(userId, productId) {
    const items = this.get(userId);
    const idx = items.indexOf(productId);
    if (idx === -1) items.push(productId); else items.splice(idx, 1);
    this.save(userId, items);
    return idx === -1;
  },
  has(userId, productId) { return this.get(userId).includes(productId); },
};

// ─── Rules ───────────────────────────────────────────────────────────────────
export const RuleStore = {
  getAll() { return Store.get(KEYS.RULES) || []; },
  save(r) { Store.set(KEYS.RULES, r); },
  findById(id) { return this.getAll().find(r => r.id === id) || null; },
  add(rule) { const r = this.getAll(); r.push(rule); this.save(r); },
  update(updated) { this.save(this.getAll().map(r => r.id === updated.id ? updated : r)); },
  delete(id) { this.save(this.getAll().filter(r => r.id !== id)); },
  getActive() { return this.getAll().filter(r => r.active && r.compiled); },
};

// ─── Compiler History ─────────────────────────────────────────────────────────
export const CompilerHistoryStore = {
  getAll() { return Store.get(KEYS.COMPILER_HISTORY) || []; },
  add(entry) {
    const h = this.getAll();
    h.unshift({ ...entry, id: generateId(), timestamp: new Date().toISOString() });
    if (h.length > 100) h.pop();
    Store.set(KEYS.COMPILER_HISTORY, h);
  },
  clear() { Store.remove(KEYS.COMPILER_HISTORY); },
};

// ─── Coupons ─────────────────────────────────────────────────────────────────
export const CouponStore = {
  getAll() { return Store.get(KEYS.COUPONS) || []; },
  save(c) { Store.set(KEYS.COUPONS, c); },
  findByCode(code) {
    return this.getAll().find(c => c.code.toUpperCase() === code.toUpperCase()) || null;
  },
};

// ─── Reset ───────────────────────────────────────────────────────────────────
export function resetDemoData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('sd_session');
  Object.keys(localStorage)
    .filter(k => k.startsWith('sd_cart_') || k.startsWith('sd_wish_'))
    .forEach(k => localStorage.removeItem(k));
  // re-seed
  import('./seed').then(m => m.initSeedData());
}

export { KEYS };
