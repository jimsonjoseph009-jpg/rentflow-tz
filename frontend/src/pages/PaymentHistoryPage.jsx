import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import { API_BASE } from '../config';
import AppCard from '../components/ui/AppCard';
import AppTable from '../components/ui/AppTable';
import '../styles/stream-layout.css';

export default function PaymentHistoryPage() {
  const token = localStorage.getItem('token');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const downloadReceipt = async (payment) => {
    if (!payment?.receipt_path) return;
    setDownloadingId(payment.id);
    try {
      const url = `${API_BASE}${payment.receipt_path}?download=1`;
      const res = await axios.get(url, { responseType: 'blob' });

      const cd = res.headers?.['content-disposition'] || res.headers?.get?.('content-disposition') || '';
      const match = /filename="?([^"]+)"?/i.exec(String(cd));
      const fallbackName = String(payment.receipt_path).split('/').pop() || `receipt-${payment.id}.pdf`;
      const fileName = match?.[1] || fallbackName;

      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download receipt', error);
      alert(error?.response?.data?.message || 'Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

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
                      <button
                        type="button"
                        className="rf-table-link"
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                        onClick={() => downloadReceipt(payment)}
                        disabled={downloadingId === payment.id}
                      >
                        {downloadingId === payment.id ? 'Downloading…' : 'Download'}
                      </button>
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
