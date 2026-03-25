import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import AppCard from '../components/ui/AppCard';
import AppTable from '../components/ui/AppTable';
import '../styles/stream-layout.css';

export default function PaymentHistoryPage() {
  const token = localStorage.getItem('token');
  const backendBase = (process.env.REACT_APP_API_BASE || 'http://localhost:5000').replace(/\/api$/, '');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get('/payments/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPayments(response.data || []);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  return (
    <div className="rf-page">
      <Navbar />
      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Payments</p>
            <h2 className="rf-page-title">Payment History</h2>
            <p className="rf-page-subtitle">Review payment status, methods, and download receipts when available.</p>
          </div>
        </section>

        {loading ? (
          <AppCard className="rf-empty-card">Loading payment history...</AppCard>
        ) : payments.length === 0 ? (
          <AppCard className="rf-empty-card">No payment history yet.</AppCard>
        ) : (
          <AppCard className="rf-table-card">
            <AppTable headers={['Tenant', 'Property', 'Amount', 'Method', 'Transaction', 'Status', 'Receipt']}>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.tenant_name}</td>
                  <td>{payment.property_name}</td>
                  <td>TZS {Number(payment.amount || 0).toLocaleString()}</td>
                  <td>{payment.payment_method}</td>
                  <td>{payment.transaction_id || '-'}</td>
                  <td>
                    <span className={`rf-status-badge ${String(payment.status || '').toLowerCase() === 'completed' ? 'success' : String(payment.status || '').toLowerCase() === 'pending' ? 'warning' : 'danger'}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    {payment.receipt_path ? (
                      <a className="rf-table-link" href={`${backendBase}${payment.receipt_path}`} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </AppTable>
          </AppCard>
        )}
      </div>
    </div>
  );
}
