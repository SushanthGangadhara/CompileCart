import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Star, ArrowLeft, Package, Truck, RotateCcw, Plus, Minus } from 'lucide-react';
import { ProductStore, formatCurrency } from '../../data/storage';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../../components/common/ProductCard';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart, isInWishlist, toggleWishlist } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');

  const product = ProductStore.findById(id);
  if (!product) return (
    <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <h2>Product not found</h2>
      <Link to="/products" className="btn btn-primary mt-2">Back to Products</Link>
    </div>
  );

  const related = ProductStore.getByCategory(product.category)
    .filter(p => p.id !== product.id)
    .slice(0, 4);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  const inWish = user ? isInWishlist(product.id) : false;

  function handleAddToCart() {
    const result = addToCart(product.id, qty);
    if (result.success) {
      setMsg('✓ Added to cart!');
      setTimeout(() => setMsg(''), 3000);
    } else {
      setMsg(result.error);
    }
  }

  function handleBuyNow() {
    const result = addToCart(product.id, qty);
    if (result.success) navigate('/cart');
    else setMsg(result.error);
  }

  return (
    <div className="detail-page">
      <div className="container">
        <Link to="/products" className="back-link"><ArrowLeft size={16} /> Back to Products</Link>

        <div className="detail-grid">
          {/* Image */}
          <div className="detail-image-wrap">
            <div className="detail-image">
              <span className="detail-emoji">{product.image}</span>
            </div>
            {discount > 0 && <span className="discount-badge">-{discount}% OFF</span>}
          </div>

          {/* Info */}
          <div className="detail-info">
            <span className="detail-category">{product.category}</span>
            <h1 className="detail-name">{product.name}</h1>

            <div className="detail-rating">
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={16} fill={i <= Math.round(product.rating) ? '#f59e0b' : 'none'} color="#f59e0b" />
              ))}
              <span>{product.rating}</span>
              <span className="review-cnt">({product.reviews} reviews)</span>
            </div>

            <div className="detail-price">
              <span className="detail-price-main">{formatCurrency(product.price)}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="detail-price-orig">{formatCurrency(product.originalPrice)}</span>
              )}
              {discount > 0 && <span className="badge badge-success">{discount}% OFF</span>}
            </div>

            <p className="detail-desc">{product.description}</p>

            <div className="detail-meta">
              <div className="meta-item">
                <span className="meta-label">Brand</span>
                <span className="meta-value">{product.brand}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Availability</span>
                <span className={`meta-value ${product.stock > 0 ? 'in-stock' : 'out-stock'}`}>
                  {product.stock > 0 ? `In Stock (${product.stock} left)` : 'Out of Stock'}
                </span>
              </div>
            </div>

            {product.stock > 0 && (
              <div className="qty-row">
                <span className="meta-label">Quantity</span>
                <div className="qty-control">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}><Minus size={14} /></button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}><Plus size={14} /></button>
                </div>
              </div>
            )}

            {msg && (
              <div className={`alert ${msg.includes('✓') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>
            )}

            <div className="detail-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart size={18} />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button
                className="btn btn-outline btn-lg"
                onClick={handleBuyNow}
                disabled={product.stock === 0}
              >
                Buy Now
              </button>
              <button
                className={`btn btn-icon ${inWish ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => { if (!user) { setMsg('Login to use wishlist'); return; } toggleWishlist(product.id); }}
                title={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={18} fill={inWish ? '#fff' : 'none'} />
              </button>
            </div>

            <div className="delivery-info">
              <div className="delivery-item"><Truck size={16} /> Free delivery on orders above ₹999</div>
              <div className="delivery-item"><RotateCcw size={16} /> 30-day hassle-free returns</div>
              <div className="delivery-item"><Package size={16} /> Genuine product, secure packaging</div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="related-section">
            <h2>Related Products</h2>
            <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
      <style>{`
        .detail-page { padding: 2rem 0; flex: 1; }
        .back-link { display: inline-flex; align-items: center; gap: .5rem; font-size: .875rem; color: #6366f1; margin-bottom: 1.5rem; font-weight: 600; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
        @media(max-width:768px) { .detail-grid { grid-template-columns: 1fr; gap: 1.5rem; } }
        .detail-image-wrap { position: relative; }
        .detail-image { background: #f9fafb; border-radius: 20px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: 2px solid #f3f4f6; }
        .detail-emoji { font-size: 8rem; }
        .discount-badge { position: absolute; top: 1rem; left: 1rem; background: #ef4444; color: #fff; font-size: .85rem; font-weight: 700; padding: .3rem .75rem; border-radius: 100px; }
        .detail-category { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6366f1; }
        .detail-name { font-size: 1.75rem; font-weight: 800; margin: .5rem 0 .75rem; color: #111827; }
        .detail-rating { display: flex; align-items: center; gap: .25rem; margin-bottom: 1rem; font-size: .9rem; color: #374151; }
        .review-cnt { color: #9ca3af; font-size: .8rem; }
        .detail-price { display: flex; align-items: baseline; gap: .75rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .detail-price-main { font-size: 2rem; font-weight: 900; color: #111827; }
        .detail-price-orig { font-size: 1rem; color: #9ca3af; text-decoration: line-through; }
        .detail-desc { color: #4b5563; line-height: 1.7; margin-bottom: 1.25rem; }
        .detail-meta { display: flex; gap: 2rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .meta-item { display: flex; flex-direction: column; gap: .2rem; }
        .meta-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: #9ca3af; font-weight: 600; }
        .meta-value { font-size: .9rem; font-weight: 700; color: #111827; }
        .in-stock { color: #059669; }
        .out-stock { color: #ef4444; }
        .qty-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
        .qty-control { display: flex; align-items: center; gap: 0; border: 2px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
        .qty-control button { background: #f9fafb; border: none; padding: .5rem .75rem; cursor: pointer; display: flex; align-items: center; font-size: 1rem; transition: background .15s; }
        .qty-control button:hover { background: #e5e7eb; }
        .qty-control span { padding: .5rem 1rem; font-weight: 700; font-size: .95rem; min-width: 40px; text-align: center; }
        .detail-actions { display: flex; gap: .75rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
        .delivery-info { background: #f9fafb; border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: .6rem; }
        .delivery-item { display: flex; align-items: center; gap: .5rem; font-size: .875rem; color: #374151; }
        .related-section h2 { margin-bottom: 1.25rem; }
      `}</style>
    </div>
  );
}
