import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@shopdemo.com', password: 'Admin@123' });
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const result = login(form.email, form.password);
    if (!result.success) { setError(result.error); return; }
    if (result.user.role !== 'admin') { setError('This account does not have admin access.'); return; }
    navigate('/admin');
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-logo"><Zap size={32} color="#818cf8" /></div>
          <h1>Admin Portal</h1>
          <p>ShopDemo — Compiler Design Rule Engine</p>
        </div>

        <div className="demo-cred-box">
          <p>Demo: <strong>admin@shopdemo.com</strong> / <strong>Admin@123</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-control dark-input" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="pw-wrap">
              <input type={showPw ? 'text' : 'password'} className="form-control dark-input" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full">
            <LogIn size={18} /> Sign In to Admin
          </button>
        </form>
      </div>
      <style>{`
        .admin-login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; padding: 2rem 1rem; }
        .admin-login-card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 2.5rem; width: 100%; max-width: 420px; }
        .admin-login-header { text-align: center; margin-bottom: 1.5rem; }
        .admin-logo { display: flex; justify-content: center; margin-bottom: 1rem; }
        .admin-login-header h1 { color: #f1f5f9; font-size: 1.5rem; }
        .admin-login-header p { color: #64748b; font-size: .875rem; }
        .demo-cred-box { background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.3); border-radius: 10px; padding: .75rem; text-align: center; font-size: .85rem; color: #94a3b8; margin-bottom: 1.25rem; }
        .demo-cred-box strong { color: #818cf8; }
        .admin-login-form { display: flex; flex-direction: column; gap: 1rem; }
        .dark-input { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        .dark-input::placeholder { color: #475569 !important; }
        .dark-input:focus { border-color: #6366f1 !important; }
        .form-label { color: #94a3b8 !important; }
        .pw-wrap { position: relative; }
        .pw-wrap .form-control { padding-right: 2.5rem; }
        .pw-toggle { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #64748b; display: flex; }
      `}</style>
    </div>
  );
}
