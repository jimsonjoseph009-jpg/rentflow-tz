import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import '../styles/stream-layout.css';

export default function PublicInviteAccept() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedEmail, setAcceptedEmail] = useState('');

  const canSubmit = useMemo(() => {
    if (!invite) return false;
    if (!password || password.length < 6) return false;
    if (password !== confirm) return false;
    return true;
  }, [invite, password, confirm]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/public/tenant-invites/${token}`);
        setInvite(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load invite');
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const accept = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(`/public/tenant-invites/${token}/accept`, { password });
      const email = res.data?.user?.email || invite?.tenant_email || '';
      setAcceptedEmail(email);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rf-page">
      <main className="rf-page-content narrow" style={{ paddingTop: 34 }}>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Secure Invite</p>
            <h1 className="rf-page-title">Tenant Account</h1>
            <p className="rf-page-subtitle">
              Activate your account to view updates and communicate with your landlord.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <div className="rf-neo-live-badge">
              <span className="rf-status-dot" aria-hidden="true" />
              <span>Secure</span>
            </div>
          </div>
        </section>

        <AppCard className="rf-section-card">
          {loading ? (
            <div className="rf-empty">Loading invite...</div>
          ) : error ? (
            <div className="rf-empty rf-empty-danger">{error}</div>
          ) : acceptedEmail ? (
            <div className="rf-grid" style={{ gap: 10 }}>
              <h2 style={{ margin: 0 }}>Account created</h2>
              <p className="rf-list-meta">
                You can now login using: <strong>{acceptedEmail}</strong>
              </p>
              <div className="rf-inline-actions">
                <Link className="rf-btn rf-btn-primary" to="/login">Go to Login</Link>
                <Link className="rf-btn" to="/">Home</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="rf-section-head">
                <div>
                  <h3>Invite details</h3>
                  <p>
                    {invite?.tenant_name ? `Tenant: ${invite.tenant_name}` : ''}
                    {invite?.property_name ? ` • Property: ${invite.property_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="rf-list-row" style={{ marginBottom: 14 }}>
                <div className="rf-list-meta">Email: <strong>{invite?.tenant_email || '-'}</strong></div>
              </div>

              <form onSubmit={accept} className="rf-grid" style={{ maxWidth: 520 }}>
                <label className="rf-grid" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 800 }}>Create password</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                </label>

                <label className="rf-grid" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 800 }}>Confirm password</span>
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </label>

                <div className="rf-form-actions">
                  <button className="rf-btn rf-btn-primary" type="submit" disabled={!canSubmit || submitting}>
                    {submitting ? 'Activating...' : 'Activate Account'}
                  </button>
                </div>
              </form>
            </>
          )}
        </AppCard>
      </main>
    </div>
  );
}
