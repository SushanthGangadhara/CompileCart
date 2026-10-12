import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { ProductStore, formatCurrency } from '../../data/storage';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../components/common/ProductCard';

export default function Wishlist() {
  const { wishlistIds, toggleWishlist } = useCart();
  const products = wishlistIds.map(id => ProductStore.findById(id)).filter(Boolean);

  if (products.length === 0) return (
    <div className="container" style={{ padding: '4rem 1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
        <Heart size={64} color="#d1d5db" />
        <h2>Your wishlist is empty</h2>
        <p style={{ color: '#6b7280' }}>Save products you love for later</p>
        <Link to="/products" className="btn btn-primary btn-lg">Browse Products</Link>
      </div>
    </div>
  );

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>
      <div className="page-header">
        <h1 className="page-title"><Heart size={22} color="#ef4444" fill="#ef4444" /> Wishlist ({products.length})</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
