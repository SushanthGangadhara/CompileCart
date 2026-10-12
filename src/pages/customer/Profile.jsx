import React, { useState } from 'react';
import { User, MapPin, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserStore, generateId } from '../../data/storage';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Home', line1: '', city: '', state: '', pincode: '' });

  const addresses = user?.addresses || [];

  function saveProfile(e) {
    e.preventDefault();
    if (!profileForm.name.trim()) return;
    updateProfile({ name: profileForm.name.trim(), phone: profileForm.phone.trim() });
    setProfileMsg('Profile updated!');
    setTimeout(() => setProfileMsg(''), 3000);
  }

  function changePassword(e) {
    e.preventDefault();
    const stored = UserStore.findById(user.id);
    if (stored.password !== pwForm.current) { setPwError('Current password is incorrect.'); return; }
    if (pwForm.newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    UserStore.update({ ...stored, password: pwForm.newPw });
    setPwForm({ current: '', newPw: '', confirm: '' });
    setPwError('');
    setPwMsg('Password changed!');
    setTimeout(() => setPwMsg(''), 3000);
  }

  function addAddress() {
    if (!newAddr.line1.trim() || !newAddr.city.trim() || !newAddr.pincode.trim()) return;
    const addr = { ...newAddr, id: generateId(), isDefault: addresses.length === 0 };
    updateProfile({ addresses: [...addresses, addr] });
    setNewAddr({ label: 'Home', line1: '', city: '', state: '', pincode: '' });
    setShowAddAddr(false);
  }

  function removeAddress(id) {
    updateProfile({ addresses: addresses.filter(a => a.id !== id) });
  }

  function setDefault(id) {
    updateProfile({ addresses: addresses.map(a => ({ ...a, isDefault: a.id === id })) });
  }

  return (
    <div className="container-sm" style={{ padding: '2rem 1.5rem', flex: 1 }}>
      <div className="page-header"><h1 className="page-title"><User size={22} /> My Profile</h1></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Profile info */}
        <div className="card card-body">
          <h3 style={{ marginBottom: '1.25rem' }}>Personal Information</h3>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" value={user?.email} disabled style={{ opacity: .6 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={profileForm.phone}
                onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <input className="form-control" value={user?.customerType === 'premium' ? '⭐ Premium' : 'Regular'} disabled style={{ opacity: .6 }} />
            </div>
            {profileMsg && <div className="alert alert-success">{profileMsg}</div>}
            <button type="submit" className="btn btn-primary"><Save size={15} /> Save Changes</button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card card-body">
          <h3 style={{ marginBottom: '1.25rem' }}>Change Password</h3>
          <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '.875rem' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-control" value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-control" value={pwForm.newPw}
                onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-control" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            {pwError && <div className="alert alert-danger">{pwError}</div>}
            {pwMsg && <div className="alert alert-success">{pwMsg}</div>}
            <button type="submit" className="btn btn-primary">Update Password</button>
          </form>
        </div>

        {/* Addresses */}
        <div className="card card-body" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3><MapPin size={18} /> Saved Addresses</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setShowAddAddr(v => !v)}>
              <Plus size={14} /> Add Address
            </button>
          </div>

          {showAddAddr && (
            <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.875rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Label</label>
                  <select className="form-control" value={newAddr.label}
                    onChange={e => setNewAddr(a => ({ ...a, label: e.target.value }))}>
                    <option>Home</option><option>Office</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Address</label>
                  <input className="form-control" value={newAddr.line1}
                    onChange={e => setNewAddr(a => ({ ...a, line1: e.target.value }))} placeholder="Street, Area" />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" value={newAddr.city}
                    onChange={e => setNewAddr(a => ({ ...a, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-control" value={newAddr.state}
                    onChange={e => setNewAddr(a => ({ ...a, state: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-control" value={newAddr.pincode} maxLength={6}
                    onChange={e => setNewAddr(a => ({ ...a, pincode: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                <button className="btn btn-primary btn-sm" onClick={addAddress}>Save Address</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddAddr(false)}>Cancel</button>
              </div>
            </div>
          )}

          {addresses.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '.875rem' }}>No saved addresses yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {addresses.map(addr => (
                <div key={addr.id} style={{ border: `2px solid ${addr.isDefault ? '#6366f1' : '#e5e7eb'}`, borderRadius: '12px', padding: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '.8rem', color: '#6366f1' }}>{addr.label}</span>
                    {addr.isDefault && <span className="badge badge-primary">Default</span>}
                  </div>
                  <p style={{ fontSize: '.875rem', color: '#374151', lineHeight: 1.6 }}>
                    {addr.line1}<br />{addr.city}, {addr.state} - {addr.pincode}
                  </p>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                    {!addr.isDefault && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setDefault(addr.id)}>Set Default</button>
                    )}
                    <button className="btn btn-sm" style={{ color: '#ef4444', background: 'none', border: 'none' }}
                      onClick={() => removeAddress(addr.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
