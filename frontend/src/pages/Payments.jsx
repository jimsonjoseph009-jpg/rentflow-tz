import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import '../styles/stream-layout.css';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import AppModal from '../components/ui/AppModal';
import AppTable from '../components/ui/AppTable';
import { useNotification } from '../context/NotificationContext';

export default function Payments() {
  const notify = useNotification();
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    amount: '',
    payment_date: '',
    status: 'completed'
  });

  const token = localStorage.getItem('token');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(res.data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await axios.get('/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(res.data || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPayments();
    fetchTenants();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        tenant_id: payment.tenant_id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        status: payment.status
      });
    } else {
      setEditingPayment(null);
      setFormData({
        tenant_id: '',
        amount: '',
        payment_date: '',
        status: 'completed'
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPayment) {
        await axios.put(`/payments/${editingPayment.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/payments', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchPayments();
      setShowForm(false);
      setEditingPayment(null);
      setFormData({ tenant_id: '', amount: '', payment_date: '', status: 'completed' });
      notify.success('Payments', 'Payment saved successfully.');
    } catch (err) {
      notify.error('Payments', err.response?.data?.message || 'Error saving payment');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPayments();
      notify.success('Payments', 'Payment deleted successfully.');
    } catch (err) {
      notify.error('Payments', err.response?.data?.message || 'Error deleting payment');
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.post(`/payments/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPayments();
      notify.success('Payments', 'Tenant payment approved successfully!');
    } catch (err) {
      notify.error('Payments', err.response?.data?.message || 'Error approving payment');
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const tenant = tenants.find((t) => t.id === payment.tenant_id);
    const matchesSearch =
      (tenant?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(payment.payment_date || '').includes(searchTerm);
    const matchesStatus = !statusFilter || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Collections</p>
            <h2 className="rf-page-title">Payments</h2>
            <p className="rf-page-subtitle">
              Track tenant payments, filter collection status, and keep the ledger aligned with your portfolio.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <button onClick={() => openModal()} className="rf-btn rf-btn-primary">+ Add Payment</button>
          </div>
        </section>

        <div className="rf-stats-grid">
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Total Payments</div>
            <div className="rf-stat-value">{payments.length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Completed</div>
            <div className="rf-stat-value rf-stat-green">{payments.filter((item) => item.status === 'completed').length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Pending</div>
            <div className="rf-stat-value rf-stat-amber">{payments.filter((item) => item.status === 'pending').length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Collected Value</div>
            <div className="rf-stat-value rf-stat-cyan">
              {payments.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString()} TZS
            </div>
          </AppCard>
        </div>

        <AppToolbar className="rf-toolbar-surface">
          <input
            type="text"
            placeholder="Search by tenant name or date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rf-toolbar-input-grow"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <button onClick={() => openModal()} className="rf-btn rf-btn-primary">+ Add Payment</button>
        </AppToolbar>

        {showForm && (
          <AppModal open={showForm} title={editingPayment ? 'Edit Payment' : 'Add Payment'} onClose={() => setShowForm(false)}>
              <form onSubmit={handleSubmit} className="rf-grid">
                <select name="tenant_id" value={formData.tenant_id} onChange={handleChange} required>
                  <option value="">Select Tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  name="amount"
                  placeholder="Amount (TZS)"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  step="0.01"
                />
                <input
                  type="date"
                  name="payment_date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  required
                />
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>

                <div className="rf-form-actions">
                  <button type="button" className="rf-btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="rf-btn rf-btn-primary">{editingPayment ? 'Update' : 'Add'}</button>
                </div>
              </form>
            </AppModal>
        )}

        {loading && <AppCard className="rf-empty-card">Loading payments...</AppCard>}

        {!loading && payments.length === 0 && <AppCard className="rf-empty-card">No payments yet. Click "Add Payment" to get started.</AppCard>}

        {!loading && payments.length > 0 && filteredPayments.length === 0 && (
          <AppCard className="rf-empty-card">No payments match your search or filter.</AppCard>
        )}

        {!loading && filteredPayments.length > 0 && (
          <AppCard className="rf-table-card">
            <AppTable headers={['Tenant', 'Amount (TZS)', 'Date', 'Status', 'Actions']}>
                {filteredPayments.map((payment) => {
                  const tenant = tenants.find((t) => t.id === payment.tenant_id);
                  return (
                    <tr key={payment.id}>
                      <td>{tenant?.full_name || 'Unknown'}</td>
                      <td>{payment.amount?.toLocaleString()}</td>
                      <td>{payment.payment_date}</td>
                      <td>
                        <span className={`rf-status-badge ${payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger'}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td>
                        <div className="rf-table-actions">
                          {payment.status === 'pending' && (
                            <button className="rf-btn rf-btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => handleApprove(payment.id)}>Approve</button>
                          )}
                          <button className="rf-btn" onClick={() => openModal(payment)}>Edit</button>
                          <button className="rf-btn rf-btn-danger" onClick={() => handleDelete(payment.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </AppTable>
          </AppCard>
        )}
    </>
  );
}
