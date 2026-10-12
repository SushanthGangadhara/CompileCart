import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Tag, Truck, RotateCcw, Shield, Zap, Star } from 'lucide-react';
import { ProductStore } from '../../data/storage';
import ProductCard from '../../components/common/ProductCard';

const CATEGORIES = [
  { name: 'Electronics', emoji: '📱', color: '#dbeafe' },
  { name: 'Fashion', emoji: '👗', color: '#fce7f3' },
  { name: 'Home & Kitchen', emoji: '🍳', color: '#d1fae5' },
  { name: 'Books', emoji: '📚', color: '#fef3c7' },
  { name: 'Sports', emoji: '⚽', color: '#ede9fe' },
  { name: 'Beauty', emoji: '💄', color: '#fce7f3' },
  { name: 'Toys', emoji: '🧸', color: '#ffedd5' },
];

export default function Home() {
  const allProducts = ProductStore.getAll();
  const featured = allProducts.filter(p => p.featured).slice(0, 6);
  const topRated = [...allProducts].sort((a, b) => b.rating - a.rating).slice(0, 4);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <span className="hero-badge"><Zap size={14} /> Compiler-Powered Discounts</span>
              <h1>Shop Smart with<br /><span className="gradient-text">AI-Driven Rules</span></h1>
              <p>Discover amazing products with automatic discounts powered by our Compiler Design Rule Engine. Real shopping + real compiler theory.</p>
              <div className="hero-actions">
                <Link to="/products" className="btn btn-primary btn-lg">Shop Now <ArrowRight size={18} /></Link>
                <Link to="/admin/compiler" className="btn btn-outline btn-lg">View Compiler <Zap size={18} /></Link>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-card">
                <div className="hero-card-header">🔥 Smart Rule Active</div>
                <div className="hero-card-rule">
                  <code>IF cart_total &gt; 5000</code>
                  <code>AND category = "Electronics"</code>
                  <code>THEN discount = 20</code>
                </div>
                <div className="hero-card-result">→ 20% discount applied!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="trust-bar">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item"><Truck size={20} /> Free Shipping over ₹999</div>
            <div className="trust-item"><RotateCcw size={20} /> 30-Day Returns</div>
            <div className="trust-item"><Shield size={20} /> Secure Checkout</div>
            <div className="trust-item"><Tag size={20} /> Smart Auto-Discounts</div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Shop by Category</h2>
            <Link to="/products" className="see-all">See all <ArrowRight size={16} /></Link>
          </div>
          <div className="category-grid">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                className="category-card"
                style={{ background: cat.color }}
              >
                <span className="cat-emoji">{cat.emoji}</span>
                <span className="cat-name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Featured Products</h2>
            <Link to="/products" className="see-all">See all <ArrowRight size={16} /></Link>
          </div>
          <div className="products-grid">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Promo banner */}
      <section className="promo-banner">
        <div className="container">
          <div className="promo-inner">
            <div>
              <h2>Use Coupon <span className="coupon-code">WELCOME10</span></h2>
              <p>Get 10% off on your first order. Apply at checkout!</p>
            </div>
            <Link to="/products" className="btn btn-primary btn-lg">Start Shopping</Link>
          </div>
        </div>
      </section>

      {/* Top Rated */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2><Star size={20} fill="#f59e0b" color="#f59e0b" /> Top Rated</h2>
            <Link to="/products?sort=rating" className="see-all">See all <ArrowRight size={16} /></Link>
          </div>
          <div className="products-grid">
            {topRated.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      <style>{`
        .home-page { flex: 1; }
        .hero { background: linear-gradient(135deg, #ede9fe 0%, #dbeafe 100%); padding: 4rem 0; }
        .hero-content { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
        @media(max-width:768px) { .hero-content { grid-template-columns: 1fr; } .hero-visual { display: none; } }
        .hero-badge { display: inline-flex; align-items: center; gap: .4rem; background: #fff; padding: .35rem .8rem; border-radius: 100px; font-size: .8rem; font-weight: 700; color: #6366f1; margin-bottom: 1rem; box-shadow: 0 2px 8px rgba(99,102,241,.15); }
        .hero-text h1 { font-size: 2.75rem; font-weight: 900; line-height: 1.15; margin-bottom: 1rem; }
        .gradient-text { background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-text p { font-size: 1.05rem; color: #4b5563; margin-bottom: 1.5rem; }
        .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
        .hero-visual { display: flex; justify-content: center; }
        .hero-card { background: #1e293b; border-radius: 16px; padding: 1.5rem; color: #e2e8f0; box-shadow: 0 16px 48px rgba(0,0,0,.2); min-width: 300px; }
        .hero-card-header { font-size: .8rem; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: .06em; margin-bottom: .75rem; }
        .hero-card-rule { display: flex; flex-direction: column; gap: .25rem; font-family: 'Courier New', monospace; font-size: .9rem; background: #0f172a; padding: .875rem; border-radius: 8px; margin-bottom: .75rem; }
        .hero-card-rule code { color: #818cf8; }
        .hero-card-result { font-size: .9rem; font-weight: 700; color: #34d399; }
        .trust-bar { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 1rem 0; }
        .trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        @media(max-width:640px) { .trust-grid { grid-template-columns: repeat(2, 1fr); } }
        .trust-item { display: flex; align-items: center; gap: .5rem; justify-content: center; font-size: .875rem; font-weight: 600; color: #374151; }
        .section { padding: 3rem 0; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .section-header h2 { display: flex; align-items: center; gap: .5rem; }
        .see-all { display: flex; align-items: center; gap: .25rem; font-size: .875rem; font-weight: 600; color: #6366f1; }
        .see-all:hover { text-decoration: underline; }
        .category-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1rem; }
        @media(max-width:1024px) { .category-grid { grid-template-columns: repeat(4, 1fr); } }
        @media(max-width:640px) { .category-grid { grid-template-columns: repeat(3, 1fr); } }
        .category-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; padding: 1.25rem .75rem; border-radius: 14px; text-align: center; transition: transform .2s, box-shadow .2s; }
        .category-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,.1); }
        .cat-emoji { font-size: 2rem; }
        .cat-name { font-size: .8rem; font-weight: 700; color: #374151; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.25rem; }
        .promo-banner { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 3rem 0; }
        .promo-inner { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
        @media(max-width:640px) { .promo-inner { flex-direction: column; text-align: center; } }
        .promo-inner h2 { font-size: 1.75rem; color: #fff; margin-bottom: .5rem; }
        .promo-inner p { color: rgba(255,255,255,.85); }
        .coupon-code { background: rgba(255,255,255,.2); padding: .15rem .5rem; border-radius: 6px; font-family: monospace; letter-spacing: .05em; }
        .promo-banner .btn-primary { background: #fff; color: #6366f1; }
        .promo-banner .btn-primary:hover { background: #f3f4f6; }
      `}</style>
    </div>
  );
}
