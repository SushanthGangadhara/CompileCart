import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Github, Mail, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo"><Zap size={20} /> ShopDemo</Link>
            <p>A full-stack e-commerce demo with a built-in Compiler Design Rule Engine. Built for academic demonstration purposes.</p>
            <div className="footer-badges">
              <span className="badge badge-warning">⚠️ Demo Only</span>
              <span className="badge badge-info">LocalStorage Auth</span>
            </div>
          </div>
          <div className="footer-links">
            <h4>Shop</h4>
            <Link to="/products">All Products</Link>
            <Link to="/products?category=Electronics">Electronics</Link>
            <Link to="/products?category=Fashion">Fashion</Link>
            <Link to="/products?category=Home+%26+Kitchen">Home & Kitchen</Link>
          </div>
          <div className="footer-links">
            <h4>Account</h4>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/profile">Profile</Link>
          </div>
          <div className="footer-links">
            <h4>Compiler</h4>
            <Link to="/admin/compiler">Rule Engine</Link>
            <Link to="/admin/compiler/lexer">Lexer</Link>
            <Link to="/admin/compiler/parser">Parser</Link>
            <Link to="/admin/compiler/ast">AST Viewer</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="disclaimer">
            <Shield size={14} /> <strong>Disclaimer:</strong> LocalStorage authentication and mock payments are for demonstration only and are not production-secure. Do not use real credentials or payment information.
          </p>
          <p className="copyright">© 2026 ShopDemo — Academic Project. Compiler Design meets E-Commerce.</p>
        </div>
      </div>
      <style>{`
        .site-footer { background: #1e293b; color: #94a3b8; padding: 3rem 0 1.5rem; margin-top: auto; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
        @media(max-width:768px) { .footer-grid { grid-template-columns: 1fr 1fr; } }
        @media(max-width:480px) { .footer-grid { grid-template-columns: 1fr; } }
        .footer-logo { display: flex; align-items: center; gap: .5rem; font-size: 1.25rem; font-weight: 800; color: #e2e8f0; margin-bottom: .75rem; }
        .footer-brand p { font-size: .875rem; line-height: 1.7; color: #94a3b8; margin-bottom: .75rem; }
        .footer-badges { display: flex; gap: .5rem; flex-wrap: wrap; }
        .footer-links h4 { font-size: .8rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #e2e8f0; margin-bottom: .75rem; }
        .footer-links a { display: block; font-size: .875rem; color: #94a3b8; padding: .2rem 0; transition: color .2s; }
        .footer-links a:hover { color: #6366f1; }
        .footer-bottom { border-top: 1px solid #334155; padding-top: 1.5rem; display: flex; flex-direction: column; gap: .5rem; }
        .disclaimer { display: flex; align-items: flex-start; gap: .5rem; font-size: .8rem; color: #f59e0b; background: rgba(245,158,11,.1); padding: .75rem; border-radius: 8px; }
        .copyright { font-size: .8rem; text-align: center; color: #64748b; }
      `}</style>
    </footer>
  );
}
