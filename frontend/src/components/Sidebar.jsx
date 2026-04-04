import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

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

export default function Sidebar() {
  const location = useLocation();
  const { isSwahili } = useLanguage();
  const role = getStoredRole();
  const user = getStoredUser();

  const landlordLinks = [
    { label: isSwahili ? 'Mwanzo' : 'Dashboard', path: '/dashboard', icon: '⌘' },
    { label: isSwahili ? 'Mali' : 'Properties', path: '/properties', icon: '▣' },
    { label: isSwahili ? 'Wapangaji' : 'Tenants', path: '/tenants', icon: '◉' },
    { label: isSwahili ? 'Kodi' : 'Payments', path: '/payments', icon: '◌' },
    { label: isSwahili ? 'Uchambuzi' : 'Analytics', path: '/analytics', icon: '△' },
    { label: isSwahili ? 'Makusanyo' : 'Collections', path: '/collections-center', icon: '◈' },
    { label: isSwahili ? 'Wasifu' : 'Settings', path: '/profile', icon: '⚙' },
  ];

  const tenantLinks = [
    { label: isSwahili ? 'Mwanzo' : 'Home', path: '/tenant', icon: '🏁' },
    { label: isSwahili ? 'Ujumbe' : 'Messages', path: '/messages', icon: '💬' },
    { label: isSwahili ? 'Historia' : 'History', path: '/payment-history', icon: '🧾' },
    { label: isSwahili ? 'Wasifu' : 'Profile', path: '/profile', icon: '👤' }
  ];

  const navLinks = role === 'tenant' ? tenantLinks : landlordLinks;

  return (
    <aside className="rf-neo-sidebar rf-hide-mobile">
      <div className="rf-neo-sidebar-brand">
        <span className="rf-neo-brand-mark">RF</span>
        <div>
          <strong>RentFlow TZ</strong>
          <p>{role === 'tenant' ? (isSwahili ? 'Lango la Mpangaji' : 'Tenant Portal') : (isSwahili ? 'Usimamizi wa Kazi' : 'Portfolio OS')}</p>
        </div>
      </div>

      <nav className="rf-neo-nav" aria-label="Sidebar navigation">
        {navLinks.map((item) => (
          <Link 
            key={item.path} 
            className={`rf-neo-nav-link ${location.pathname === item.path ? 'active' : ''}`} 
            to={item.path}
          >
            <span className="rf-neo-nav-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="rf-neo-sidebar-footer">
        <p>{isSwahili ? 'Mtumiaji' : 'Logged In'}</p>
        <strong>{user?.full_name || user?.name || (role === 'tenant' ? 'Tenant' : 'Landlord')}</strong>
        <span style={{ textTransform: 'capitalize' }}>{role} Role</span>
      </div>
    </aside>
  );
}
