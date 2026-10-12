import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Zap, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  function fillDemo(email, pw) {
    setForm({ email, password: pw });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const result = login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      navigate(result.user.role === 'admin' ? '/admin' : from, { replace: true });
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo"><Zap size={24} /> ShopDemo</Link>
          <h1>Welcome back</h1>
          <p>Sign in to your account</p>
        </div>

        {/* Demo credentials */}
        <div className="demo-creds">
          <p className="demo-label">Demo Accounts</p>
          <div className="demo-btns">
            <button className="demo-btn" onClick={() => fillDemo('user@shopdemo.com', 'User@123')}>
              👤 Customer
            </button>
            <button className="demo-btn admin-demo" onClick={() => fillDemo('admin@shopdemo.com', 'Admin@123')}>
              ⚡ Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange} className="form-control"
              placeholder="you@example.com" autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input
                type={showPw ? 'text' : 'password'} name="password" value={form.password}
                onChange={handleChange} className="form-control"
                placeholder="Enter password" autoComplete="current-password"
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            <LogIn size={18} /> {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>

      <style>{`
        .auth-page { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, #ede9fe, #dbeafe); }
        .auth-card { background: #fff; border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 440px; box-shadow: 0 16px 48px rgba(0,0,0,.12); }
        .auth-header { text-align: center; margin-bottom: 1.5rem; }
        .auth-logo { display: inline-flex; align-items: center; gap: .5rem; font-size: 1.25rem; font-weight: 800; color: #6366f1; margin-bottom: 1rem; }
        .auth-header h1 { font-size: 1.5rem; margin-bottom: .25rem; }
        .auth-header p { color: #6b7280; font-size: .9rem; }
        .demo-creds { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: .875rem; margin-bottom: 1.25rem; }
        .demo-label { font-size: .75rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; margin-bottom: .5rem; }
        .demo-btns { display: flex; gap: .5rem; }
        .demo-btn { flex: 1; padding: .5rem; border: 2px solid #e5e7eb; border-radius: 8px; background: #fff; font-size: .85rem; font-weight: 600; cursor: pointer; transition: all .2s; }
        .demo-btn:hover { border-color: #6366f1; color: #6366f1; }
        .admin-demo:hover { border-color: #f59e0b; color: #92400e; }
        .auth-form { display: flex; flex-direction: column; gap: 1rem; }
        .pw-wrap { position: relative; }
        .pw-wrap .form-control { padding-right: 2.5rem; }
        .pw-toggle { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280; display: flex; align-items: center; }
        .auth-footer { text-align: center; margin-top: 1.25rem; font-size: .875rem; color: #6b7280; }
        .auth-footer a { color: #6366f1; font-weight: 600; }
      `}</style>
    </div>
  );
}
