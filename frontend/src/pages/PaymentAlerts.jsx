import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function PaymentAlerts() {
  const notify = useNotification();
  const [alerts, setAlerts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    due_date: '',
    amount: '',
    frequency: 'monthly',
    alert_enabled: true
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [alertsRes, tenantsRes] = await Promise.all([
          axios.get('/payment-alerts', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/tenants', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setAlerts(alertsRes.data || []);
        setTenants(tenantsRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredAlerts = alerts.filter(alert => {
    const tenant = tenants.find(t => t.id === alert.tenant_id);
    return tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/payment-alerts/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Payment Alerts', 'Alert updated.');
      } else {
        await axios.post('/payment-alerts', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Payment Alerts', 'Alert created.');
      }
      const res = await axios.get('/payment-alerts', { headers: { Authorization: `Bearer ${token}` } });
      setAlerts(res.data || []);
      setFormData({ tenant_id: '', due_date: '', amount: '', frequency: 'monthly', alert_enabled: true });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Payment Alerts', err.response?.data?.message || 'Error saving alert');
    }
  };

  const handleEdit = (alert) => {
    setFormData({
      tenant_id: alert.tenant_id,
      due_date: alert.due_date,
      amount: alert.amount,
      frequency: alert.frequency,
      alert_enabled: alert.alert_enabled
    });
    setEditId(alert.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm delete?')) return;
    try {
      await axios.delete(`/payment-alerts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setAlerts(alerts.filter(a => a.id !== id));
      notify.success('Payment Alerts', 'Deleted.');
    } catch (err) {
      notify.error('Payment Alerts', err.response?.data?.message || 'Error');
    }
  };

  const getTenantName = (id) => tenants.find(t => t.id === id)?.full_name || 'N/A';
  const isLate = (dueDate) => new Date(dueDate) < new Date();

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Payment Alerts & Reminders</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ tenant_id: '', due_date: '', amount: '', frequency: 'monthly', alert_enabled: true });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Add Alert"}
          </button>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="tenant_id" value={formData.tenant_id} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="">Select Tenant</option>
                  {tenants.map(t => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                </select>
                <input type="date" name="due_date" value={formData.due_date} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="number" name="amount" placeholder="Amount" value={formData.amount} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <select name="frequency" value={formData.frequency} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="once">Once</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="checkbox" name="alert_enabled" checked={formData.alert_enabled} onChange={(e) => setFormData(prev => ({ ...prev, alert_enabled: e.target.checked }))} />
                  Enable Alert
                </label>
              </div>
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update Alert' : 'Create Alert'}
              </button>
            </form>
          </div>
        )}

        <input type="text" placeholder="Search tenant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ddd", borderRadius: "5px" }} />

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Tenant</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Amount</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Due Date</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Frequency</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No alerts</td></tr>
                ) : (
                  filteredAlerts.map(alert => (
                    <tr key={alert.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{getTenantName(alert.tenant_id)}</td>
                      <td style={{ padding: "15px" }}>TZS {alert.amount}</td>
                      <td style={{ padding: "15px" }}>{new Date(alert.due_date).toLocaleDateString()}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "4px", background: isLate(alert.due_date) ? "#ffcdd2" : "#c8e6c9", color: isLate(alert.due_date) ? "#c62828" : "#2e7d32", fontSize: "12px" }}>
                          {isLate(alert.due_date) ? "OVERDUE" : "PENDING"}
                        </span>
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>{alert.frequency}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(alert)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(alert.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
