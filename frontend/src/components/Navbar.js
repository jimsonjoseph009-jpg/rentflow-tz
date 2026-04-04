import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import axios from '../utils/axiosConfig';
import '../styles/stream-layout.css';

const landlordNavLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'Messages', path: '/messages', icon: '💬' },
  { label: 'Properties', path: '/properties', icon: '🏠' },
  { label: 'Units', path: '/units', icon: '🏢' },
  { label: 'Tenants', path: '/tenants', icon: '👥' },
  { label: 'Payments', path: '/payments', icon: '💰' },
  { label: 'Marketplace', path: '/marketplace', icon: '🛒' },
  { label: 'Team Management', path: '/team-management', icon: '👨‍💼' },
  { label: 'Payment History', path: '/payment-history', icon: '🧾' },
  { label: 'Billing', path: '/billing', icon: '🧮' },
  { label: 'Notifications', path: '/notifications', icon: '🔔' },
  { label: 'AI Copilot', path: '/copilot', icon: '🧠' },
  { label: 'Workflows', path: '/workflows', icon: '⚙️' },
  { label: 'Timeline', path: '/timeline', icon: '🕒' },
  { label: 'Command Center', path: '/command-center', icon: '🎛️' },
  { label: 'Collections', path: '/collections-center', icon: '💼' },
  { label: 'Analytics', path: '/analytics', icon: '📈' },
  { label: 'Financial', path: '/financial', icon: '💸' },
  { label: 'Maintenance', path: '/maintenance', icon: '🔧' },
  { label: 'Media', path: '/media', icon: '📸' },
  { label: 'Email', path: '/email', icon: '📧' },
  { label: 'Profile', path: '/profile', icon: '👤' },
  { label: 'Tenant Rating', path: '/tenant-rating', icon: '⭐' },
  { label: 'Payment Alerts', path: '/payment-alerts', icon: '🚨' },
  { label: 'Occupancy', path: '/occupancy', icon: '📅' },
  { label: 'Utilities', path: '/utility-meters', icon: '⚡' },
  { label: 'Inventory', path: '/maintenance-inventory', icon: '📦' },
  { label: 'Visitors', path: '/visitor-log', icon: '🚪' },
  { label: 'Tax Deductions', path: '/tax-deductions', icon: '🧾' },
  { label: 'QR Inspections', path: '/qr-inspections', icon: '📱' },
  { label: 'Voice Notes', path: '/voice-notes', icon: '🎙️' },
  { label: 'Emergency', path: '/emergency-contacts', icon: '🆘' },
  { label: 'Landlord Network', path: '/landlord-network', icon: '🤝' },
  { label: 'Pet Policy', path: '/pet-policy', icon: '🐾' },
  { label: 'Vehicles', path: '/vehicle-management', icon: '🚗' },
  { label: 'Insurance', path: '/insurance-warranty', icon: '📋' },
  { label: 'Disputes', path: '/dispute-log', icon: '⚖️' },
  { label: 'Admin Monetization', path: '/admin-monetization', icon: '🛡️' },
];

const tenantNavLinks = [
  { label: 'Home', path: '/tenant', icon: '🏁' },
  { label: 'Messages', path: '/messages', icon: '💬' },
  { label: 'Payment History', path: '/payment-history', icon: '🧾' },
  { label: 'Notifications', path: '/notifications', icon: '🔔' },
  { label: 'Maintenance', path: '/maintenance', icon: '🔧' },
  { label: 'Visitors', path: '/visitor-log', icon: '🚪' },
  { label: 'Emergency', path: '/emergency-contacts', icon: '🆘' },
  { label: 'Profile', path: '/profile', icon: '👤' },
];

