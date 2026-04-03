import { useEffect, useMemo, useRef, useState } from 'react';
import axios from '../utils/axiosConfig';
import axios from '../utils/axiosConfig';
import { API_BASE } from '../config';
import AppCard from '../components/ui/AppCard';
import '../styles/stream-layout.css';

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileRef = useRef(null);

  const avatarSrc = useMemo(() => {
    const url = me?.avatar_url ? `${API_BASE}${me.avatar_url}` : '';
    return avatarPreview || url;
  }, [me, avatarPreview]);

  const loadMe = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get('/auth/me');
      setMe(res.data);
      setForm({
        name: res.data?.name || '',
        email: res.data?.email || '',
        phone: res.data?.landlord_phone || res.data?.tenant_phone || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const updateProfile = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const payload = { name: form.name, email: form.email };
      if (me?.role === 'landlord') payload.phone = form.phone;
      const res = await axios.put('/auth/profile', payload);
      setMe((prev) => ({ ...(prev || {}), ...(res.data || {}) }));
      setEditing(false);
      setMessage('Profile updated.');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    try {
      await axios.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed.');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to change password');
    }
  };

  const onPickAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image too large. Max 2MB.');
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setAvatarPreview(dataUrl);
      setError('');
    } catch {
      setError('Failed to read image.');
    }
  };

  const saveAvatar = async () => {
    if (!avatarPreview) return;
    setMessage('');
    setError('');
    try {
      await axios.put('/auth/avatar', { image_base64: avatarPreview });
      setAvatarPreview('');
      await loadMe();
      setMessage('Avatar updated.');
      setTimeout(() => setMessage(''), 2500);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update avatar');
    }
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch {}
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Account</p>
            <h1 className="rf-page-title">Profile</h1>
            <p className="rf-page-subtitle">
              Manage your photo, account details, password, and session access in the same workspace style.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <div className="rf-neo-live-badge">
              <span className="rf-status-dot" aria-hidden="true" />
              <span>Secure</span>
            </div>
          </div>
        </section>

        {message ? (
          <div className="rf-empty" style={{ borderColor: '#d1fae5', color: '#7ef7a6', marginBottom: 12 }}>
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rf-empty rf-empty-danger" style={{ marginBottom: 12 }}>
            {error}
          </div>
        ) : null}

        {loading ? (
          <AppCard className="rf-empty-card">Loading profile...</AppCard>
        ) : (
          <>
            <div className="rf-stats-grid">
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Account Role</div>
                <div className="rf-stat-value">{me?.role || '-'}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Email</div>
                <div className="rf-stat-value rf-stat-cyan" style={{ fontSize: 22 }}>{me?.email || '-'}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Phone</div>
                <div className="rf-stat-value rf-stat-green" style={{ fontSize: 22 }}>
                  {me?.landlord_phone || me?.tenant_phone || '-'}
                </div>
              </AppCard>
            </div>

            <div className="rf-chat-grid" style={{ gridTemplateColumns: '380px 1fr' }}>
              <section className="rf-panel rf-reveal" style={{ '--delay': '120ms' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 74,
                      height: 74,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '1px solid var(--app-border)',
                      background: 'var(--app-surface-2)',
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                    }}
                    aria-label="Avatar"
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <strong style={{ fontSize: 22 }}>{String(me?.name || 'U')[0]?.toUpperCase()}</strong>
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{me?.name || '-'}</h3>
                    <p style={{ margin: 0, color: 'var(--rf-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {me?.email || '-'} • {me?.role || '-'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onPickAvatar}
                    style={{ display: 'none' }}
                  />
                  <div className="rf-inline-actions">
                    <button type="button" className="rf-btn" onClick={() => fileRef.current?.click()}>
                      Choose Photo
                    </button>
                    <button type="button" className="rf-btn rf-btn-primary" onClick={saveAvatar} disabled={!avatarPreview}>
                      Save Photo
                    </button>
                  </div>
                  <small style={{ color: 'var(--rf-muted)' }}>PNG/JPEG/WebP, max 2MB.</small>
                </div>

                {me?.role === 'tenant' ? (
                  <div className="rf-list-row" style={{ marginTop: 16 }}>
                    <div className="rf-list-title">Tenant</div>
                    <div className="rf-list-meta">
                      {me?.tenant_property_name ? `Property: ${me.tenant_property_name}` : 'Property: -'}
                      {me?.tenant_unit_number ? ` • Unit: ${me.tenant_unit_number}` : ''}
                    </div>
                  </div>
                ) : null}

                <div style={{ marginTop: 16 }}>
                  <button type="button" className="rf-btn rf-btn-danger" onClick={logout}>
                    Logout
                  </button>
                </div>
              </section>

              <section className="rf-panel rf-reveal" style={{ '--delay': '180ms' }}>
                <div className="rf-section-head">
                  <div>
                    <h3>Account Details</h3>
                    <p>Update your profile and security settings.</p>
                  </div>
                  <button type="button" className="rf-btn" onClick={() => setEditing((v) => !v)}>
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {!editing ? (
                  <div className="rf-grid cols-3" style={{ marginTop: 14 }}>
                    <div className="rf-list-row">
                      <p className="rf-card-meta">Name</p>
                      <p style={{ marginTop: 6, fontWeight: 800 }}>{me?.name || '-'}</p>
                    </div>
                    <div className="rf-list-row">
                      <p className="rf-card-meta">Email</p>
                      <p style={{ marginTop: 6, fontWeight: 800 }}>{me?.email || '-'}</p>
                    </div>
                    <div className="rf-list-row">
                      <p className="rf-card-meta">Phone</p>
                      <p style={{ marginTop: 6, fontWeight: 800 }}>{me?.landlord_phone || me?.tenant_phone || '-'}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={updateProfile} style={{ display: 'grid', gap: 10, marginTop: 14, maxWidth: 560 }}>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Full name"
                    />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Email"
                    />
                    {me?.role === 'landlord' ? (
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="Phone"
                      />
                    ) : null}
                    <div className="rf-form-actions">
                      <button className="rf-btn rf-btn-primary" type="submit">Save</button>
                    </div>
                  </form>
                )}

                <div style={{ marginTop: 18 }}>
                  <h3 style={{ margin: 0 }}>Change Password</h3>
                  <form onSubmit={changePassword} style={{ display: 'grid', gap: 10, marginTop: 12, maxWidth: 560 }}>
                    <input
                      type="password"
                      placeholder="Current password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                    />
                    <input
                      type="password"
                      placeholder="New password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                    />
                    <div className="rf-form-actions">
                      <button className="rf-btn rf-btn-primary" type="submit">Update Password</button>
                    </div>
                  </form>
                </div>
              </section>
            </div>
          </>
        )}
    </>
  );
}
