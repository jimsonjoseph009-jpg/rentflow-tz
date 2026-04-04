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

export default function BottomNav() {
  const location = useLocation();
  const { isSwahili } = useLanguage();
  const role = getStoredRole();

  const landlordItems = [
    { label: isSwahili ? 'Mwanzo' : 'Home', path: '/dashboard', icon: '📊' },
    { label: isSwahili ? 'Mali' : 'Properties', path: '/properties', icon: '🏠' },
    { label: isSwahili ? 'Kodi' : 'Payments', path: '/payments', icon: '💰' },
    { label: isSwahili ? 'Soko' : 'Market', path: '/marketplace', icon: '🛒' },
    { label: isSwahili ? 'Wasifu' : 'Profile', path: '/profile', icon: '👤' }
  ];

  const tenantItems = [
    { label: isSwahili ? 'Mwanzo' : 'Home', path: '/tenant', icon: '🏁' },
    { label: isSwahili ? 'Ujumbe' : 'Messages', path: '/messages', icon: '💬' },
    { label: isSwahili ? 'Kodi' : 'Payments', path: '/payment-history', icon: '🧾' },
    { label: isSwahili ? 'Wasifu' : 'Profile', path: '/profile', icon: '👤' }
  ];

  const navItems = role === 'tenant' ? tenantItems : landlordItems;

  return (
    <nav className="rf-bottom-nav rf-show-mobile flex">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path} 
          className={`rf-bottom-nav-item flex-1 ${location.pathname === item.path ? 'active' : ''}`}
        >
          <span className="rf-bottom-nav-icon">{item.icon}</span>
          <span className="rf-bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

