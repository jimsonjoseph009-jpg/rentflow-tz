import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function BottomNav() {
  const location = useLocation();
  const { isSwahili } = useLanguage();

  const navItems = [
    { label: isSwahili ? 'Mwanzo' : 'Home', path: '/dashboard', icon: '🏠' },
    { label: isSwahili ? 'Mali' : 'Properties', path: '/properties', icon: '🏢' },
    { label: isSwahili ? 'Kodi' : 'Payments', path: '/payments', icon: '💰' },
    { label: isSwahili ? 'Soko' : 'Market', path: '/marketplace', icon: '🛒' },
    { label: isSwahili ? 'Wasifu' : 'Profile', path: '/profile', icon: '👤' }
  ];

  return (
    <nav className="rf-bottom-nav rf-show-mobile">
      {navItems.map((item) => (
        <Link 
          key={item.path} 
          to={item.path} 
          className={`rf-bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
        >
          <span className="rf-bottom-nav-icon">{item.icon}</span>
          <span className="rf-bottom-nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
