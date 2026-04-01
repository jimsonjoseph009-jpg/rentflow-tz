import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axiosConfig';

/**
 * SubscriptionGuard — wraps protected pages.
 * Users with an active (or trial) subscription see the page.
 * Otherwise they see an "Upgrade Required" screen with a link to /billing.
 */
export default function SubscriptionGuard({ children }) {
  const [status, setStatus] = useState('loading'); // 'allowed' | 'blocked' | 'loading' | 'grace'
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const loggedIn = Boolean(localStorage.getItem('user'));

  useEffect(() => {
    // The app primarily uses cookie auth (httpOnly token). Some pages also use a Bearer token in localStorage.
    // Do not force /login when the Bearer token is missing; rely on `user` + cookie session instead.
    if (!loggedIn) {
      navigate('/login', { replace: true });
      return;
    }

    let cancelled = false;

    // Check role to bypass for admins
    let role = null;
    try {
      const raw = localStorage.getItem('user');
      role = raw ? JSON.parse(raw)?.role : null;
    } catch {}

    if (role === 'admin') {
      setStatus('allowed');
      return;
    }

    const check = async () => {
      try {
        setStatus('loading');
        const res = await axios.get(
          '/subscription-status',
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );

        if (cancelled) return;

        const sub = res.data;
        const subStatus = String(sub?.status || '').toLowerCase();

        // The backend handles expiry calculations now.
        if (['active', 'trial', 'grace_period'].includes(subStatus)) {
          setStatus(subStatus === 'grace_period' ? 'grace' : 'allowed');
        } else {
          setStatus('blocked');
        }
      } catch (error) {
        if (cancelled) return;
        const httpStatus = error?.response?.status;
        if (httpStatus === 401 || httpStatus === 403) {
          try {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          } catch {}
          navigate('/login', { replace: true });
          return;
        }
        setStatus('blocked');
      }
    };

    check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, token, navigate]);

  if (status === 'loading' || status === null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '80vh',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid rgba(56,189,248,0.3)',
            borderTopColor: '#38bdf8',
            animation: 'rf-spin 0.7s linear infinite',
          }}
        />
        <p style={{ color: '#64748b', margin: 0 }}>Checking subscription…</p>
        <style>{`@keyframes rf-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: 480,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '52px 40px',
          }}
        >
          {/* Lock Icon */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))',
              border: '1px solid rgba(56,189,248,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 24px',
            }}
          >
            🔒
          </div>

          <h2
            style={{
              margin: '0 0 12px',
              fontSize: 22,
              fontWeight: 700,
              color: '#e2e8f0',
            }}
          >
            Subscription Required
          </h2>
          <p
            style={{
              margin: '0 0 28px',
              color: '#64748b',
              lineHeight: 1.6,
              fontSize: 15,
            }}
          >
            This feature requires an active subscription. Choose a plan that fits your needs and unlock all of RentFlow's powerful tools.
          </p>

          {/* Feature highlights */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 32,
              textAlign: 'left',
            }}
          >
            {[
              '✅ Property & Tenant Management',
              '✅ Automated Rent Collection',
              '✅ Analytics & Financial Reports',
              '✅ Maintenance Tracking',
              '✅ SMS Notifications',
            ].map((f) => (
              <span key={f} style={{ fontSize: 13, color: '#94a3b8' }}>
                {f}
              </span>
            ))}
          </div>

          <button
            onClick={() => navigate('/billing')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              letterSpacing: 0.3,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            Upgrade Your Plan →
          </button>

          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#475569' }}>
            Plans start from 15,000 TZS/month
          </p>
        </div>
      </div>
    );
  }

  if (status === 'grace') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          background: 'linear-gradient(to right, #ef4444, #dc2626)',
          color: '#fff',
          padding: '12px 20px',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: 14,
          zIndex: 9999,
          position: 'sticky',
          top: 0
        }}>
          ⚠️ Your subscription has expired. You are in a 48-hour grace period.
          <button
            onClick={() => navigate('/billing')}
            style={{
              background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', 
              padding: '4px 12px', borderRadius: 99, marginLeft: 12, 
              cursor: 'pointer', fontWeight: 700, fontSize: 12
            }}
          >
            Renew Now
          </button>
        </div>
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    );
  }

  return children;
}
