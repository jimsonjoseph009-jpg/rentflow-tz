import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';
import {
  getSubscriptionStatus,
  hasSubscriptionAccess,
  isGracePeriodSubscription,
  isTrialSubscription,
} from '../utils/subscription';
import '../styles/stream-layout.css';

const PAYMENT_METHODS = [
  { value: 'mpesa', label: 'M-Pesa', icon: '📱' },
  { value: 'yas', label: 'Tigo Pesa / YAS', icon: '📶' },
  { value: 'airtel_money', label: 'Airtel Money', icon: '🔴' },
  { value: 'halotel', label: 'Halotel Money', icon: '🟠' },
  { value: 'crdb_bank', label: 'CRDB Bank', icon: '🏦' },
  { value: 'nmb_bank', label: 'NMB Bank', icon: '🏛️' },
];

const STATUS_COLORS = {
  success: '#22c55e',
  active: '#22c55e',
  trial: '#f59e0b',
  grace_period: '#f97316',
  pending: '#f59e0b',
  failed: '#ef4444',
  cancelled: '#94a3b8',
  expired: '#94a3b8',
};

const PLAN_GRADIENTS = {
  starter: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  pro: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  enterprise: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
};

const PLAN_RECOMMENDED = 'pro';

function formatTZS(n) {
  return Number(n || 0).toLocaleString('en-TZ');
}

