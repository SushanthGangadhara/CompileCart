import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { OrderStore, formatCurrency, formatDateTime } from '../../data/storage';

const STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const STATUS_COLORS = {
  Pending: '#f59e0b', Confirmed: '#3b82f6', Shipped: '#8b5cf6',
  Delivered: '#10b981', Cancelled: '#ef4444'
};

export default function AdminOrders() {
  const [orders, setOrders] = useState(OrderStore.getAll());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  function updateStatus(id, status) {
    OrderStore.updateStatus(id, status);
    setOrders(OrderStore.getAll());
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.id.includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Orders</h1>
          <p>{orders.length} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={16} />
          <input placeholder="Search orders, customers..." value={search}
            onChange={e => setSearch(e.target.value)} className="search-input" />
        </div>
        <select className="form-control dark-input" style={{ width: 'auto', minWidth: '150px' }}
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="admin-table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                <th>Update</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No orders found</td></tr>
              ) : filtered.map(o => (
                <React.Fragment key={o.id}>
                  <tr>
                    <td style={{ fontFamily: 'monospace', color: '#818cf8', fontSize: '.8rem' }}>
                      #{o.id.slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '.85rem' }}>{o.customerName}</p>
                      <p style={{ color: '#64748b', fontSize: '.75rem' }}>{o.customerEmail}</p>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{o.items.length} item(s)</td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(o.total)}</td>
                    <td style={{ color: '#64748b', fontSize: '.8rem' }}>{formatDateTime(o.createdAt)}</td>
                    <td>
                      <span style={{
                        padding: '.25rem .65rem', borderRadius: '100px', fontSize: '.75rem', fontWeight: 700,
                        background: STATUS_COLORS[o.status] + '22', color: STATUS_COLORS[o.status]
                      }}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="status-select"
                        value={o.status}
                        onChange={e => updateStatus(o.id, e.target.value)}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button className="expand-btn" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                        <ChevronDown size={15} style={{ transform: expanded === o.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                      </button>
                    </td>
                  </tr>
                  {expanded === o.id && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div className="order-detail-expand">
                          <div className="expand-section">
                            <p className="expand-title">Items</p>
                            {o.items.map((item, i) => (
                              <div key={i} className="expand-item">
                                <span>{item.name} × {item.quantity}</span>
                                <span style={{ color: '#10b981' }}>{formatCurrency(item.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="expand-section">
                            <p className="expand-title">Price Breakdown</p>
                            <div className="expand-item"><span>Subtotal</span><span>{formatCurrency(o.subtotal)}</span></div>
                            {o.discount > 0 && <div className="expand-item"><span>Discount</span><span style={{ color: '#10b981' }}>-{formatCurrency(o.discount)}</span></div>}
                            <div className="expand-item"><span>Shipping</span><span>{o.shipping === 0 ? 'FREE' : formatCurrency(o.shipping)}</span></div>
                            <div className="expand-item" style={{ fontWeight: 700, color: '#f1f5f9' }}><span>Total</span><span>{formatCurrency(o.total)}</span></div>
                          </div>
                          <div className="expand-section">
                            <p className="expand-title">Delivery</p>
                            <p style={{ fontSize: '.8rem', color: '#94a3b8' }}>
                              {o.address?.line1}, {o.address?.city}, {o.address?.state} - {o.address?.pincode}
                            </p>
                            {o.appliedRules?.length > 0 && (
                              <>
                                <p className="expand-title" style={{ marginTop: '.5rem' }}>Applied Rules</p>
                                {o.appliedRules.map((r, i) => (
                                  <p key={i} style={{ fontSize: '.8rem', color: '#10b981' }}>⚡ {r.ruleName}: {r.action}</p>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.5rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .search-bar { display: flex; align-items: center; gap: .75rem; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: .5rem 1rem; color: #64748b; }
        .search-input { background: none; border: none; outline: none; color: #e2e8f0; font-size: .9rem; flex: 1; }
        .admin-table-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
        th { background: #0f172a; padding: .75rem 1rem; font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #475569; border-bottom: 1px solid #334155; text-align: left; }
        td { padding: .875rem 1rem; border-bottom: 1px solid #1e293b; font-size: .875rem; color: #94a3b8; }
        tr:hover td { background: rgba(15,23,42,.5); }
        .status-select { background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #94a3b8; font-size: .8rem; padding: .3rem .5rem; cursor: pointer; }
        .expand-btn { background: rgba(99,102,241,.1); border: none; border-radius: 6px; padding: .35rem; color: #818cf8; cursor: pointer; display: flex; }
        .order-detail-expand { background: #0f172a; padding: 1.25rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; border-bottom: 1px solid #334155; }
        @media(max-width:600px) { .order-detail-expand { grid-template-columns: 1fr; } }
        .expand-section {}
        .expand-title { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #475569; margin-bottom: .5rem; }
        .expand-item { display: flex; justify-content: space-between; font-size: .8rem; color: #94a3b8; padding: .2rem 0; border-bottom: 1px solid #1e293b; }
        .dark-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
      `}</style>
    </div>
  );
}
