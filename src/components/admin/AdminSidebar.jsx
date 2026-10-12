import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Zap, LogOut,
  ChevronDown, ChevronRight, Code2, FileCode2, GitBranch,
  Cpu, FlaskConical, BookOpen, History, BarChart3, Settings,
  Play, Braces, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const COMPILER_LINKS = [
  { to: '/admin/compiler', label: 'Dashboard', icon: <BarChart3 size={14} />, end: true },
  { to: '/admin/compiler/editor', label: 'Rule Editor', icon: <Code2 size={14} /> },
  { to: '/admin/compiler/lexer', label: 'Lexer', icon: <FileCode2 size={14} /> },
  { to: '/admin/compiler/parser', label: 'Parser & Tree', icon: <GitBranch size={14} /> },
  { to: '/admin/compiler/semantic', label: 'Semantic Analyzer', icon: <Cpu size={14} /> },
  { to: '/admin/compiler/ast', label: 'AST Visualizer', icon: <Braces size={14} /> },
  { to: '/admin/compiler/tac', label: 'Intermediate Code', icon: <Layers size={14} /> },
  { to: '/admin/compiler/optimizer', label: 'Optimizer', icon: <Settings size={14} /> },
  { to: '/admin/compiler/codegen', label: 'Code Generator', icon: <Play size={14} /> },
  { to: '/admin/compiler/tester', label: 'Rule Tester', icon: <FlaskConical size={14} /> },
  { to: '/admin/compiler/saved', label: 'Saved Rules', icon: <BookOpen size={14} /> },
  { to: '/admin/compiler/history', label: 'Compiler History', icon: <History size={14} /> },
  { to: '/admin/compiler/concepts', label: 'Concepts', icon: <BookOpen size={14} /> },
];

export default function AdminSidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [compilerOpen, setCompilerOpen] = useState(true);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <Zap size={20} color="#818cf8" />
        <div>
          <p className="logo-title">ShopDemo Admin</p>
          <p className="logo-sub">Compiler Rule Engine</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <p className="nav-section-label">Main</p>
        <NavLink to="/admin" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/admin/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Package size={16} /> Products
        </NavLink>
        <NavLink to="/admin/orders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <ShoppingBag size={16} /> Orders
        </NavLink>
        <NavLink to="/admin/customers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onClose}>
          <Users size={16} /> Customers
        </NavLink>

        {/* Compiler accordion */}
        <p className="nav-section-label" style={{ marginTop: '1rem' }}>Compiler Engine</p>
        <button className="nav-item compiler-toggle" onClick={() => setCompilerOpen(v => !v)}>
          <Zap size={16} /> Compiler
          {compilerOpen ? <ChevronDown size={14} style={{ marginLeft: 'auto' }} /> : <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
        </button>
        {compilerOpen && (
          <div className="compiler-submenu">
            {COMPILER_LINKS.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `sub-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                {link.icon} {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.charAt(0)}</div>
          <div>
            <p className="user-name">{user?.name}</p>
            <p className="user-role">Administrator</p>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      <style>{`
        .sidebar-logo { display: flex; align-items: center; gap: .75rem; padding: 1.25rem 1rem; border-bottom: 1px solid #334155; }
        .logo-title { font-weight: 800; color: #f1f5f9; font-size: .95rem; }
        .logo-sub { font-size: .7rem; color: #64748b; }
        .sidebar-nav { flex: 1; padding: .75rem 0; overflow-y: auto; }
        .nav-section-label { font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #475569; padding: .4rem 1rem; margin-top: .25rem; }
        .nav-item { display: flex; align-items: center; gap: .625rem; padding: .625rem 1rem; font-size: .875rem; color: #94a3b8; width: 100%; border: none; background: transparent; cursor: pointer; transition: all .15s; text-decoration: none; border-radius: 0; }
        .nav-item:hover { background: #334155; color: #f1f5f9; }
        .nav-item.active { background: rgba(99,102,241,.15); color: #818cf8; border-right: 3px solid #818cf8; }
        .compiler-toggle { justify-content: flex-start; }
        .compiler-submenu { padding-left: .5rem; }
        .sub-item { display: flex; align-items: center; gap: .5rem; padding: .45rem 1rem .45rem 1.5rem; font-size: .8rem; color: #64748b; text-decoration: none; transition: all .15s; border-radius: 0; }
        .sub-item:hover { background: #1e293b; color: #94a3b8; }
        .sub-item.active { color: #818cf8; background: rgba(99,102,241,.08); }
        .sidebar-footer { padding: .75rem; border-top: 1px solid #334155; }
        .sidebar-user { display: flex; align-items: center; gap: .625rem; margin-bottom: .5rem; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: #6366f1; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: .9rem; flex-shrink: 0; }
        .sidebar-footer .user-name { font-size: .8rem; font-weight: 700; color: #f1f5f9; }
        .sidebar-footer .user-role { font-size: .7rem; color: #64748b; }
        .logout-btn { display: flex; align-items: center; gap: .5rem; width: 100%; padding: .5rem .75rem; background: rgba(239,68,68,.1); color: #f87171; border: none; border-radius: 8px; cursor: pointer; font-size: .8rem; font-weight: 600; transition: background .15s; }
        .logout-btn:hover { background: rgba(239,68,68,.2); }
      `}</style>
    </aside>
  );
}