function DaysBar({ expiresAt }) {
  if (!expiresAt) return null;
  const now = Date.now();
  const expMs = new Date(expiresAt).getTime();
  const totalMs = 30 * 24 * 3600 * 1000;
  const remaining = Math.max(0, expMs - now);
  const pct = Math.min(100, Math.round((remaining / totalMs) * 100));
  const daysLeft = Math.ceil(remaining / (24 * 3600 * 1000));
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
        <span>{daysLeft} days remaining</span>
        <span>{new Date(expiresAt).toLocaleDateString()}</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 99,
            background: pct > 50 ? '#22c55e' : pct > 20 ? '#f59e0b' : '#ef4444',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

function PaymentModal({ plan, billingCycle, onClose, onSuccess }) {
  const [form, setForm] = useState({ payment_method: 'mpesa', phone: '' });
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const price = billingCycle === 'yearly' ? plan?.price_yearly : plan?.price_monthly;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(
        '/subscribe',
        { plan_code: plan.code, billing_cycle: billingCycle, ...form },
        { headers }
      );
      if (res.data?.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        // FastLipa may trigger a push to the phone with no checkout URL.
        // Show a pending banner and start polling.
        window.location.href = '/billing?sub=pending';
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Subscription failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#1e2535',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '36px 32px',
          minWidth: 380,
          maxWidth: '95vw',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: '#e2e8f0' }}>Subscribe to {plan?.name}</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} ·{' '}
            <strong style={{ color: '#38bdf8' }}>{formatTZS(price)} TZS</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              Payment Method
            </label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm((p) => ({ ...p, payment_method: e.target.value }))}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10,
                background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0', fontSize: 14, outline: 'none',
              }}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              Phone Number
            </label>
            <input
              required
              type="tel"
              placeholder="0695123456"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
                background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
                color: '#e2e8f0', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Summary */}
          <div style={{ background: '#0f172a', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>
              <span>Plan</span><span style={{ color: '#e2e8f0' }}>{plan?.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#94a3b8' }}>
              <span>Billing</span><span style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{billingCycle}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 15, fontWeight: 600 }}>
              <span style={{ color: '#e2e8f0' }}>Total</span>
              <span style={{ color: '#38bdf8' }}>{formatTZS(price)} TZS</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: '12px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, opacity: loading ? 0.7 : 1, letterSpacing: 0.5,
              }}
            >
              {loading ? 'Processing…' : `Pay ${formatTZS(price)} TZS`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Billing() {
  const token = localStorage.getItem('token');
  const notify = useNotification();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subState, setSubState] = useState({ mode: 'idle', message: '' });
  const [cancelling, setCancelling] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, statusRes, historyRes] = await Promise.all([
        axios.get('/plans'),
        axios.get('/subscription-status', { headers }),
        axios.get('/subscribe/history', { headers }),
      ]);
      setPlans(plansRes.data || []);
      setStatus(statusRes.data || null);
      setHistory(historyRes.data || []);
    } catch (err) {
      console.error('Billing load error', err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle ?sub=success|failed redirect from Fastlipa
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sub = params.get('sub');
    if (!sub) return;
    if (!['success', 'failed', 'pending'].includes(sub)) return;

    setSubState({
      mode: 'processing',
      message:
        sub === 'success'
          ? 'Payment received — activating your subscription…'
          : sub === 'pending'
            ? 'Payment initiated — check your phone to confirm, then wait while we activate your subscription…'
          : 'Payment response received — checking final transaction status…',
    });

    let stopped = false;
    const startedAt = Date.now();
    const maxMs = 45_000;

    const poll = async () => {
      if (stopped) return;
      try {
        const [st, historyRes] = await Promise.all([
          axios.get('/subscription-status?refresh=1', { headers }),
          axios.get('/subscribe/history', { headers }),
        ]);

        const isActive = hasSubscriptionAccess(st.data);
        const expired = st.data?.expires_at ? new Date(st.data.expires_at).getTime() < Date.now() : false;
        if (isActive && !expired) {
          setStatus(st.data);
          setSubState({ mode: 'active', message: '🎉 Subscription activated! You now have full access.' });
          loadData();
          return;
        }

        const latestSubscription = Array.isArray(historyRes.data) ? historyRes.data[0] : null;
        const latestPaymentStatus = String(latestSubscription?.payment_status || '').toLowerCase();
        if (['failed', 'cancelled', 'canceled', 'error'].includes(latestPaymentStatus)) {
          setSubState({ mode: 'failed', message: 'Payment was not completed. Please try again or use another method.' });
          loadData();
          return;
        }

        if (latestPaymentStatus === 'success') {
          setSubState({ mode: 'processing', message: 'Payment confirmed — finishing subscription activation…' });
        }
      } catch { /* retry */ }

      if (Date.now() - startedAt > maxMs) {
        setSubState({ mode: 'pending', message: 'Payment is still processing. Please wait a moment and refresh again shortly.' });
        return;
      }
      setTimeout(poll, 2500);
    };
    poll();
    return () => { stopped = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    setCancelling(true);
    try {
      await axios.post('/subscribe/cancel', {}, { headers });
      notify.success('Cancelled', 'Your subscription has been cancelled.');
      loadData();
    } catch (err) {
      notify.error('Error', err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const statusCode = getSubscriptionStatus(status);
  const isActive = hasSubscriptionAccess(status);
  const isTrialStatus = isTrialSubscription(status);
  const isGracePeriod = isGracePeriodSubscription(status);
  const yearSaving = (plan) => {
    const saved = plan.price_monthly * 12 - plan.price_yearly;
    return saved > 0 ? Math.round((saved / (plan.price_monthly * 12)) * 100) : 0;
  };

  return (
    <div className="rf-page">
      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Billing</p>
            <h1 className="rf-page-title">Billing & Subscription</h1>
            <p className="rf-page-subtitle">Manage your plan, payments, and billing history.</p>
          </div>
        </section>

        {/* Subscription State Banner */}
        {subState.mode !== 'idle' && (
          <div
            style={{
              marginBottom: 24,
              padding: '14px 20px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: subState.mode === 'failed'
                ? 'rgba(239,68,68,0.12)'
                : subState.mode === 'active'
                  ? 'rgba(34,197,94,0.12)'
                  : 'rgba(245,158,11,0.12)',
              border: `1px solid ${subState.mode === 'failed' ? '#ef4444' : subState.mode === 'active' ? '#22c55e' : '#f59e0b'}33`,
            }}
          >
            {subState.mode === 'processing' && (
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #f59e0b', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            )}
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: 14 }}>{subState.message}</p>
          </div>
        )}

        {/* Current Plan Card */}
        <div
          className="rf-section-card"
          style={{
            marginBottom: 32,
            borderRadius: 16,
            padding: '24px 28px',
            background: isActive
              ? 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(59,130,246,0.15) 100%)'
              : 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#e2e8f0' }}>{status?.plan_name || 'Starter Plan'}</h3>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  background: `${STATUS_COLORS[status?.status] || '#94a3b8'}22`,
                  color: STATUS_COLORS[status?.status] || '#94a3b8',
                  border: `1px solid ${STATUS_COLORS[status?.status] || '#94a3b8'}44`,
                  textTransform: 'capitalize',
                }}
              >
                {statusCode || 'inactive'}
              </span>
            </div>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
              {status?.billing_cycle ? `${status.billing_cycle} billing` : 'No active billing cycle'}
            </p>
            {isTrialStatus && (
              <p style={{ margin: '8px 0 0', color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
                You are currently using the Starter trial. Upgrade any time to continue after the trial period.
              </p>
            )}
            {isGracePeriod && (
              <p style={{ margin: '8px 0 0', color: '#f97316', fontSize: 13, fontWeight: 600 }}>
                Your paid plan is in a 48-hour grace period. Renew now to avoid losing access.
              </p>
            )}
            {status?.expires_at && <DaysBar expiresAt={status.expires_at} />}
          </div>
          {isActive && !isTrialStatus && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                border: '1px solid rgba(239,68,68,0.4)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                cursor: cancelling ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel Subscription'}
            </button>
          )}
        </div>

        {/* Billing Cycle Toggle */}
        <div className="rf-toolbar-surface" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 32 }}>
          <span style={{ color: billingCycle === 'monthly' ? '#e2e8f0' : '#64748b', fontWeight: 600, fontSize: 15 }}>Monthly</span>
          <button
            onClick={() => setBillingCycle((c) => c === 'monthly' ? 'yearly' : 'monthly')}
            style={{
              width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: billingCycle === 'yearly' ? 'linear-gradient(135deg,#06b6d4,#3b82f6)' : 'rgba(255,255,255,0.1)',
              position: 'relative', transition: 'background 0.3s',
            }}
          >
            <div
              style={{
                position: 'absolute', top: 3,
                left: billingCycle === 'yearly' ? 27 : 3,
                width: 22, height: 22, borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                transition: 'left 0.25s ease',
              }}
            />
          </button>
          <span style={{ color: billingCycle === 'yearly' ? '#e2e8f0' : '#64748b', fontWeight: 600, fontSize: 15 }}>
            Yearly <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>SAVE UP TO 30%</span>
          </span>
        </div>

        {/* Plan Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 40 }}>
          {loading
            ? [1, 2, 3].map((i) => (
                <div key={i} style={{ height: 360, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />
              ))
            : plans.map((plan) => {
                const grad = PLAN_GRADIENTS[plan.code] || PLAN_GRADIENTS.starter;
                const isRecommended = plan.code === PLAN_RECOMMENDED;
                const isCurrent = plan.code === status?.plan_code && isActive && !isTrialStatus;
                const isTrialPlan = plan.code === status?.plan_code && isTrialStatus;
                const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                const saving = yearSaving(plan);

                return (
                  <div
                    key={plan.id}
                    style={{
                      borderRadius: 16,
                      padding: '2px',
                      background: isRecommended ? grad : 'rgba(255,255,255,0.06)',
                      position: 'relative',
                      boxShadow: isRecommended ? '0 8px 40px rgba(0,0,0,0.4)' : 'none',
                      transform: isRecommended ? 'scale(1.02)' : 'scale(1)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    {isRecommended && (
                      <div
                        style={{
                          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                          background: grad, color: '#fff', fontSize: 11, fontWeight: 700,
                          padding: '4px 14px', borderRadius: 99, letterSpacing: 1, textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⭐ Most Popular
                      </div>
                    )}
                    <div style={{ background: '#1e2535', borderRadius: 14, padding: '28px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                      {/* Icon + name */}
                      <div
                        style={{
                          width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                          background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 20,
                        }}
                      >
                        {plan.code === 'starter' ? '🚀' : plan.code === 'pro' ? '⚡' : '🏢'}
                      </div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#e2e8f0' }}>{plan.name}</h3>
                      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{plan.description}</p>

                      {/* Price */}
                      <div style={{ marginBottom: 20 }}>
                        {plan.code === 'enterprise' ? (
                          <span style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>Custom Pricing</span>
                        ) : (
                          <>
                            <span style={{ fontSize: 30, fontWeight: 800, color: '#e2e8f0' }}>{formatTZS(price)}</span>
                            <span style={{ fontSize: 13, color: '#64748b', marginLeft: 4 }}>TZS / {billingCycle === 'yearly' ? 'year' : 'month'}</span>
                            {billingCycle === 'yearly' && saving > 0 && (
                              <span style={{ display: 'block', fontSize: 12, color: '#22c55e', marginTop: 4 }}>
                                Save {saving}% vs monthly
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {isTrialPlan && (
                        <div
                          style={{
                            marginBottom: 16,
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'rgba(245,158,11,0.12)',
                            border: '1px solid rgba(245,158,11,0.25)',
                            color: '#fbbf24',
                            fontSize: 12,
                            lineHeight: 1.5,
                          }}
                        >
                          Your account is already on the Starter trial. No separate trial activation is needed.
                        </div>
                      )}

                      {/* Features */}
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                        {(plan.features || []).map((f) => (
                          <li key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: '#94a3b8' }}>
                            <span style={{ color: '#22c55e', fontSize: 15 }}>✓</span>
                            {f.name}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {plan.code === 'enterprise' ? (
                        <button
                          onClick={() => document.getElementById('enterprise-section')?.scrollIntoView({ behavior: 'smooth' })}
                          style={{
                            width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)',
                            background: 'transparent', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer', fontSize: 14,
                          }}
                        >
                          Contact Us
                        </button>
                      ) : isCurrent ? (
                        <button
                          disabled
                          style={{
                            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                            background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 700, fontSize: 14, cursor: 'default',
                          }}
                        >
                          ✓ Current Plan
                        </button>
                      ) : isTrialPlan ? (
                        <button
                          disabled
                          style={{
                            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                            background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 700, fontSize: 14, cursor: 'default',
                          }}
                        >
                          You Are On Trial
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          style={{
                            width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                            background: grad, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
                            transition: 'opacity 0.2s', letterSpacing: 0.3,
                          }}
                          onMouseEnter={(e) => (e.target.style.opacity = '0.85')}
                          onMouseLeave={(e) => (e.target.style.opacity = '1')}
                        >
                          {isActive ? 'Switch to ' : 'Subscribe — '}{plan.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Billing History */}
        <div
          className="rf-section-card"
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            padding: '24px 28px',
            marginBottom: 32,
          }}
        >
          <h3 style={{ margin: '0 0 20px', color: '#e2e8f0', fontSize: 18 }}>Billing History</h3>
          {loading ? (
            <p style={{ color: '#64748b' }}>Loading…</p>
          ) : history.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
              No billing history yet. Subscribe to a plan to get started.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    {['Date', 'Plan', 'Cycle', 'Amount', 'Method', 'Payment', 'Sub Status'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => (
                    <tr key={row.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#e2e8f0', fontWeight: 600 }}>{row.plan_name || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8', textTransform: 'capitalize' }}>{row.billing_cycle || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                        {formatTZS(row.amount)} TZS
                      </td>
                      <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{row.payment_method || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${STATUS_COLORS[row.payment_status] || '#94a3b8'}22`,
                            color: STATUS_COLORS[row.payment_status] || '#94a3b8',
                            textTransform: 'capitalize',
                          }}
                        >
                          {row.payment_status || 'pending'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            background: `${STATUS_COLORS[row.status] || '#94a3b8'}22`,
                            color: STATUS_COLORS[row.status] || '#94a3b8',
                            textTransform: 'capitalize',
                          }}
                        >
                          {row.status || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enterprise Section */}
        <div
          id="enterprise-section"
          className="rf-section-card"
          style={{
            borderRadius: 16,
            border: '1px solid rgba(245,158,11,0.2)',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(239,68,68,0.05) 100%)',
            padding: '28px 28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>🏢</span>
            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18 }}>Enterprise Plan</h3>
          </div>
          <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
            Unlimited properties · Custom pricing · White-label · Priority support · Full API access
          </p>
          <a
            href="mailto:support@rentflow.co.tz?subject=Enterprise Plan Inquiry"
            style={{
              display: 'inline-block', padding: '12px 28px', borderRadius: 10,
              background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff',
              fontWeight: 700, textDecoration: 'none', fontSize: 14,
            }}
          >
            Contact Sales →
          </a>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          billingCycle={billingCycle}
          onClose={() => setSelectedPlan(null)}
          onSuccess={() => { setSelectedPlan(null); loadData(); }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
