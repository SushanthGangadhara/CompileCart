import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Package, CheckCircle, Truck, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { OrderStore, formatCurrency, formatDateTime } from '../../data/storage';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  Pending:   { icon: <Clock size={16} />, color: '#f59e0b', bg: '#fef3c7' },
  Confirmed: { icon: <CheckCircle size={16} />, color: '#3b82f6', bg: '#dbeafe' },
  Shipped:   { icon: <Truck size={16} />, color: '#8b5cf6', bg: '#ede9fe' },
  Delivered: { icon: <CheckCircle size={16} />, color: '#10b981', bg: '#d1fae5' },
  Cancelled: { icon: <XCircle size={16} />, color: '#ef4444', bg: '#fee2e2' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.3rem',
      padding: '.25rem .7rem', borderRadius: '100px',
      background: cfg.bg, color: cfg.color,
      fontSize: '.78rem', fontWeight: 700
    }}>
      {cfg.icon} {status}
    </span>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const order = OrderStore.findById(id);

  if (!order || order.customerId !== user?.id) return (
    <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <h2>Order not found</h2>
      <Link to="/orders" className="btn btn-primary mt-2">My Orders</Link>
    </div>
  );

  const statusSteps = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];
  const currentIdx = statusSteps.indexOf(order.status);

  return (
    <div className="container-sm" style={{ padding: '2rem 1.5rem', flex: 1 }}>
      <Link to="/orders" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', color: '#6366f1', fontWeight: 600, marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> My Orders
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem' }}>Order #{order.id.toUpperCase()}</h1>
          <p style={{ color: '#6b7280', fontSize: '.875rem' }}>Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Progress tracker */}
      {order.status !== 'Cancelled' && (
        <div className="card card-body" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '14px', left: '10%', right: '10%', height: '2px', background: '#e5e7eb', zIndex: 0 }} />
            {statusSteps.map((s, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem', zIndex: 1, flex: 1 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: done ? cfg.color : '#e5e7eb',
                    color: done ? '#fff' : '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '.8rem', border: active ? `3px solid ${cfg.color}` : 'none',
                    boxShadow: active ? `0 0 0 4px ${cfg.bg}` : 'none'
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '.75rem', fontWeight: 600, color: done ? cfg.color : '#9ca3af' }}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Items */}
        <div className="card card-body" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1rem' }}>Order Items</h3>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '.625rem 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '.875rem' }}>{item.name}</p>
                <p style={{ fontSize: '.8rem', color: '#6b7280' }}>{item.category} × {item.quantity}</p>
              </div>
              <p style={{ fontWeight: 700, fontSize: '.875rem' }}>{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: '#374151' }}>
              <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem', color: '#059669', fontWeight: 700 }}>
                <span>Discount</span><span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.875rem' }}>
              <span>Shipping</span>
              <span>{order.shipping === 0 ? <span style={{ color: '#059669', fontWeight: 700 }}>FREE</span> : formatCurrency(order.shipping)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', borderTop: '2px solid #e5e7eb', paddingTop: '.75rem' }}>
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card card-body">
          <h3 style={{ marginBottom: '.75rem' }}><Package size={16} /> Delivery Address</h3>
          <p style={{ fontSize: '.875rem', color: '#374151' }}>
            {order.address.line1}<br />
            {order.address.city}, {order.address.state}<br />
            {order.address.pincode}
          </p>
        </div>

        {/* Payment */}
        <div className="card card-body">
          <h3 style={{ marginBottom: '.75rem' }}>Payment</h3>
          <p style={{ fontSize: '.875rem', color: '#374151' }}>
            {order.paymentMethod === 'card' ? '💳 Credit/Debit Card' :
             order.paymentMethod === 'upi' ? '📱 UPI' : '💵 Cash on Delivery'}
          </p>
          {order.appliedRules?.length > 0 && (
            <div style={{ marginTop: '.75rem' }}>
              <p style={{ fontSize: '.75rem', fontWeight: 700, color: '#6b7280', marginBottom: '.25rem' }}>APPLIED RULES</p>
              {order.appliedRules.map((r, i) => (
                <p key={i} style={{ fontSize: '.8rem', color: '#059669' }}>✓ {r.ruleName}: {r.action}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Orders() {
  const { user } = useAuth();
  const orders = OrderStore.getByCustomer(user?.id || '');

  if (orders.length === 0) return (
    <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <Package size={64} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
      <h2>No orders yet</h2>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Start shopping to see your orders here</p>
      <Link to="/products" className="btn btn-primary btn-lg">Shop Now</Link>
    </div>
  );

  return (
    <div className="container-sm" style={{ padding: '2rem 1.5rem', flex: 1 }}>
      <div className="page-header"><h1 className="page-title">My Orders</h1></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {orders.map(order => (
          <Link to={`/orders/${order.id}`} key={order.id} style={{ textDecoration: 'none' }}>
            <div className="card card-body order-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
                <div>
                  <p style={{ fontWeight: 700, color: '#111827' }}>Order #{order.id.toUpperCase()}</p>
                  <p style={{ fontSize: '.8rem', color: '#6b7280' }}>{formatDateTime(order.createdAt)}</p>
                  <p style={{ fontSize: '.875rem', color: '#374151', marginTop: '.25rem' }}>
                    {order.items.length} item(s) · {formatCurrency(order.total)}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      <style>{`
        .order-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
