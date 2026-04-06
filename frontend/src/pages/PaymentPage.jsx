import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';
import '../styles/stream-layout.css';

export default function PaymentPage() {
  const token = localStorage.getItem('token');
  const notify = useNotification();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tenant_id: '',
    amount: '',
    payment_method: 'mpesa',
    phone: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const tenantRes = await axios.get('/tenants', { headers: { Authorization: `Bearer ${token}` } });
        setTenants(tenantRes.data || []);
      } catch (error) {
        console.error('Failed to load payment form data', error);
      }
    };

    loadData();
  }, [token]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/payments/pay', form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const paymentUrl = response.data?.payment_url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      notify.success('Pay Rent', 'Payment initiated. Check your phone to confirm the STK push.');
    } catch (error) {
      notify.error('Pay Rent', error.response?.data?.message || error.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rf-shell">
      <Navbar />
      <main className="rf-content" style={{ maxWidth: 820 }}>
        <h2 style={{ marginBottom: '16px' }}>Pay Rent</h2>
        <p style={{ color: '#666', marginTop: 0 }}>Lipa kodi kupitia Fastlipa (M-Pesa, YAS/Tigo Pesa, Airtel Money, Halotel, NMB, CRDB).</p>

        <form
          onSubmit={handleSubmit}
          style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
        >
          <div style={{ display: 'grid', gap: '12px' }}>
            <select name="tenant_id" value={form.tenant_id} onChange={handleChange} required style={{ padding: '10px' }}>
              <option value="">Select tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name}{tenant.property_name ? ` - ${tenant.property_name}` : ''}
                </option>
              ))}
            </select>

            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="Amount (TZS)"
              min="1"
              step="0.01"
              required
              style={{ padding: '10px' }}
            />

            <select name="payment_method" value={form.payment_method} onChange={handleChange} required style={{ padding: '10px' }}>
              <option value="mpesa">M-Pesa</option>
              <option value="yas">Tigo Pesa / YAS</option>
              <option value="airtel_money">Airtel Money</option>
              <option value="halotel">Halotel Money</option>
              <option value="nmb_bank">NMB Bank</option>
              <option value="crdb_bank">CRDB Bank</option>
            </select>

            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone number (optional, mfano 2557XXXXXXXX)"
              style={{ padding: '10px' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '16px', width: '100%', padding: '12px', border: 'none', borderRadius: '8px', background: '#1f6feb', color: '#fff' }}
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </form>
      </main>
    </div>
  );
}
