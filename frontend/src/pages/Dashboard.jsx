import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import '../styles/stream-layout.css';

const safeArray = (value) => (Array.isArray(value) ? value : []);

const formatNumber = (value) => Number(value || 0).toLocaleString();
const formatCurrency = (value) => `${formatNumber(value)} TZS`;
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [whatsAppSaving, setWhatsAppSaving] = useState(false);
  const [stats, setStats] = useState({});
  const [insights, setInsights] = useState({ summary: {}, alerts: [] });
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [marketMedia, setMarketMedia] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const heroMediaRef = useRef(null);
  const heroPausedRef = useRef(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      const requests = await Promise.allSettled([
        API.get('/dashboard'),
        API.get('/insights/command-center'),
        API.get('/properties'),
        API.get('/tenants'),
        API.get('/payments'),
        API.get('/notifications?limit=20'),
        API.get('/marketplace/public'),
        API.get('/auth/me'),
      ]);

      const [statsRes, insightsRes, propertiesRes, tenantsRes, paymentsRes, notificationsRes, marketRes, meRes] = requests;

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
      if (meRes?.status === 'fulfilled') setMe(meRes.value.data || null);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value.data || { summary: {}, alerts: [] });
      if (propertiesRes.status === 'fulfilled') setProperties(safeArray(propertiesRes.value.data));
      if (tenantsRes.status === 'fulfilled') setTenants(safeArray(tenantsRes.value.data));
      if (paymentsRes.status === 'fulfilled') setPayments(safeArray(paymentsRes.value.data));
      if (notificationsRes.status === 'fulfilled') setNotifications(safeArray(notificationsRes.value.data));
      if (marketRes.status === 'fulfilled') {
        const feed = safeArray(marketRes.value.data);
        setMarketMedia(feed.filter((item) => item.media_url).slice(0, 8));
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const container = heroMediaRef.current;
    if (!container || marketMedia.length < 2) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

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

  const summary = insights?.summary || {};
  const occupiedUnits = Number(stats.occupied_units || 0);
  const vacantUnits = Number(stats.vacant_units || 0);
  const totalUnits = Math.max(Number(stats.total_units || 0), occupiedUnits + vacantUnits, 1);
  const totalProperties = Number(stats.total_properties || properties.length || 0);
  const monthlyIncome = Number(stats.monthly_income || 0);
  const overdueBalance = Number(summary.collection_gap || 0);
  const occupancyRate = Number(summary.occupancy_rate || 0);
  const collectionRate = Number(summary.collection_rate || 0);

  const kpis = [
    {
      title: 'Monthly Rent Collected',
      value: formatCurrency(monthlyIncome),
      delta: collectionRate >= 75 ? 'Collections stable' : 'Needs follow-up',
      tone: 'teal',
    },
    {
      title: 'Active Tenants',
      value: formatNumber(tenants.length),
      delta: `${formatNumber(summary.at_risk_tenants || 0)} at risk`,
      tone: 'cyan',
    },
    {
      title: 'Occupancy Rate',
      value: formatPercent(occupancyRate),
      delta: `${formatNumber(vacantUnits)} vacant units`,
      tone: 'green',
    },
    {
      title: 'Overdue Balance',
      value: formatCurrency(overdueBalance),
      delta: `${formatPercent(collectionRate)} collection rate`,
      tone: 'amber',
    },
  ];

  const paymentMethodStats = useMemo(() => {
    const counts = payments.reduce((acc, payment) => {
      const label = payment.payment_method || 'Other';
      acc[label] = (acc[label] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});

    const entries = Object.entries(counts)
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    if (entries.length > 0) return entries;

    return [
      { label: 'Mobile Money', amount: 48 },
      { label: 'Bank', amount: 32 },
      { label: 'Cash', amount: 18 },
      { label: 'Other', amount: 8 },
    ];
  }, [payments]);

  const occupancySegments = useMemo(() => {
    const occupied = Math.max(occupiedUnits, 0);
    const vacant = Math.max(vacantUnits, 0);
    const reserved = Math.max(totalUnits - occupied - vacant, 0);
    const resolvedTotal = occupied + vacant + reserved || 1;

    return [
      { label: 'Occupied', value: occupied, color: '#78f3e1', pct: Math.round((occupied / resolvedTotal) * 100) },
      { label: 'Vacant', value: vacant, color: '#ffcf70', pct: Math.round((vacant / resolvedTotal) * 100) },
      { label: 'Reserved', value: reserved, color: '#7ca5ff', pct: Math.round((reserved / resolvedTotal) * 100) },
    ].filter((item) => item.value > 0);
  }, [occupiedUnits, vacantUnits, totalUnits]);

  const propertyBars = useMemo(() => {
    const list = properties.slice(0, 5).map((property) => ({
      label: property.name,
      value: Number(property.units || 0),
      sublabel: property.address || property.location || 'Tanzania',
    }));

    if (list.length > 0) return list;

    return [
      { label: 'Mikocheni Heights', value: 12, sublabel: 'Dar es Salaam' },
      { label: 'Arusha Villas', value: 9, sublabel: 'Arusha' },
      { label: 'Mwanza Court', value: 7, sublabel: 'Mwanza' },
    ];
  }, [properties]);

  const maxPropertyUnits = Math.max(...propertyBars.map((item) => item.value), 1);

  const trendPoints = useMemo(() => {
    const recent = payments.slice(0, 6).reverse();
    const points = recent.map((payment, index) => ({
      label: payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : `P${index + 1}`,
      value: Number(payment.amount || 0),
    }));

    if (points.length > 1) return points;

    return [
      { label: 'Jan', value: 18 },
      { label: 'Feb', value: 26 },
      { label: 'Mar', value: 34 },
      { label: 'Apr', value: 31 },
      { label: 'May', value: 42 },
      { label: 'Jun', value: 51 },
    ];
  }, [payments]);

  const maxTrend = Math.max(...trendPoints.map((item) => item.value), 1);
  const trendPath = trendPoints
    .map((point, index) => {
      const x = trendPoints.length === 1 ? 50 : (index / (trendPoints.length - 1)) * 100;
      const y = 100 - (point.value / maxTrend) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

  const criticalAlerts = useMemo(() => {
    const insightAlerts = safeArray(insights?.alerts).map((item) => ({
      title: item.title || 'Portfolio Alert',
      message: item.message || 'Review this item.',
      date: insights?.generated_at,
      status: 'Alert',
    }));

    const paymentAlerts = notifications
      .filter((item) => {
        const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();
        return text.includes('payment') || text.includes('overdue') || text.includes('reminder') || text.includes('rent');
      })
      .map((item) => ({
        title: item.title || 'Payment Notice',
        message: item.message || 'Check latest payment activity.',
        date: item.created_at,
        status: 'Live',
      }));

    return [...insightAlerts, ...paymentAlerts].slice(0, 5);
  }, [insights, notifications]);

  const activityRows = useMemo(() => {
    const paymentRows = payments.slice(0, 5).map((payment, index) => ({
      id: payment.id || `PAY-${index + 1}`,
      title: payment.tenant_name || 'Tenant Payment',
      channel: payment.payment_method || 'Manual',
      amount: formatCurrency(payment.amount || 0),
      status: payment.status || 'pending',
      updated: payment.payment_date
        ? new Date(payment.payment_date).toLocaleString()
        : 'Just now',
    }));

    if (paymentRows.length > 0) return paymentRows;

    return criticalAlerts.map((alert, index) => ({
      id: `ALT-${index + 1}`,
      title: alert.title,
      channel: 'Alert',
      amount: '-',
      status: alert.status,
      updated: alert.date ? new Date(alert.date).toLocaleString() : 'Live',
    }));
  }, [payments, criticalAlerts]);

  const sideLinks = [
    { label: 'Dashboard', to: '/dashboard', icon: '⌘' },
    { label: 'Properties', to: '/properties', icon: '▣' },
    { label: 'Tenants', to: '/tenants', icon: '◉' },
    { label: 'Payments', to: '/payments', icon: '◌' },
    { label: 'Analytics', to: '/analytics', icon: '△' },
    { label: 'Collections', to: '/collections-center', icon: '◈' },
    { label: 'Settings', to: '/profile', icon: '⚙' },
  ];

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

  return (
    <div className="rf-shell rf-shell-neo">
      <Navbar />
      <main className="rf-content rf-neo-page">
        <section className="rf-neo-dashboard rf-reveal" style={{ '--delay': '0ms' }}>
          <aside className="rf-neo-sidebar">
            <div className="rf-neo-sidebar-brand">
              <span className="rf-neo-brand-mark">RF</span>
              <div>
                <strong>RentFlow TZ</strong>
                <p>Portfolio OS</p>
              </div>
            </div>

            <nav className="rf-neo-nav" aria-label="Dashboard shortcuts">
              {sideLinks.map((item) => (
                <Link key={item.to} className={`rf-neo-nav-link ${item.to === '/dashboard' ? 'active' : ''}`} to={item.to}>
                  <span className="rf-neo-nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="rf-neo-sidebar-footer">
              <p>Portfolio</p>
              <strong>{formatNumber(totalProperties)} properties</strong>
              <span>{formatNumber(totalUnits)} total units</span>
            </div>
          </aside>

          <section className="rf-neo-main">
            <header className="rf-neo-topbar">
              <div>
                <p className="rf-neo-eyebrow">Landlord dashboard</p>
                <h1>KPI Command Center</h1>
                <span>
                  Monitor rent collection, occupancy, tenant risk, and property performance from one place.
                </span>
              </div>

              <div className="rf-neo-top-actions">
                <div className="rf-neo-live-badge">
                  <span className="rf-status-dot" aria-hidden="true" />
                  <span>Live Sync</span>
                </div>
                <Link className="rf-neo-cta" to="/properties">Add Property</Link>
              </div>
            </header>

            {loading ? (
              <div className="rf-empty rf-empty-neo">Loading dashboard metrics...</div>
            ) : (
              <>
                <section className="rf-neo-panel" style={{ marginBottom: 16 }}>
                  <div className="rf-neo-panel-head">
                    <div>
                      <h3>Featured Media & Ads</h3>
                      <p>Auto-scrolling marketplace highlights from your public listings feed.</p>
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
                  <div
                    className="rf-hero-media"
                    ref={heroMediaRef}
                    onMouseEnter={() => {
                      heroPausedRef.current = true;
                    }}
                    onMouseLeave={() => {
                      heroPausedRef.current = false;
                    }}
                    onFocusCapture={() => {
                      heroPausedRef.current = true;
                    }}
                    onBlurCapture={() => {
                      heroPausedRef.current = false;
                    }}
                  >
                    {marketMedia.length === 0 ? (
                      <div className="rf-hero-media-empty">No ad/property media yet. Add listings in Marketplace.</div>
                    ) : (
                      marketMedia.map((item) => (
                        <article
                          key={`hero-media-${item.id}`}
                          className="rf-hero-media-card"
                          onClick={() => setSelectedMedia(item)}
                          style={{ cursor: 'pointer' }}
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
                    <div className="rf-neo-media-dots" aria-label="Media position">
                      {marketMedia.map((item, index) => (
                        <button
                          key={`media-dot-${item.id}`}
                          type="button"
                          className={`rf-neo-media-dot ${index === activeMediaIndex ? 'active' : ''}`}
                          onClick={() => scrollMediaToIndex(index)}
                          aria-label={`Go to media ${index + 1}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="rf-neo-kpi-grid">
                  {kpis.map((item) => (
                    <article key={item.title} className={`rf-neo-kpi-card rf-neo-kpi-${item.tone}`}>
                      <p>{item.title}</p>
                      <h2>{item.value}</h2>
                      <span>{item.delta}</span>
                    </article>
                  ))}
                </section>

                <section className="rf-neo-analytics-grid">
                  <article className="rf-neo-panel">
                    <div className="rf-neo-panel-head">
                      <div>
                        <h3>Units by Property</h3>
                        <p>Top listings in your portfolio</p>
                      </div>
                    </div>
                    <div className="rf-neo-bars">
                      {propertyBars.map((item) => (
                        <div key={item.label} className="rf-neo-bar-row">
                          <div className="rf-neo-bar-label">
                            <strong>{item.label}</strong>
                            <span>{item.sublabel}</span>
                          </div>
                          <div className="rf-neo-bar-track">
                            <div
                              className="rf-neo-bar-fill"
                              style={{ width: `${Math.max((item.value / maxPropertyUnits) * 100, 8)}%` }}
                            />
                          </div>
                          <strong className="rf-neo-bar-value">{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rf-neo-panel">
                    <div className="rf-neo-panel-head">
                      <div>
                        <h3>Collections Trend</h3>
                        <p>Recent payment movement</p>
                      </div>
                    </div>
                    <div className="rf-neo-line-chart">
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        <path className="rf-neo-line-glow" d={trendPath} pathLength="100" />
                        <path className="rf-neo-line-core" d={trendPath} pathLength="100" />
                      </svg>
                      <div className="rf-neo-line-labels">
                        {trendPoints.map((point) => (
                          <span key={point.label}>{point.label}</span>
                        ))}
                      </div>
                    </div>
                  </article>

                  <article className="rf-neo-panel">
                    <div className="rf-neo-panel-head">
                      <div>
                        <h3>Occupancy Mix</h3>
                        <p>Live unit distribution</p>
                      </div>
                    </div>
                    <div className="rf-neo-donut-wrap">
                      <div
                        className="rf-neo-donut"
                        style={{
                          background: occupancySegments.length
                            ? `conic-gradient(${occupancySegments
                                .map((segment, index) => {
                                  const start = occupancySegments.slice(0, index).reduce((sum, item) => sum + item.pct, 0);
                                  const end = start + segment.pct;
                                  return `${segment.color} ${start}% ${end}%`;
                                })
                                .join(', ')})`
                            : 'conic-gradient(#78f3e1 0% 100%)',
                        }}
                      >
                        <div className="rf-neo-donut-center">
                          <strong>{formatPercent(occupancyRate)}</strong>
                          <span>occupied</span>
                        </div>
                      </div>
                      <div className="rf-neo-legend">
                        {occupancySegments.map((segment) => (
                          <div key={segment.label} className="rf-neo-legend-item">
                            <span className="rf-neo-legend-dot" style={{ background: segment.color }} />
                            <div>
                              <strong>{segment.label}</strong>
                              <span>{segment.pct}% • {segment.value} units</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                </section>

                <section className="rf-neo-bottom-grid">
                  <article className="rf-neo-panel">
                    <div className="rf-neo-panel-head">
                      <div>
                        <h3>Payment Channels</h3>
                        <p>Collection source mix</p>
                      </div>
                    </div>
                    <div className="rf-neo-channel-list">
                      {paymentMethodStats.map((item) => {
                        const maxAmount = Math.max(...paymentMethodStats.map((entry) => entry.amount), 1);
                        return (
                          <div key={item.label} className="rf-neo-channel-row">
                            <div className="rf-neo-channel-meta">
                              <strong>{item.label}</strong>
                              <span>{formatCurrency(item.amount)}</span>
                            </div>
                            <div className="rf-neo-channel-track">
                              <div
                                className="rf-neo-channel-fill"
                                style={{ width: `${Math.max((item.amount / maxAmount) * 100, 10)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>

                  <article className="rf-neo-panel">
                    <div className="rf-neo-panel-head">
                      <div>
                        <h3>Priority Alerts</h3>
                        <p>What needs attention now</p>
                      </div>
                    </div>
                    <div className="rf-neo-alert-list">
                      {criticalAlerts.length === 0 ? (
                        <div className="rf-empty rf-empty-neo">No urgent alerts right now.</div>
                      ) : (
                        criticalAlerts.map((alert, index) => (
                          <div key={`${alert.title}-${index}`} className="rf-neo-alert-card">
                            <strong>{alert.title}</strong>
                            <p>{alert.message}</p>
                            <span>{alert.date ? new Date(alert.date).toLocaleString() : 'Live now'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                </section>

                <section className="rf-neo-panel rf-neo-table-panel">
                  <div className="rf-neo-panel-head">
                    <div>
                      <h3>Recent Activity</h3>
                      <p>Latest rent and collection movement</p>
                    </div>
                    <Link className="rf-neo-ghost-link" to="/payments">Open Payments</Link>
                  </div>

                  <div className="rf-neo-table-wrap">
                    <table className="rf-neo-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Activity</th>
                          <th>Channel</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.id}</td>
                            <td>{row.title}</td>
                            <td>{row.channel}</td>
                            <td>{row.amount}</td>
                            <td>
                              <span className={`rf-neo-status rf-neo-status-${String(row.status).toLowerCase()}`}>
                                {row.status}
                              </span>
                            </td>
                            <td>{row.updated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rf-neo-panel" style={{ marginTop: 16 }}>
                  <div className="rf-neo-panel-head">
                    <div>
                      <h3>Contact Us (WhatsApp)</h3>
                      <p>Register your WhatsApp number so tenants can message you directly from their portal.</p>
                    </div>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setWhatsAppSaving(true);
                    const formData = new FormData(e.target);
                    const whatsapp_number = formData.get('whatsapp_number');
                    try {
                      await API.put('/auth/profile', { whatsapp_number });
                      alert('WhatsApp number saved!');
                    } catch (err) {
                      alert('Failed to save WhatsApp number.');
                    } finally {
                      setWhatsAppSaving(false);
                    }
                  }} style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <input 
                      name="whatsapp_number"
                      placeholder="e.g. 255700000000" 
                      defaultValue={me?.whatsapp_number || ''}
                      style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: '#fff', flex: 1, outline: 'none' }}
                      required
                    />
                    <button type="submit" disabled={whatsAppSaving} className="rf-neo-cta" style={{ filter: whatsAppSaving ? 'opacity(0.7)' : 'none' }}>
                      {whatsAppSaving ? 'Saving...' : 'Save WhatsApp'}
                    </button>
                  </form>
                </section>
              </>
            )}
          </section>
        </section>
      </main>

      {selectedMedia ? (
        <div className="rf-media-modal-backdrop" onClick={closeMediaModal}>
          <div className="rf-media-modal" onClick={(e) => e.stopPropagation()}>
            <button className="rf-media-close" onClick={closeMediaModal}>Close</button>

            <h2 style={{ marginTop: 0, marginBottom: 8 }}>{selectedMedia.title || 'Listing Details'}</h2>
            <p style={{ marginTop: 0, color: '#526184' }}>{selectedMedia.location || 'Tanzania'}</p>

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

            <div style={{ marginTop: 12 }}>
              <p style={{ margin: '8px 0' }}><strong>Category:</strong> {selectedMedia.category || '-'}</p>
              <p style={{ margin: '8px 0' }}><strong>Type:</strong> {selectedMedia.listing_type || '-'}</p>
              <p style={{ margin: '8px 0' }}><strong>Price:</strong> {Number(selectedMedia.price_tzs || 0).toLocaleString()} TZS</p>
              <p style={{ margin: '8px 0' }}><strong>Description:</strong> {selectedMedia.description || 'No description provided.'}</p>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              <a
                className="rf-btn rf-btn-primary"
                href={selectedMedia.media_url}
                download={`${(selectedMedia.title || 'listing-media').replace(/\s+/g, '-').toLowerCase()}`}
              >
                Download
              </a>
              <a className="rf-btn" href={selectedMedia.media_url} target="_blank" rel="noreferrer">
                Open in New Tab
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
