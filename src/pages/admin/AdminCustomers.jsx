import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { UserStore, OrderStore, formatCurrency, formatDate } from '../../data/storage';

export default function AdminCustomers() {
  const customers = UserStore.getCustomers();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Customers</h1>
          <p>{customers.length} registered customers</p>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '1rem' }}>
        <Search size={16} />
        <input placeholder="Search by name or email..." value={search}
          onChange={e => setSearch(e.target.value)} className="search-input" />
      </div>

      <div className="admin-table-card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Spent</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const cOrders = OrderStore.getByCustomer(c.id).filter(o => o.status !== 'Cancelled');
                const spent = cOrders.reduce((s, o) => s + o.total, 0);
                return (
                  <React.Fragment key={c.id}>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                          <div className="cust-avatar">{c.name.charAt(0)}</div>
                          <div>
                            <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '.875rem' }}>{c.name}</p>
                            <p style={{ color: '#64748b', fontSize: '.75rem' }}>{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#94a3b8', fontSize: '.85rem' }}>{c.phone || '—'}</td>
                      <td>
                        <span className={`type-badge ${c.customerType === 'premium' ? 'premium' : 'regular'}`}>
                          {c.customerType === 'premium' ? '⭐ Premium' : 'Regular'}
                        </span>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '.8rem' }}>{formatDate(c.createdAt)}</td>
                      <td style={{ color: '#818cf8', fontWeight: 700 }}>{cOrders.length}</td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(spent)}</td>
                      <td>
                        <button className="expand-btn" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                          <ChevronDown size={15} style={{ transform: expanded === c.id ? 'rotate(180deg)' : 'none' }} />
                        </button>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div style={{ background: '#0f172a', padding: '1.25rem', borderBottom: '1px solid #334155' }}>
                            <p style={{ fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#475569', marginBottom: '.75rem' }}>
                              Order History
                            </p>
                            {OrderStore.getByCustomer(c.id).length === 0 ? (
                              <p style={{ color: '#64748b', fontSize: '.85rem' }}>No orders yet</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                                {OrderStore.getByCustomer(c.id).map(o => (
                                  <div key={o.id} style={{ display: 'flex', gap: '2rem', fontSize: '.8rem', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '.4rem' }}>
                                    <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>#{o.id.slice(-6).toUpperCase()}</span>
                                    <span>{formatDate(o.createdAt)}</span>
                                    <span>{o.items.length} items</span>
                                    <span style={{ color: '#10b981', fontWeight: 700 }}>{formatCurrency(o.total)}</span>
                                    <span style={{ marginLeft: 'auto', color: o.status === 'Delivered' ? '#10b981' : '#f59e0b' }}>{o.status}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .admin-page { padding: .5rem 0; }
        .admin-page-header { margin-bottom: 1.5rem; }
        .admin-page-header h1 { color: #f1f5f9; font-size: 1.5rem; }
        .admin-page-header p { color: #64748b; font-size: .875rem; }
        .search-bar { display: flex; align-items: center; gap: .75rem; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: .5rem 1rem; color: #64748b; }
        .search-input { background: none; border: none; outline: none; color: #e2e8f0; font-size: .9rem; flex: 1; }
        .admin-table-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
        th { background: #0f172a; padding: .75rem 1rem; font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #475569; border-bottom: 1px solid #334155; text-align: left; }
        td { padding: .875rem 1rem; border-bottom: 1px solid #1e293b; font-size: .875rem; color: #94a3b8; }
        tr:hover td { background: rgba(15,23,42,.5); }
        .cust-avatar { width: 32px; height: 32px; border-radius: 50%; background: #6366f1; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .875rem; flex-shrink: 0; }
        .type-badge { padding: .2rem .6rem; border-radius: 100px; font-size: .75rem; font-weight: 700; }
        .type-badge.premium { background: rgba(245,158,11,.15); color: #fbbf24; }
        .type-badge.regular { background: rgba(100,116,139,.15); color: #94a3b8; }
        .expand-btn { background: rgba(99,102,241,.1); border: none; border-radius: 6px; padding: .35rem; color: #818cf8; cursor: pointer; display: flex; transition: transform .2s; }
      `}</style>
    </div>
  );
}
