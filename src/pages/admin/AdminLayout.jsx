import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <div className="admin-content">
        <div className="admin-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(v => !v)}>
            <Menu size={22} />
          </button>
          <span className="topbar-title">ShopDemo Admin Panel</span>
        </div>
        <Outlet />
      </div>
      <style>{`
        .admin-topbar { display: none; align-items: center; gap: 1rem; padding: .75rem 1rem; background: #1e293b; border-bottom: 1px solid #334155; margin-bottom: 1rem; border-radius: 12px; }
        @media(max-width:768px) { .admin-topbar { display: flex; } }
        .mobile-menu-btn { background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; }
        .topbar-title { font-size: .9rem; font-weight: 700; color: #f1f5f9; }
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 49; }
      `}</style>
    </div>
  );
}
