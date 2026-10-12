import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../data/storage';

export default function ProductCard({ product, onWishlistToggle }) {
  const { addToCart, isInWishlist, toggleWishlist } = useCart();
  const { user } = useAuth();
  const [msg, setMsg] = React.useState('');

  const inWish = user ? isInWishlist(product.id) : false;
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  function handleAddToCart(e) {
    e.preventDefault();
    const result = addToCart(product.id, 1);
    setMsg(result.success ? '✓ Added' : result.error);
    setTimeout(() => setMsg(''), 2000);
  }

  function handleWishlist(e) {
    e.preventDefault();
    if (!user) { setMsg('Login to use wishlist'); setTimeout(() => setMsg(''), 2000); return; }
    toggleWishlist(product.id);
  }

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-link">
        <div className="product-image">
          <div className="product-emoji">{product.image}</div>
          {discount > 0 && <span className="discount-badge">-{discount}%</span>}
          {product.stock === 0 && <div className="out-of-stock-overlay">Out of Stock</div>}
          <button
            className={`wish-btn ${inWish ? 'wished' : ''}`}
            onClick={handleWishlist}
            title={inWish ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={16} fill={inWish ? '#ef4444' : 'none'} color={inWish ? '#ef4444' : '#9ca3af'} />
          </button>
        </div>
        <div className="product-info">
          <p className="product-category">{product.category}</p>
          <h3 className="product-name">{product.name}</h3>
          <div className="product-rating">
            <Star size={13} fill="#f59e0b" color="#f59e0b" />
            <span>{product.rating}</span>
            <span className="review-count">({product.reviews})</span>
          </div>
          <div className="product-pricing">
            <span className="product-price">{formatCurrency(product.price)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="product-original">{formatCurrency(product.originalPrice)}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="product-card-actions">
        {msg ? (
          <p className={`cart-msg ${msg.includes('✓') ? 'success' : 'error'}`}>{msg}</p>
        ) : (
          <button
            className="btn btn-primary btn-sm w-full add-to-cart"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            <ShoppingCart size={15} />
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        )}
      </div>
      <style>{`
        .product-card { background: #fff; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,.07); overflow: hidden; transition: all .2s; display: flex; flex-direction: column; }
        .product-card:hover { box-shadow: 0 8px 28px rgba(0,0,0,.13); transform: translateY(-2px); }
        .product-card-link { display: block; text-decoration: none; color: inherit; flex: 1; }
        .product-image { position: relative; background: #f9fafb; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #f3f4f6; overflow: hidden; }
        .product-emoji { font-size: 4rem; line-height: 1; user-select: none; }
        .discount-badge { position: absolute; top: .5rem; left: .5rem; background: #ef4444; color: #fff; font-size: .7rem; font-weight: 700; padding: .15rem .45rem; border-radius: 100px; }
        .out-of-stock-overlay { position: absolute; inset: 0; background: rgba(255,255,255,.75); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #ef4444; font-size: .875rem; }
        .wish-btn { position: absolute; top: .5rem; right: .5rem; background: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.12); transition: transform .15s; }
        .wish-btn:hover { transform: scale(1.15); }
        .product-info { padding: .875rem; }
        .product-category { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #6366f1; margin-bottom: .2rem; }
        .product-name { font-size: .9rem; font-weight: 700; color: #111827; line-height: 1.35; margin-bottom: .35rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .product-rating { display: flex; align-items: center; gap: .25rem; font-size: .8rem; color: #374151; margin-bottom: .35rem; }
        .review-count { color: #9ca3af; }
        .product-pricing { display: flex; align-items: baseline; gap: .5rem; }
        .product-price { font-size: 1rem; font-weight: 800; color: #111827; }
        .product-original { font-size: .8rem; color: #9ca3af; text-decoration: line-through; }
        .product-card-actions { padding: .75rem .875rem; padding-top: 0; }
        .add-to-cart { border-radius: 8px; font-size: .8rem; padding: .5rem; }
        .cart-msg { font-size: .8rem; text-align: center; padding: .4rem; border-radius: 6px; font-weight: 600; }
        .cart-msg.success { color: #065f46; background: #d1fae5; }
        .cart-msg.error { color: #991b1b; background: #fee2e2; }
      `}</style>
    </div>
  );
}
