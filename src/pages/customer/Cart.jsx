import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Trash2, Tag, ArrowRight, Zap } from 'lucide-react';
import { formatCurrency, CouponStore } from '../../data/storage';
import { useCart } from '../../context/CartContext';

export default function Cart() {
  const { enrichedCart, subtotal, removeFromCart, updateQty, appliedCoupon, setAppliedCoupon, evaluateRules } = useCart();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponMsg, setCouponMsg] = useState({ text: '', type: '' });

  const { bestDiscount, shipping, applied, ruleDiscount, couponDiscount, totalDiscount, total } = evaluateRules();

  function applyCoupon() {
    const coupon = CouponStore.findByCode(couponCode.trim());
    if (!coupon) { setCouponMsg({ text: 'Invalid coupon code.', type: 'error' }); return; }
    if (!coupon.active) { setCouponMsg({ text: 'This coupon is no longer active.', type: 'error' }); return; }
    if (subtotal < coupon.minOrder) {
      setCouponMsg({ text: `Min. order ₹${coupon.minOrder} required for this coupon.`, type: 'error' }); return;
    }
    setAppliedCoupon(coupon);
    setCouponMsg({ text: `✓ "${coupon.code}" applied! ${coupon.description}`, type: 'success' });
  }

  if (enrichedCart.length === 0) return (
    <div className="container">
      <div className="empty-cart">
        <ShoppingCart size={64} color="#d1d5db" />
        <h2>Your cart is empty</h2>
        <p>Add products to get started</p>
        <Link to="/products" className="btn btn-primary btn-lg">Browse Products</Link>
      </div>
    </div>
  );

  return (
    <div className="cart-page">
      <div className="container">
        <h1 className="page-title">Shopping Cart <span className="count-badge">{enrichedCart.length} items</span></h1>

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items">
            {enrichedCart.map(item => {
              const p = item.product;
              return (
                <div key={item.productId} className="cart-item">
                  <div className="item-image">{p.image}</div>
                  <div className="item-info">
                    <Link to={`/products/${p.id}`} className="item-name">{p.name}</Link>
                    <p className="item-category">{p.category}</p>
                    <p className="item-price">{formatCurrency(p.price)}</p>
                  </div>
                  <div className="item-controls">
                    <div className="qty-control">
                      <button onClick={() => updateQty(item.productId, item.quantity - 1)}><Minus size={13} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, item.quantity + 1)}><Plus size={13} /></button>
                    </div>
                    <p className="item-total">{formatCurrency(p.price * item.quantity)}</p>
                    <button className="remove-btn" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="cart-summary">
            {/* Active rules */}
            {applied.length > 0 && (
              <div className="rules-applied">
                <div className="rules-header"><Zap size={15} /> Rule-Based Discounts Applied</div>
                {applied.map((a, i) => (
                  <div key={i} className="rule-item">
                    <span>✓ {a.ruleName}</span>
                    <span className="rule-action">{a.action}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Coupon */}
            <div className="coupon-section">
              <label className="form-label"><Tag size={14} /> Apply Coupon</label>
              <div className="coupon-input">
                <input
                  className="form-control"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg({ text: '', type: '' }); }}
                />
                <button className="btn btn-primary btn-sm" onClick={applyCoupon}>Apply</button>
              </div>
              {couponMsg.text && (
                <p className={`coupon-msg ${couponMsg.type}`}>{couponMsg.text}</p>
              )}
              {appliedCoupon && (
                <button className="remove-coupon" onClick={() => { setAppliedCoupon(null); setCouponMsg({ text: '', type: '' }); }}>
                  Remove coupon
                </button>
              )}
              <div className="coupon-hints">
                <p>Try: WELCOME10, SAVE500, TECH15, FASHION20, FREESHIP</p>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="price-breakdown">
              <div className="price-row"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {ruleDiscount > 0 && (
                <div className="price-row discount"><span>Rule Discount ({bestDiscount}%)</span><span>-{formatCurrency(ruleDiscount)}</span></div>
              )}
              {couponDiscount > 0 && (
                <div className="price-row discount"><span>Coupon ({appliedCoupon?.code})</span><span>-{formatCurrency(couponDiscount)}</span></div>
              )}
              <div className="price-row"><span>Shipping</span>
                <span>{shipping === 0 ? <span className="free-ship">FREE</span> : formatCurrency(shipping)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="price-row savings"><span>Total Savings</span><span>-{formatCurrency(totalDiscount)}</span></div>
              )}
              <div className="price-row total"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <button className="btn btn-primary w-full btn-lg" onClick={() => navigate('/checkout')}>
              Proceed to Checkout <ArrowRight size={18} />
            </button>
            <Link to="/products" className="btn btn-secondary w-full" style={{ marginTop: '.5rem', justifyContent: 'center', display: 'flex' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
      <style>{`
        .cart-page { padding: 2rem 0; flex: 1; }
        .page-title { display: flex; align-items: center; gap: .75rem; margin-bottom: 1.5rem; }
        .count-badge { background: #e5e7eb; color: #374151; font-size: .8rem; padding: .2rem .6rem; border-radius: 100px; font-weight: 600; }
        .empty-cart { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 2rem; gap: 1rem; text-align: center; }
        .cart-layout { display: grid; grid-template-columns: 1fr 360px; gap: 2rem; align-items: start; }
        @media(max-width:900px) { .cart-layout { grid-template-columns: 1fr; } }
        .cart-items { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.06); overflow: hidden; }
        .cart-item { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; border-bottom: 1px solid #f3f4f6; }
        .cart-item:last-child { border-bottom: none; }
        .item-image { font-size: 2.5rem; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 10px; flex-shrink: 0; }
        .item-info { flex: 1; min-width: 0; }
        .item-name { font-size: .9rem; font-weight: 700; color: #111827; display: block; margin-bottom: .15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .item-category { font-size: .75rem; color: #6b7280; }
        .item-price { font-size: .875rem; font-weight: 700; color: #6366f1; }
        .item-controls { display: flex; flex-direction: column; align-items: flex-end; gap: .5rem; flex-shrink: 0; }
        .qty-control { display: flex; align-items: center; border: 1.5px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .qty-control button { background: #f9fafb; border: none; padding: .35rem .6rem; cursor: pointer; display: flex; align-items: center; transition: background .15s; }
        .qty-control button:hover { background: #e5e7eb; }
        .qty-control span { padding: .35rem .75rem; font-weight: 700; font-size: .875rem; min-width: 36px; text-align: center; }
        .item-total { font-size: .9rem; font-weight: 700; color: #111827; }
        .remove-btn { background: none; border: none; color: #ef4444; cursor: pointer; display: flex; padding: .25rem; border-radius: 6px; transition: background .15s; }
        .remove-btn:hover { background: #fee2e2; }
        .cart-summary { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.06); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; position: sticky; top: 80px; }
        .rules-applied { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: .875rem; }
        .rules-header { display: flex; align-items: center; gap: .4rem; font-size: .8rem; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .5rem; }
        .rule-item { display: flex; justify-content: space-between; font-size: .8rem; color: #065f46; padding: .2rem 0; }
        .rule-action { font-weight: 700; }
        .coupon-section { display: flex; flex-direction: column; gap: .5rem; }
        .coupon-input { display: flex; gap: .5rem; }
        .coupon-msg { font-size: .8rem; font-weight: 600; }
        .coupon-msg.success { color: #065f46; }
        .coupon-msg.error { color: #991b1b; }
        .remove-coupon { background: none; border: none; font-size: .8rem; color: #ef4444; cursor: pointer; text-align: left; text-decoration: underline; }
        .coupon-hints p { font-size: .75rem; color: #9ca3af; font-family: monospace; }
        .price-breakdown { display: flex; flex-direction: column; gap: .5rem; border-top: 1px solid #f3f4f6; padding-top: 1rem; }
        .price-row { display: flex; justify-content: space-between; font-size: .875rem; color: #374151; }
        .price-row.discount span:last-child { color: #059669; font-weight: 700; }
        .price-row.savings { color: #059669; font-weight: 600; background: #f0fdf4; padding: .25rem .5rem; border-radius: 6px; }
        .price-row.total { font-size: 1.1rem; font-weight: 800; color: #111827; border-top: 2px solid #e5e7eb; padding-top: .75rem; margin-top: .25rem; }
        .free-ship { color: #059669; font-weight: 700; }
      `}</style>
    </div>
  );
}
