import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import '../styles/stream-layout.css';

export default function PublicPay() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [linkInfo, setLinkInfo] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    payment_method: 'mpesa',
    phone: '',
  });

  const formattedAmount = useMemo(() => {
    if (!linkInfo) return '';
    const amount = Number(linkInfo.amount || 0);
    const currency = linkInfo.currency || 'TZS';
    return `${currency} ${amount.toLocaleString()}`;
  }, [linkInfo]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/public/paylinks/${token}`);
        setLinkInfo(res.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load payment link');
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
  }, [token]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const res = await axios.post(`/public/paylinks/${token}/initiate`, form);
      const paymentUrl = res.data?.payment_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }
      setNotice('Payment initiated. Check your phone to confirm the STK push.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to start payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rf-page">
      <main className="rf-page-content narrow" style={{ paddingTop: 34 }}>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Secure Payment</p>
            <h1 className="rf-page-title">Pay Rent</h1>
            <p className="rf-page-subtitle">Lipa kodi salama kupitia Fastlipa. Huhitaji ku-login.</p>
          </div>
          <div className="rf-page-hero-actions">
            <div className="rf-neo-live-badge">
              <span className="rf-status-dot" aria-hidden="true" />
              <span>Secure</span>
            </div>
          </div>
        </section>

        <AppCard className="rf-section-card">
          {loading ? (
            <div className="rf-empty">Loading payment details...</div>
          ) : error ? (
            <div className="rf-empty rf-empty-danger">{error}</div>
          ) : (
            <>
              {notice ? (
                <div className="rf-empty" style={{ marginBottom: 16 }}>
                  {notice}
                </div>
              ) : null}
              <div className="rf-section-head">
                <div>
                  <h3>Invoice</h3>
                  <p>
                    {linkInfo?.property_name ? `Property: ${linkInfo.property_name}` : ''}
                    {linkInfo?.tenant_name ? ` • Tenant: ${linkInfo.tenant_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="rf-list-row" style={{ marginBottom: 14 }}>
                <div className="rf-stat-label">Amount</div>
                <strong className="rf-stat-value" style={{ fontSize: 28 }}>{formattedAmount}</strong>
              </div>

              <form onSubmit={handleSubmit} className="rf-grid" style={{ maxWidth: 520 }}>
                <label className="rf-grid" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Payment method</span>
                  <select name="payment_method" value={form.payment_method} onChange={handleChange} required>
                    <option value="mpesa">M-Pesa</option>
                    <option value="yas">Tigo Pesa / YAS</option>
                    <option value="airtel_money">Airtel Money</option>
                    <option value="halotel">Halotel Money</option>
                    <option value="tigo_pesa">Tigo Pesa</option>
                    <option value="nmb_bank">NMB Bank</option>
                    <option value="crdb_bank">CRDB Bank</option>
                  </select>
                </label>

                <label className="rf-grid" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 700 }}>Phone (optional)</span>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="2557XXXXXXXX" />
                  <small className="rf-list-meta">
                    Ukiweka, itatumika kuanzisha malipo. Ukiiacha, itatumia namba iliyohifadhiwa.
                  </small>
                </label>

                <div className="rf-form-actions">
                  <button className="rf-btn rf-btn-primary" type="submit" disabled={submitting}>
                    {submitting ? 'Starting...' : 'Continue to Pay'}
                  </button>
                </div>
              </form>
            </>
          )}
        </AppCard>
      </main>
    </div>
  );
}
