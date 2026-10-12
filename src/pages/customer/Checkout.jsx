import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, MapPin, Package, CheckCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { OrderStore, ProductStore, generateId, formatCurrency } from '../../data/storage';

const STEPS = ['Address', 'Payment', 'Review'];

export default function Checkout() {
  const { enrichedCart, subtotal, evaluateRules, clearCart, appliedCoupon } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState(
    user?.addresses?.find(a => a.isDefault) ||
    { line1: '', city: '', state: '', pincode: '' }
  );
  const [payment, setPayment] = useState({ method: 'card', cardNum: '', expiry: '', cvv: '', upi: '' });
  const [errors, setErrors] = useState({});
  const [placing, setPlacing] = useState(false);

  const { bestDiscount, shipping, applied, ruleDiscount, couponDiscount, totalDiscount, total } = evaluateRules();

  function validateAddress() {
    const e = {};
    if (!address.line1.trim()) e.line1 = 'Address is required';
    if (!address.city.trim()) e.city = 'City is required';
    if (!address.state.trim()) e.state = 'State is required';
    if (!address.pincode.match(/^\d{6}$/)) e.pincode = 'Valid 6-digit pincode required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validatePayment() {
    const e = {};
    if (payment.method === 'card') {
      if (!payment.cardNum.match(/^\d{16}$/)) e.cardNum = 'Enter valid 16-digit card number';
      if (!payment.expiry.match(/^\d{2}\/\d{2}$/)) e.expiry = 'Format: MM/YY';
      if (!payment.cvv.match(/^\d{3}$/)) e.cvv = '3-digit CVV required';
    }
    if (payment.method === 'upi') {
      if (!payment.upi.includes('@')) e.upi = 'Enter valid UPI ID (e.g., name@upi)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 0 && !validateAddress()) return;
    if (step === 1 && !validatePayment()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
  }

  function handlePlaceOrder() {
    setPlacing(true);
    // Deduct stock
    enrichedCart.forEach(item => {
      ProductStore.updateStock(item.productId, -item.quantity);
    });
    // Create order
    const order = {
      id: generateId(),
      customerId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      items: enrichedCart.map(item => ({
        productId: item.productId,
        name: item.product.name,
        category: item.product.category,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
      })),
      subtotal,
      discount: totalDiscount,
      ruleDiscount,
      couponDiscount,
      couponCode: appliedCoupon?.code || null,
      shipping,
      total,
      appliedRules: applied,
      address: { ...address },
      paymentMethod: payment.method,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    OrderStore.add(order);
    clearCart();
    setTimeout(() => navigate(`/orders/${order.id}`), 500);
  }

  if (enrichedCart.length === 0 && !placing) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="container-sm">
        <h1 className="page-title">Checkout</h1>

        {/* Steps */}
        <div className="step-bar">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-item ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-num">{i < step ? <CheckCircle size={16} /> : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div className="checkout-layout">
          <div className="checkout-form">
            {/* Step 0: Address */}
            {step === 0 && (
              <div className="card card-body">
                <h3><MapPin size={18} /> Delivery Address</h3>
                <div className="form-grid mt-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Address Line</label>
                    <input className={`form-control ${errors.line1 ? 'is-invalid' : ''}`}
                      value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))}
                      placeholder="House no, Street, Area" />
                    {errors.line1 && <p className="form-error">{errors.line1}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className={`form-control ${errors.city ? 'is-invalid' : ''}`}
                      value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                      placeholder="City" />
                    {errors.city && <p className="form-error">{errors.city}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className={`form-control ${errors.state ? 'is-invalid' : ''}`}
                      value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                      placeholder="State" />
                    {errors.state && <p className="form-error">{errors.state}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input className={`form-control ${errors.pincode ? 'is-invalid' : ''}`}
                      value={address.pincode} onChange={e => setAddress(a => ({ ...a, pincode: e.target.value }))}
                      placeholder="560001" maxLength={6} />
                    {errors.pincode && <p className="form-error">{errors.pincode}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Payment */}
            {step === 1 && (
              <div className="card card-body">
                <h3><CreditCard size={18} /> Payment Method</h3>
                <p className="demo-note">⚠️ This is a mock payment — do not enter real card details.</p>
                <div className="payment-methods mt-2">
                  {['card', 'upi', 'cod'].map(m => (
                    <label key={m} className={`method-opt ${payment.method === m ? 'active' : ''}`}>
                      <input type="radio" name="method" value={m}
                        checked={payment.method === m} onChange={() => setPayment(p => ({ ...p, method: m }))} />
                      <span className="method-icon">
                        {m === 'card' ? '💳' : m === 'upi' ? '📱' : '💵'}
                      </span>
                      <span>{m === 'card' ? 'Credit/Debit Card' : m === 'upi' ? 'UPI' : 'Cash on Delivery'}</span>
                    </label>
                  ))}
                </div>
                {payment.method === 'card' && (
                  <div className="form-grid mt-2">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Card Number (use any 16 digits)</label>
                      <input className={`form-control ${errors.cardNum ? 'is-invalid' : ''}`}
                        value={payment.cardNum} maxLength={16}
                        onChange={e => setPayment(p => ({ ...p, cardNum: e.target.value.replace(/\D/g, '') }))}
                        placeholder="1234567890123456" />
                      {errors.cardNum && <p className="form-error">{errors.cardNum}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expiry (MM/YY)</label>
                      <input className={`form-control ${errors.expiry ? 'is-invalid' : ''}`}
                        value={payment.expiry} maxLength={5}
                        onChange={e => setPayment(p => ({ ...p, expiry: e.target.value }))}
                        placeholder="12/26" />
                      {errors.expiry && <p className="form-error">{errors.expiry}</p>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input className={`form-control ${errors.cvv ? 'is-invalid' : ''}`}
                        value={payment.cvv} maxLength={3} type="password"
                        onChange={e => setPayment(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))}
                        placeholder="123" />
                      {errors.cvv && <p className="form-error">{errors.cvv}</p>}
                    </div>
                  </div>
                )}
                {payment.method === 'upi' && (
                  <div className="form-group mt-2">
                    <label className="form-label">UPI ID</label>
                    <input className={`form-control ${errors.upi ? 'is-invalid' : ''}`}
                      value={payment.upi} onChange={e => setPayment(p => ({ ...p, upi: e.target.value }))}
                      placeholder="yourname@paytm" />
                    {errors.upi && <p className="form-error">{errors.upi}</p>}
                  </div>
                )}
                {payment.method === 'cod' && (
                  <div className="alert alert-info mt-2">Pay ₹{formatCurrency(total)} at the time of delivery.</div>
                )}
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="card card-body">
                <h3><Package size={18} /> Order Review</h3>
                <div className="review-items mt-2">
                  {enrichedCart.map(item => (
                    <div key={item.productId} className="review-item">
                      <span className="review-emoji">{item.product.image}</span>
                      <div className="review-item-info">
                        <span className="review-item-name">{item.product.name}</span>
                        <span className="review-item-qty">Qty: {item.quantity}</span>
                      </div>
                      <span className="review-item-price">{formatCurrency(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="review-address mt-2">
                  <strong>Deliver to:</strong> {address.line1}, {address.city}, {address.state} - {address.pincode}
                </div>
                <div className="review-payment">
                  <strong>Payment:</strong> {payment.method === 'card' ? 'Credit/Debit Card' : payment.method === 'upi' ? `UPI: ${payment.upi}` : 'Cash on Delivery'}
                </div>
              </div>
            )}

            <div className="step-actions">
              {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
              {step < STEPS.length - 1
                ? <button className="btn btn-primary btn-lg" onClick={handleNext}>Next →</button>
                : <button className="btn btn-success btn-lg" onClick={handlePlaceOrder} disabled={placing}>
                    {placing ? 'Placing Order…' : '✓ Place Order'}
                  </button>
              }
            </div>
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <div className="card card-body">
              <h3>Order Summary</h3>
              <div className="price-breakdown mt-2">
                <div className="price-row"><span>Subtotal ({enrichedCart.length} items)</span><span>{formatCurrency(subtotal)}</span></div>
                {ruleDiscount > 0 && <div className="price-row discount"><span>Rule Discount ({bestDiscount}%)</span><span>-{formatCurrency(ruleDiscount)}</span></div>}
                {couponDiscount > 0 && <div className="price-row discount"><span>Coupon</span><span>-{formatCurrency(couponDiscount)}</span></div>}
                <div className="price-row"><span>Shipping</span><span>{shipping === 0 ? <span style={{color:'#059669',fontWeight:700}}>FREE</span> : formatCurrency(shipping)}</span></div>
                <div className="price-row total"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
              {totalDiscount > 0 && (
                <div className="savings-badge">You save {formatCurrency(totalDiscount)}!</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .checkout-page { padding: 2rem 0; flex: 1; }
        .step-bar { display: flex; gap: 0; margin-bottom: 2rem; }
        .step-item { display: flex; align-items: center; gap: .5rem; font-size: .875rem; color: #9ca3af; flex: 1; position: relative; }
        .step-item::after { content: ''; flex: 1; height: 2px; background: #e5e7eb; margin: 0 .5rem; }
        .step-item:last-child::after { display: none; }
        .step-item.active { color: #6366f1; }
        .step-item.done { color: #059669; }
        .step-num { width: 28px; height: 28px; border-radius: 50%; border: 2px solid currentColor; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; flex-shrink: 0; background: #fff; }
        .step-item.active .step-num { background: #6366f1; color: #fff; border-color: #6366f1; }
        .step-item.done .step-num { background: #059669; color: #fff; border-color: #059669; }
        .checkout-layout { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; align-items: start; }
        @media(max-width:768px) { .checkout-layout { grid-template-columns: 1fr; } }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media(max-width:480px) { .form-grid { grid-template-columns: 1fr; } }
        .is-invalid { border-color: #ef4444 !important; }
        .demo-note { font-size: .8rem; background: #fffbeb; border: 1px solid #fde68a; padding: .5rem .75rem; border-radius: 8px; color: #92400e; margin-top: .5rem; }
        .payment-methods { display: flex; flex-direction: column; gap: .5rem; }
        .method-opt { display: flex; align-items: center; gap: .75rem; padding: .875rem; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: all .2s; }
        .method-opt.active { border-color: #6366f1; background: #ede9fe; }
        .method-opt input { display: none; }
        .method-icon { font-size: 1.25rem; }
        .step-actions { display: flex; justify-content: space-between; margin-top: 1.5rem; }
        .review-items { display: flex; flex-direction: column; gap: .75rem; }
        .review-item { display: flex; align-items: center; gap: .75rem; }
        .review-emoji { font-size: 1.75rem; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; background: #f9fafb; border-radius: 8px; }
        .review-item-info { flex: 1; }
        .review-item-name { font-size: .875rem; font-weight: 700; display: block; }
        .review-item-qty { font-size: .75rem; color: #6b7280; }
        .review-item-price { font-weight: 700; font-size: .875rem; }
        .review-address, .review-payment { font-size: .875rem; color: #374151; padding: .5rem 0; border-top: 1px solid #f3f4f6; }
        .price-breakdown { display: flex; flex-direction: column; gap: .5rem; }
        .price-row { display: flex; justify-content: space-between; font-size: .875rem; color: #374151; }
        .price-row.discount span:last-child { color: #059669; font-weight: 700; }
        .price-row.total { font-size: 1.1rem; font-weight: 800; border-top: 2px solid #e5e7eb; padding-top: .75rem; margin-top: .25rem; }
        .savings-badge { background: #d1fae5; color: #065f46; text-align: center; font-weight: 700; padding: .5rem; border-radius: 8px; font-size: .875rem; margin-top: .75rem; }
      `}</style>
    </div>
  );
}
