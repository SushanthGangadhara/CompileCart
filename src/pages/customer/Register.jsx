import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(form.password)) e.password = 'Password must contain an uppercase letter.';
    if (!/[0-9]/.test(form.password)) e.password = 'Password must contain a number.';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
    return e;
  }

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const result = register(form.name.trim(), form.email.trim(), form.password, form.phone.trim());
    setLoading(false);
    if (result.success) navigate('/');
    else setErrors({ email: result.error });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo"><Zap size={24} /> ShopDemo</Link>
          <h1>Create account</h1>
          <p>Join us for smart shopping with auto-discounts</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange}
              className={`form-control ${errors.name ? 'is-invalid' : ''}`} placeholder="John Doe" />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              className={`form-control ${errors.email ? 'is-invalid' : ''}`} placeholder="you@example.com" />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Phone (optional)</label>
            <input type="tel" name="phone" value={form.phone} onChange={handleChange}
              className="form-control" placeholder="9876543210" />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input type={showPw ? 'text' : 'password'} name="password" value={form.password}
                onChange={handleChange} className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                placeholder="Min. 8 chars, 1 uppercase, 1 number" />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type={showPw ? 'text' : 'password'} name="confirm" value={form.confirm}
              onChange={handleChange} className={`form-control ${errors.confirm ? 'is-invalid' : ''}`}
              placeholder="Re-enter password" />
            {errors.confirm && <p className="form-error">{errors.confirm}</p>}
          </div>

          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            <UserPlus size={18} /> {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
      <style>{`
        .auth-page { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, #ede9fe, #dbeafe); }
        .auth-card { background: #fff; border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 440px; box-shadow: 0 16px 48px rgba(0,0,0,.12); }
        .auth-header { text-align: center; margin-bottom: 1.5rem; }
        .auth-logo { display: inline-flex; align-items: center; gap: .5rem; font-size: 1.25rem; font-weight: 800; color: #6366f1; margin-bottom: 1rem; }
        .auth-header h1 { font-size: 1.5rem; margin-bottom: .25rem; }
        .auth-header p { color: #6b7280; font-size: .9rem; }
        .auth-form { display: flex; flex-direction: column; gap: .875rem; }
        .is-invalid { border-color: #ef4444 !important; }
        .pw-wrap { position: relative; }
        .pw-wrap .form-control { padding-right: 2.5rem; }
        .pw-toggle { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280; display: flex; }
        .auth-footer { text-align: center; margin-top: 1.25rem; font-size: .875rem; color: #6b7280; }
        .auth-footer a { color: #6366f1; font-weight: 600; }
      `}</style>
    </div>
  );
}
