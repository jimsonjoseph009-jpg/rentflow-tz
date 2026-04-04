import { useEffect, useMemo, useRef, useState } from 'react';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import AppModal from '../components/ui/AppModal';
import '../styles/stream-layout.css';

const safeArray = (value) => (Array.isArray(value) ? value : []);

export default function TenantDashboard() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [marketMedia, setMarketMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const heroMediaRef = useRef(null);
  const heroPausedRef = useRef(false);
  
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [payFormData, setPayFormData] = useState({ amount: '', transaction_id: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      const results = await Promise.allSettled([
        axios.get('/auth/me'),
        axios.get('/payments/history'),
        axios.get('/notifications?limit=20'),
        axios.get('/marketplace/public'),
      ]);

      const [meRes, payRes, notifRes, marketRes] = results;

      if (meRes.status === 'fulfilled') setMe(meRes.value.data || null);
      if (payRes.status === 'fulfilled') setPayments(safeArray(payRes.value.data));
      if (notifRes.status === 'fulfilled') setNotifications(safeArray(notifRes.value.data));
      if (marketRes.status === 'fulfilled') {
        const feed = safeArray(marketRes.value.data);
        setMarketMedia(feed.filter((item) => item.media_url).slice(0, 8));
      }

      if (results.find((result, i) => i < 3 && result.status === 'rejected')) {
        const failed = results
          .slice(0, 3)
          .map((r, i) => (r.status === 'rejected' ? ['me', 'payments', 'notifications'][i] : null))
          .filter(Boolean);
        setError(`Failed to load: ${failed.join(', ')}. Please check your connection or login again.`);
        console.error('Tenant dashboard load partial failure:', results);
      }

      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    const container = heroMediaRef.current;
    if (!container || marketMedia.length < 2) return;

    const computeStep = () => {
      const firstCard = container.querySelector('.rf-hero-media-card');
      if (!firstCard) return 0;
      const cardWidth = firstCard.getBoundingClientRect().width;
      const styles = window.getComputedStyle(container);
      const gapRaw = styles.getPropertyValue('gap') || styles.getPropertyValue('column-gap') || '0px';
      const gap = Number.parseFloat(gapRaw) || 0;
      return cardWidth + gap;
    };

    let step = computeStep();
    const onResize = () => {
      step = computeStep();
    };
    const updateActiveIndex = () => {
      if (!step) step = computeStep();
      if (!step) return;
      const nextIndex = Math.round(container.scrollLeft / step);
      setActiveMediaIndex(Math.max(0, Math.min(marketMedia.length - 1, nextIndex)));
    };
    window.addEventListener('resize', onResize);
    container.addEventListener('scroll', updateActiveIndex, { passive: true });

    const timer = window.setInterval(() => {
      if (heroPausedRef.current) return;
      if (container.scrollWidth <= container.clientWidth + 2) return;
      if (!step) step = computeStep();
      if (!step) return;

      const nearEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - step * 0.5;
      if (nearEnd) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
        setActiveMediaIndex(0);
      } else {
        container.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 5000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('scroll', updateActiveIndex);
    };
  }, [marketMedia.length]);

  const recentPayments = useMemo(() => payments.slice(0, 6), [payments]);
  const recentNotifications = useMemo(() => notifications.slice(0, 6), [notifications]);
  const completedPayments = payments.filter((payment) => String(payment.status || '').toLowerCase() === 'completed' || String(payment.status || '').toLowerCase() === 'success').length;

  const openPayModal = async () => {
    try {
      const res = await axios.get('/payment-methods');
      setPaymentMethods(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedMethodId(res.data[0].id);
      }
      setShowPayModal(true);
    } catch (err) {
      alert('Could not load landlord payment instructions');
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setSubmittingPayment(true);
    try {
      await axios.post('/payments/direct', { ...payFormData, payment_method_id: selectedMethodId });
      setShowPayModal(false);
      setPayFormData({ amount: '', transaction_id: '' });
      const results = await axios.get('/payments/history');
      setPayments(safeArray(results.data));
      alert('Payment proof submitted for landlord approval!');
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting payment');
    }
    setSubmittingPayment(false);
  };

  const closeMediaModal = () => setSelectedMedia(null);
  const scrollMediaToIndex = (index) => {
    const container = heroMediaRef.current;
    if (!container) return;
    const firstCard = container.querySelector('.rf-hero-media-card');
    if (!firstCard) return;
    const styles = window.getComputedStyle(container);
    const gapRaw = styles.getPropertyValue('gap') || styles.getPropertyValue('column-gap') || '0px';
    const gap = Number.parseFloat(gapRaw) || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    container.scrollTo({ left: step * index, behavior: 'smooth' });
    setActiveMediaIndex(index);
  };
  const handlePrevMedia = () => {
    if (marketMedia.length === 0) return;
    const nextIndex = activeMediaIndex <= 0 ? marketMedia.length - 1 : activeMediaIndex - 1;
    scrollMediaToIndex(nextIndex);
  };
  const handleNextMedia = () => {
    if (marketMedia.length === 0) return;
    const nextIndex = activeMediaIndex >= marketMedia.length - 1 ? 0 : activeMediaIndex + 1;
    scrollMediaToIndex(nextIndex);
  };

  if (!loading && error && !me) {
    return (
      <AppCard className="rf-section-card rf-reveal" style={{ borderColor: '#f8d7da', background: '#fff' }}>
         <h2 style={{ color: '#842029', marginTop: 0 }}>Dashboard Error</h2>
         <p style={{ color: '#842029' }}>{error}</p>
         <button className="rf-btn rf-btn-primary" onClick={() => window.location.reload()}>Refresh Page</button>
      </AppCard>
    );
  }

  return (
    <>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Tenant</p>
            <h1 className="rf-page-title">Tenant Portal</h1>
            <p className="rf-page-subtitle">
              {me?.tenant_property_name ? `Property: ${me.tenant_property_name}` : 'Welcome to your portal.'}
              {me?.tenant_unit_number ? ` • Unit: ${me.tenant_unit_number}` : ''}
            </p>
          </div>
          <div className="rf-page-hero-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="rf-neo-live-badge">
              <span className="rf-status-dot" aria-hidden="true" />
              <span>Active</span>
            </div>
            <button className="rf-btn rf-btn-primary" onClick={openPayModal}>Pay Rent</button>
          </div>
        </section>

        <AppModal open={showPayModal} title="Pay Rent" onClose={() => setShowPayModal(false)} width="500px">
          {paymentMethods.length === 0 ? (
            <div className="rf-empty">Your landlord has not added any payment methods yet. Please contact them directly.</div>
          ) : (
            <form onSubmit={handlePaySubmit} className="rf-grid">
              <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 16 }}>
                Please transfer your rent using one of the methods below, then enter your transaction tracking number to verify payment.
              </p>
              
              <select
                value={selectedMethodId}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                required
              >
                {paymentMethods.map(m => (
                  <option key={m.id} value={m.id}>{m.provider_name} - {m.account_name}</option>
                ))}
              </select>

              {paymentMethods.filter(m => String(m.id) === String(selectedMethodId)).map(active => (
                <div key={active.id} style={{ background: '#f3f4f6', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>Pay to:</div>
                  <div style={{ fontSize: 18, fontFamily: 'monospace', color: '#10b981', margin: '4px 0' }}>{active.account_number}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Account Name: {active.account_name}</div>
                  {active.instructions && <div style={{ fontSize: 13, marginTop: 8, fontStyle: 'italic' }}>Note: {active.instructions}</div>}
                </div>
              ))}

              <input
                type="number"
                placeholder="Amount Paid (TZS)"
                value={payFormData.amount}
                onChange={(e) => setPayFormData((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Transaction Ref Number (e.g. AB12CD34E)"
                value={payFormData.transaction_id}
                onChange={(e) => setPayFormData((prev) => ({ ...prev, transaction_id: e.target.value }))}
                required
              />

              <div className="rf-form-actions">
                <button type="button" className="rf-btn" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="rf-btn rf-btn-primary" disabled={submittingPayment}>
                  {submittingPayment ? 'Submitting...' : 'Submit Verification'}
                </button>
              </div>
            </form>
          )}
        </AppModal>

        {error ? <div className="rf-empty rf-empty-danger" style={{ marginBottom: 12 }}>{error}</div> : null}

        {loading ? (
          <AppCard className="rf-empty-card">Loading your tenant dashboard...</AppCard>
        ) : (
          <>
            <section className="rf-neo-panel" style={{ marginBottom: 24, borderRadius: 18, overflow: 'hidden' }}>
              <div className="rf-neo-panel-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, color: '#fff' }}>Featured Media & Ads</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Browse property listings and marketplace highlights.</p>
                  </div>
                  {marketMedia.length > 1 ? (
                    <div className="rf-neo-media-controls">
                      <button className="rf-neo-media-btn" type="button" onClick={handlePrevMedia} aria-label="Previous media">
                        ‹
                      </button>
                      <button className="rf-neo-media-btn" type="button" onClick={handleNextMedia} aria-label="Next media">
                        ›
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div
                className="rf-hero-media"
                ref={heroMediaRef}
                style={{ padding: '20px' }}
                onMouseEnter={() => {
                  heroPausedRef.current = true;
                }}
                onMouseLeave={() => {
                  heroPausedRef.current = false;
                }}
              >
                {marketMedia.length === 0 ? (
                  <div className="rf-hero-media-empty">No marketplace media available right now.</div>
                ) : (
                  marketMedia.map((item) => (
                    <article
                      key={`hero-media-${item.id}`}
                      className="rf-hero-media-card"
                      onClick={() => setSelectedMedia(item)}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                    >
                      {item.media_type === 'video' ? (
                        <video muted playsInline autoPlay loop preload="metadata">
                          <source src={item.media_url} />
                        </video>
                      ) : (
                        <img src={item.media_url} alt={item.title || 'Listing media'} />
                      )}
                      <div className="rf-hero-media-caption">
                        <strong>{item.title || 'Property Listing'}</strong>
                        <span>{item.category || 'listing'} • {Number(item.price_tzs || 0).toLocaleString()} TZS</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
              {marketMedia.length > 1 ? (
                <div className="rf-neo-media-dots" style={{ paddingBottom: '16px' }}>
                  {marketMedia.map((item, index) => (
                    <button
                      key={`media-dot-${item.id}`}
                      type="button"
                      className={`rf-neo-media-dot ${index === activeMediaIndex ? 'active' : ''}`}
                      onClick={() => scrollMediaToIndex(index)}
                    />
                  ))}
                </div>
              ) : null}
            </section>

            <div className="rf-stats-grid">
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Payment Records</div>
                <div className="rf-stat-value">{payments.length}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Completed Payments</div>
                <div className="rf-stat-value rf-stat-green">{completedPayments}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Unread Updates</div>
                <div className="rf-stat-value rf-stat-cyan">
                  {notifications.filter((item) => !item.is_read).length}
                </div>
              </AppCard>
            </div>

            <div className="rf-grid cols-2">
              <AppCard className="rf-section-card">
                <div className="rf-section-head">
                  <div>
                    <h3>Recent Payments</h3>
                    <p>Your latest transactions.</p>
                  </div>
                </div>
                {recentPayments.length === 0 ? (
                  <div className="rf-empty">No payment history found.</div>
                ) : (
                  <div className="rf-stack-list">
                    {recentPayments.map((payment) => (
                      <div key={payment.id} className="rf-list-row">
                        <div className="rf-list-title">{payment.property_name || 'Property'}</div>
                        <div className="rf-list-meta">Amount: {Number(payment.amount || 0).toLocaleString()} TZS</div>
                        <div className="rf-inline-actions" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                          <span className={`rf-status-badge ${String(payment.status || '').toLowerCase() === 'completed' ? 'success' : 'warning'}`}>
                            {payment.status || 'pending'}
                          </span>
                          <small className="rf-list-meta">
                            {payment.created_at ? new Date(payment.created_at).toLocaleString() : ''}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AppCard>

              <AppCard className="rf-section-card">
                <div className="rf-section-head">
                  <div>
                    <h3>Updates</h3>
                    <p>Notifications from your landlord.</p>
                  </div>
                </div>
                {recentNotifications.length === 0 ? (
                  <div className="rf-empty">No updates yet.</div>
                ) : (
                  <div className="rf-stack-list">
                    {recentNotifications.map((notification) => (
                      <div key={notification.id} className="rf-list-row">
                        <div className="rf-list-title">{notification.title || 'Update'}</div>
                        <div className="rf-list-meta" style={{ marginTop: 6 }}>{notification.message || ''}</div>
                        <small className="rf-list-meta">
                          {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}
                        </small>
                      </div>
                    ))}
                  </div>
                )}
              </AppCard>
            </div>

            <div style={{ marginTop: 24 }}>
              <AppCard className="rf-section-card">
                <div className="rf-section-head">
                  <div>
                    <h3>Contact Us</h3>
                    <p>Get in touch with your landlord directly via WhatsApp.</p>
                  </div>
                </div>
                {me?.landlord_whatsapp ? (
                  <div style={{ marginTop: 14 }}>
                    <a 
                      href={`https://wa.me/${String(me.landlord_whatsapp).replace(/[^0-9]/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#25D366', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
                    >
                      <span style={{ fontSize: 20 }}>💬</span> Chat on WhatsApp
                    </a>
                  </div>
                ) : (
                  <div className="rf-empty">Your landlord has not registered a WhatsApp contact number yet.</div>
                )}
              </AppCard>
            </div>
          </>
        )}

      {selectedMedia ? (
        <div className="rf-media-modal-backdrop" onClick={closeMediaModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div className="rf-media-modal" onClick={(e) => e.stopPropagation()} style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, width: '100%', maxWidth: 600, padding: 24, position: 'relative' }}>
            <button 
              className="rf-media-close" 
              onClick={closeMediaModal}
              style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 0, color: '#fff', padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}
            >
              Close
            </button>

            <h2 style={{ marginTop: 0, marginBottom: 8, color: '#fff' }}>{selectedMedia.title || 'Listing Details'}</h2>
            <p style={{ marginTop: 0, color: '#9ca3af' }}>{selectedMedia.location || 'Tanzania'}</p>

            {selectedMedia.media_type === 'video' ? (
              <video controls style={{ width: '100%', borderRadius: 12, maxHeight: 420 }}>
                <source src={selectedMedia.media_url} />
              </video>
            ) : (
              <img
                src={selectedMedia.media_url}
                alt={selectedMedia.title || 'Listing media'}
                style={{ width: '100%', borderRadius: 12, maxHeight: 420, objectFit: 'cover' }}
              />
            )}

            <div style={{ marginTop: 20, color: '#d1d5db' }}>
              <p style={{ margin: '8px 0' }}><strong>Category:</strong> {selectedMedia.category || '-'}</p>
              <p style={{ margin: '8px 0' }}><strong>Type:</strong> {selectedMedia.listing_type || '-'}</p>
              <p style={{ margin: '8px 0' }}><strong>Price:</strong> {Number(selectedMedia.price_tzs || 0).toLocaleString()} TZS</p>
              <p style={{ margin: '8px 0' }}><strong>Description:</strong> {selectedMedia.description || 'No description provided.'}</p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <a
                className="rf-btn rf-btn-primary"
                href={selectedMedia.media_url}
                download={`${(selectedMedia.title || 'listing-media').replace(/\s+/g, '-').toLowerCase()}`}
              >
                Download
              </a>
              <a className="rf-btn" href={selectedMedia.media_url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}


