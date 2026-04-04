import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import '../styles/stream-layout.css';

export default function MainLayout({ children }) {
  return (
    <div className="rf-shell rf-shell-neo">
      <Navbar />
      <div className="rf-neo-dashboard">
        <Sidebar aria-hidden="true" />
        <main className="rf-content rf-neo-page rf-neo-main">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