const getStoredRole = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw)?.role || null;
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, isSwahili } = useLanguage();
  const [showModules, setShowModules] = useState(false);
  const [query, setQuery] = useState('');
  const [brandOk, setBrandOk] = useState(true);

  const loggedIn = Boolean(getStoredUser());
  const role = getStoredRole();
  const user = getStoredUser();
  const navLinks = (role === 'tenant' ? tenantNavLinks : landlordNavLinks).filter(link => {
    if (link.path === '/admin-monetization') return role === 'admin';
    return true;
  });
  const quickLinks = navLinks.slice(0, 8);
  const displayName =
    user?.full_name ||
    user?.name ||
    user?.first_name ||
    (role === 'tenant' ? 'Tenant' : 'Landlord');
  const initials = String(displayName)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'RF';

  const filteredLinks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return navLinks;
    return navLinks.filter((item) => item.label.toLowerCase().includes(keyword));
  }, [query, navLinks]);

  useEffect(() => {
    if (!loggedIn) return;
    if (query.trim().length > 0 && !showModules) {
      setShowModules(true);
    }
  }, [query, loggedIn, showModules]);

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch {}
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Clear legacy token if any
    navigate('/login', { replace: true });
  };

  return (
    <header className="rf-navbar">
      <div className="rf-navbar-row">
        <Link className="rf-brand" to={role === 'tenant' ? '/tenant' : '/dashboard'} aria-label="RentFlow-TZ Home">
          <span className="rf-brand-badge">
            <img
              src={brandOk ? '/rentflowtz-mark.svg' : '/logo192.png'}
              alt="RentFlow-TZ"
              className={`rf-brand-logo ${brandOk ? 'rf-brand-mark' : ''}`.trim()}
              onError={() => setBrandOk(false)}
            />
          </span>
          <span className="rf-brand-copy">
            <span className="rf-marquee-container">
              <strong className="rf-marquee-text">RentFlow TZ</strong>
            </span>
            <small>{role === 'tenant' ? 'Tenant Portal' : 'Portfolio Command'}</small>
          </span>
        </Link>

        {loggedIn ? (
          <div className="rf-navbar-tools">
            <input
              className="rf-search rf-hide-mobile"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setQuery('');
                  setShowModules(false);
                  return;
                }

                if (e.key === 'Enter') {
                  const first = filteredLinks[0];
                  if (first?.path) {
                    navigate(first.path);
                    setShowModules(false);
                    setQuery('');
                  }
                }
              }}
              placeholder={isSwahili ? 'Tafuta module...' : 'Search modules...'}
            />

            <div className="rf-navbar-actions">
              <button className="rf-btn rf-btn-icon" onClick={() => setShowModules((prev) => !prev)} aria-label="Toggle menu">
                <span aria-hidden="true">{showModules ? '✕' : '☰'}</span>
              </button>

              <select
                className="rf-btn rf-btn-select rf-hide-mobile"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                title={isSwahili ? 'Badili Lugha' : 'Change Language'}
              >
                <option value="en">EN</option>
                <option value="sw">SW</option>
              </select>

              <div className="rf-user-pill rf-hide-mobile" title={displayName}>
                <span className="rf-user-avatar" aria-hidden="true">{initials}</span>
                <span className="rf-user-meta">
                  <strong>{displayName}</strong>
                  <small>{role === 'tenant' ? 'Tenant' : 'Landlord'}</small>
                </span>
              </div>

              <button className="rf-btn rf-btn-danger rf-hide-mobile" onClick={logout}>
                {isSwahili ? 'Toka' : 'Logout'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rf-navbar-actions">
            <Link className="rf-btn" to="/login">{isSwahili ? 'Ingia' : 'Login'}</Link>
            <Link className="rf-btn rf-btn-primary" to="/register">{isSwahili ? 'Jisajili' : 'Register'}</Link>
          </div>
        )}
      </div>

      {loggedIn ? (
        <>
          <div className="rf-links-row rf-hide-mobile">
            {quickLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rf-link-chip ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="rf-link-chip-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Command Center Quick-Links for Mobile */}
          <div className="rf-mobile-grid-nav rf-show-mobile">
            {quickLinks.map((item) => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`rf-mobile-grid-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <div className="rf-mobile-grid-icon">{item.icon}</div>
                <span className="rf-mobile-grid-label">{item.label}</span>
              </Link>
            ))}
          </div>

          {showModules ? (
            <div className="rf-module-panel rf-reveal">
              <div className="rf-mobile-drawer-header rf-show-mobile">
                <div className="rf-user-pill compact">
                  <span className="rf-user-avatar">{initials}</span>
                  <div className="rf-user-meta">
                    <strong>{displayName}</strong>
                    <small>{role === 'tenant' ? 'Tenant' : 'Landlord'}</small>
                  </div>
                </div>
                
                <div className="rf-drawer-actions">
                  <select
                    className="rf-btn rf-btn-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="sw">Kiswahili</option>
                  </select>
                  <button className="rf-btn rf-btn-danger" onClick={logout}>
                    {isSwahili ? 'Toka' : 'Logout'}
                  </button>
                </div>

                <input
                  className="rf-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isSwahili ? 'Tafuta...' : 'Search...'}
                />
              </div>

              <div className="rf-module-grid">
                {filteredLinks.map((item) => (
                  <Link key={item.path} to={item.path} className="rf-module-link" onClick={() => setShowModules(false)}>
                    {item.icon} {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </header>

  );
}
