import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Users, Package, DollarSign, TrendingUp, Zap, CheckCircle, XCircle, Activity } from 'lucide-react';
import { OrderStore, UserStore, ProductStore, RuleStore, CompilerHistoryStore, formatCurrency } from '../../data/storage';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: color + '22', color }}>{icon}</div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="stat-label">{label}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const orders = OrderStore.getAll();
  const customers = UserStore.getCustomers();
  const products = ProductStore.getAll();
  const rules = RuleStore.getAll();
  const history = CompilerHistoryStore.getAll();

  const revenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((s, o) => s + o.total, 0);

  const pending = orders.filter(o => o.status === 'Pending').length;
  const lowStock = products.filter(p => p.stock < 10).length;
  const activeRules = rules.filter(r => r.active && r.compiled).length;
  const successfulCompiles = history.filter(h => h.success).length;
  const failedCompiles = history.filter(h => !h.success).length;

  const recentOrders = orders.slice(0, 5);

  const STATUS_COLORS = {
    Pending: '#f59e0b', Confirmed: '#3b82f6', Shipped: '#8b5cf6',
    Delivered: '#10b981', Cancelled: '#ef4444'
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <p>Overview of your ShopDemo platform</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={<DollarSign size={20} />} label="Total Revenue" value={formatCurrency(revenue)} sub={`${orders.filter(o => o.status !== 'Cancelled').length} orders`} color="#10b981" />
        <StatCard icon={<ShoppingBag size={20} />} label="Total Orders" value={orders.length} sub={`${pending} pending`} color="#6366f1" />
        <StatCard icon={<Users size={20} />} label="Customers" value={customers.length} color="#3b82f6" />
        <StatCard icon={<Package size={20} />} label="Products" value={products.length} sub={lowStock > 0 ? `${lowStock} low stock` : 'All stocked'} color="#f59e0b" />
        <StatCard icon={<Zap size={20} />} label="Active Rules" value={activeRules} sub={`${rules.length} total`} color="#8b5cf6" />
        <StatCard icon={<Activity size={20} />} label="Compilations" value={history.length} sub={`${successfulCompiles} success, ${failedCompiles} failed`} color="#ec4899" />
      </div>

      <div className="dashboard-grid">
        {/* Recent Orders */}
        <div className="dashboard-card">
          <div className="card-header">
            <span>Recent Orders</span>
            <Link to="/admin/orders" className="card-link">View all</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No orders yet</td></tr>
                ) : recentOrders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', color: '#818cf8' }}>#{o.id.slice(-6).toUpperCase()}</td>
                    <td style={{ color: '#e2e8f0' }}>{o.customerName}</td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(o.total)}</td>
                    <td>
                      <span style={{
                        padding: '.2rem .6rem', borderRadius: '100px', fontSize: '.75rem', fontWeight: 700,
                        background: STATUS_COLORS[o.status] + '22', color: STATUS_COLORS[o.status]
                      }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compiler Status */}
        <div className="dashboard-card">
          <div className="card-header">
            <span><Zap size={15} /> Compiler Engine</span>
            <Link to="/admin/compiler" className="card-link">Open Compiler</Link>
          </div>
          <div className="compiler-stats">
            <div className="cstat"><CheckCircle size={16} color="#10b981" /> <span>Successful Compilations</span> <strong style={{ color: '#10b981' }}>{successfulCompiles}</strong></div>
            <div className="cstat"><XCircle size={16} color="#ef4444" /> <span>Failed Compilations</span> <strong style={{ color: '#ef4444' }}>{failedCompiles}</strong></div>
            <div className="cstat"><Zap size={16} color="#818cf8" /> <span>Active Rules</span> <strong style={{ color: '#818cf8' }}>{activeRules}</strong></div>
            <div className="cstat"><Package size={16} color="#f59e0b" /> <span>Total Rules Saved</span> <strong style={{ color: '#f59e0b' }}>{rules.length}</strong></div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            {rules.filter(r => r.active).slice(0, 3).map(r => (
              <div key={r.id} className="active-rule-chip">
                <span>⚡ {r.name}</span>
                <span style={{ color: '#10b981', fontSize: '.75rem', fontWeight: 700 }}>ACTIVE</span>
              </div>
            ))}
            {rules.filter(r => r.active).length === 0 && (
              <p style={{ color: '#475569', fontSize: '.875rem' }}>No active rules. <Link to="/admin/compiler/editor" style={{ color: '#818cf8' }}>Create one →</Link></p>
            )}
          </div>
        </div>

        {/* Low stock */}
        {lowStock > 0 && (
          <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <span>⚠️ Low Stock Products</span>
              <Link to="/admin/products" className="card-link">Manage</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '.75rem' }}>
              {products.filter(p => p.stock < 10).map(p => (
                <div key={p.id} className="low-stock-item">
                  <span className="ls-emoji">{p.image}</span>
                  <div>
                    <p className="ls-name">{p.name}</p>
                    <p className="ls-stock" style={{ color: p.stock === 0 ? '#ef4444' : '#f59e0b' }}>
                      {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { margin-bottom: 1.5rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.5rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
        @media(max-width:1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        @media(max-width:600px) { .stats-grid { grid-template-columns: 1fr; } }
        .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
        .stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-value { font-size: 1.5rem; font-weight: 800; color: #f1f5f9; line-height: 1.2; }
        .stat-label { font-size: .75rem; color: #64748b; text-transform: uppercase; letter-spacing: .05em; }
        .stat-sub { font-size: .75rem; color: #94a3b8; margin-top: .1rem; }
        .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media(max-width:900px) { .dashboard-grid { grid-template-columns: 1fr; } }
        .dashboard-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
        .card-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #334155; font-weight: 700; color: #f1f5f9; font-size: .9rem; }
        .card-link { font-size: .8rem; color: #818cf8; }
        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0f172a; padding: .625rem 1rem; font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #475569; border-bottom: 1px solid #334155; text-align: left; }
        td { padding: .75rem 1rem; border-bottom: 1px solid #1e293b; font-size: .85rem; color: #94a3b8; }
        tr:hover td { background: #0f172a; }
        .compiler-stats { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .625rem; }
        .cstat { display: flex; align-items: center; gap: .625rem; font-size: .875rem; color: #94a3b8; }
        .cstat strong { margin-left: auto; font-size: 1rem; }
        .active-rule-chip { display: flex; justify-content: space-between; align-items: center; padding: .5rem .75rem; background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.2); border-radius: 8px; margin: .35rem 1.25rem; font-size: .8rem; color: #94a3b8; }
        .low-stock-item { display: flex; align-items: center; gap: .75rem; padding: .75rem; background: #0f172a; border-radius: 10px; }
        .ls-emoji { font-size: 1.5rem; }
        .ls-name { font-size: .8rem; font-weight: 700; color: #e2e8f0; }
        .ls-stock { font-size: .75rem; font-weight: 700; }
      `}</style>
    </div>
  );
}
