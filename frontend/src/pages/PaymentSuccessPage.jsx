import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AppCard from '../components/ui/AppCard';
import '../styles/stream-layout.css';

export default function PaymentSuccessPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const paymentId = params.get('paymentId');

  return (
    <div className="rf-page">
      <main className="rf-page-content narrow" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <AppCard className="rf-section-card" style={{ width: '100%', textAlign: 'center' }}>
          <div className="rf-page-eyebrow" style={{ marginBottom: 12 }}>Payment Complete</div>
          <h1 className="rf-page-title" style={{ fontSize: 34, color: '#7ef7a6' }}>Payment Successful</h1>
          <p className="rf-page-subtitle" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Asante. Malipo yamepokelewa na kuthibitishwa.
          </p>
          {paymentId ? <p className="rf-list-meta">Payment ID: {paymentId}</p> : null}
          <div className="rf-inline-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
            <Link className="rf-btn" to="/payment-history">View Payment History</Link>
            <Link className="rf-btn rf-btn-primary" to="/pay-rent">Make Another Payment</Link>
          </div>
        </AppCard>
      </main>
    </div>
  );
}
