import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, Search, Menu, X, Zap, LogOut, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  function handleLogout() {
    logout();
    setDropdownOpen(false);
    navigate('/');
  }

  const categories = ['Electronics', 'Fashion', 'Home & Kitchen', 'Books', 'Sports', 'Beauty', 'Toys'];

  return (
    <header className="navbar">
      <div className="nav-top">
        <div className="container">
          <div className="nav-inner">
            {/* Logo */}
            <Link to="/" className="nav-logo">
              <Zap size={22} />
              <span>ShopDemo</span>
            </Link>

            {/* Search */}
            <form className="nav-search" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button type="submit"><Search size={18} /></button>
            </form>

            {/* Actions */}
            <div className="nav-actions">
              {user ? (
                <>
                  <Link to="/wishlist" className="nav-icon-btn" title="Wishlist">
                    <Heart size={20} />
                  </Link>
                  <Link to="/cart" className="nav-icon-btn cart-btn" title="Cart">
                    <ShoppingCart size={20} />
                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                  </Link>
                  <div className="user-dropdown-wrap">
                    <button
                      className="nav-icon-btn user-btn"
                      onClick={() => setDropdownOpen(o => !o)}
                    >
                      <User size={20} />
                      <span className="user-name">{user.name.split(' ')[0]}</span>
                    </button>
                    {dropdownOpen && (
                      <div className="user-dropdown">
                        <div className="dropdown-header">
                          <p className="dropdown-name">{user.name}</p>
                          <p className="dropdown-email">{user.email}</p>
                        </div>
                        <Link to="/profile" onClick={() => setDropdownOpen(false)}>
                          <User size={14} /> Profile
                        </Link>
                        <Link to="/orders" onClick={() => setDropdownOpen(false)}>
                          <Package size={14} /> My Orders
                        </Link>
                        {user.role === 'admin' && (
                          <Link to="/admin" onClick={() => setDropdownOpen(false)}>
                            <Zap size={14} /> Admin Panel
                          </Link>
                        )}
                        <hr />
                        <button onClick={handleLogout}>
                          <LogOut size={14} /> Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
                  <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
                </>
              )}
              <button className="nav-hamburger" onClick={() => setMenuOpen(o => !o)}>
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Category bar */}
      <div className="nav-bottom">
        <div className="container">
          <nav className="cat-nav">
            <Link to="/products" className="cat-link all-link">All Products</Link>
            {categories.map(cat => (
              <Link key={cat} to={`/products?category=${encodeURIComponent(cat)}`} className="cat-link">
                {cat}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <form onSubmit={handleSearch} className="mobile-search">
            <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <button type="submit"><Search size={16} /></button>
          </form>
          <Link to="/products" onClick={() => setMenuOpen(false)}>All Products</Link>
          {categories.map(cat => (
            <Link key={cat} to={`/products?category=${encodeURIComponent(cat)}`} onClick={() => setMenuOpen(false)}>{cat}</Link>
          ))}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setMenuOpen(false)}>My Profile</Link>
              <Link to="/orders" onClick={() => setMenuOpen(false)}>My Orders</Link>
              <Link to="/cart" onClick={() => setMenuOpen(false)}>Cart ({cartCount})</Link>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}

      <style>{`
        .navbar { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.08); position: sticky; top: 0; z-index: 100; }
        .nav-top { padding: 0.75rem 0; }
        .nav-inner { display: flex; align-items: center; gap: 1.5rem; }
        .nav-logo { display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem; font-weight: 800; color: #6366f1; flex-shrink: 0; }
        .nav-search { flex: 1; display: flex; max-width: 480px; border: 2px solid #e5e7eb; border-radius: 100px; overflow: hidden; transition: border-color .2s; }
        .nav-search:focus-within { border-color: #6366f1; }
        .nav-search input { flex: 1; padding: .5rem 1rem; border: none; outline: none; font-size: .9rem; }
        .nav-search button { background: #6366f1; color: #fff; border: none; padding: .5rem .875rem; cursor: pointer; display: flex; align-items: center; }
        .nav-actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
        .nav-icon-btn { display: flex; align-items: center; gap: 0.35rem; padding: .5rem; border-radius: 8px; border: none; background: transparent; color: #374151; transition: all .2s; position: relative; cursor: pointer; font-size: .9rem; font-weight: 600; }
        .nav-icon-btn:hover { background: #f3f4f6; color: #6366f1; }
        .cart-badge { position: absolute; top: 0; right: 0; background: #ef4444; color: #fff; font-size: .65rem; font-weight: 700; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .user-name { display: none; }
        @media(min-width:640px) { .user-name { display: inline; } }
        .user-dropdown-wrap { position: relative; }
        .user-dropdown { position: absolute; right: 0; top: calc(100% + 8px); background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.12); min-width: 200px; z-index: 200; overflow: hidden; }
        .dropdown-header { padding: .75rem 1rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
        .dropdown-name { font-weight: 700; color: #111827; font-size: .9rem; }
        .dropdown-email { font-size: .8rem; color: #6b7280; }
        .user-dropdown a, .user-dropdown button { display: flex; align-items: center; gap: .5rem; padding: .625rem 1rem; color: #374151; font-size: .875rem; width: 100%; background: transparent; border: none; cursor: pointer; transition: background .15s; }
        .user-dropdown a:hover, .user-dropdown button:hover { background: #f3f4f6; }
        .user-dropdown hr { border: none; border-top: 1px solid #e5e7eb; margin: .25rem 0; }
        .nav-bottom { background: #f9fafb; border-top: 1px solid #e5e7eb; }
        .cat-nav { display: flex; gap: 0; overflow-x: auto; scrollbar-width: none; }
        .cat-nav::-webkit-scrollbar { display: none; }
        .cat-link { padding: .625rem 1rem; font-size: .85rem; font-weight: 500; color: #4b5563; white-space: nowrap; border-bottom: 2px solid transparent; transition: all .2s; }
        .cat-link:hover { color: #6366f1; border-bottom-color: #6366f1; }
        .all-link { font-weight: 700; color: #6366f1; }
        .nav-hamburger { display: none; background: transparent; border: none; padding: .5rem; cursor: pointer; color: #374151; }
        @media(max-width:768px) { .nav-hamburger { display: flex; } .nav-search { display: none; } }
        .mobile-menu { padding: 1rem; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: .25rem; background: #fff; }
        .mobile-search { display: flex; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: .5rem; }
        .mobile-search input { flex: 1; padding: .5rem .75rem; border: none; outline: none; }
        .mobile-search button { background: #6366f1; color: #fff; border: none; padding: .5rem .75rem; display: flex; align-items: center; }
        .mobile-menu a, .mobile-menu button { padding: .625rem .75rem; border-radius: 8px; color: #374151; font-size: .9rem; background: transparent; border: none; text-align: left; cursor: pointer; transition: background .15s; }
        .mobile-menu a:hover, .mobile-menu button:hover { background: #f3f4f6; }
      `}</style>
    </header>
  );
}
