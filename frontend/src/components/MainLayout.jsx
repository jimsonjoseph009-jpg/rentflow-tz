import Navbar from './Navbar';
import BottomNav from './BottomNav';
import '../styles/stream-layout.css';

export default function MainLayout({ children }) {
  return (
    <div className="rf-shell rf-shell-neo">
      <Navbar />
      <main className="rf-content rf-neo-page">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
