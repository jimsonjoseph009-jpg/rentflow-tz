import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function DisputeLog() {
  const notify = useNotification();
  const [disputes, setDisputes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    complaint_title: '',
    description: '',
    category: 'maintenance',
    severity: 'medium',
    status: 'open',
    resolution_notes: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [disputesRes, tenantsRes] = await Promise.all([
          axios.get('/dispute-log', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/tenants', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setDisputes(disputesRes.data || []);
        setTenants(tenantsRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredDisputes = disputes.filter(d => {
    const tenant = tenants.find(t => t.id === d.tenant_id);
    return tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || d.complaint_title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/dispute-log/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Disputes', 'Updated.');
      } else {
        await axios.post('/dispute-log', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Disputes', 'Logged.');
      }
      const res = await axios.get('/dispute-log', { headers: { Authorization: `Bearer ${token}` } });
      setDisputes(res.data || []);
      setFormData({ tenant_id: '', complaint_title: '', description: '', category: 'maintenance', severity: 'medium', status: 'open', resolution_notes: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Disputes', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (dispute) => {
    setFormData({
      tenant_id: dispute.tenant_id,
      complaint_title: dispute.complaint_title,
      description: dispute.description,
      category: dispute.category,
      severity: dispute.severity,
      status: dispute.status,
      resolution_notes: dispute.resolution_notes || ''
    });
    setEditId(dispute.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/dispute-log/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDisputes(disputes.filter(d => d.id !== id));
    } catch (err) {
      notify.error('Disputes', err.response?.data?.message || 'Error');
    }
  };

  const getTenantName = (id) => tenants.find(t => t.id === id)?.full_name || 'Unknown';
  const getOpenCount = () => disputes.filter(d => d.status === 'open').length;
  const getResolvedCount = () => disputes.filter(d => d.status === 'resolved').length;

  const getSeverityColor = (severity) => {
    const colors = { low: '#4CAF50', medium: '#ff9800', high: '#f44336' };
    return colors[severity] || '#999';
  };

  const getStatusColor = (status) => {
    const colors = { open: '#f44336', in_progress: '#ff9800', resolved: '#4CAF50' };
    return colors[status] || '#999';
  };

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Dispute/Complaint Log</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ tenant_id: '', complaint_title: '', description: '', category: 'maintenance', severity: 'medium', status: 'open', resolution_notes: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ New Complaint"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Total</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea", margin: 0 }}>{disputes.length}</h3>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Open</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#f44336", margin: 0 }}>{getOpenCount()}</h3>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Resolved</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50", margin: 0 }}>{getResolvedCount()}</h3>
          </div>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <select name="tenant_id" value={formData.tenant_id} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }}>
                <option value="">Select Tenant</option>
                {tenants.map(t => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
              </select>
              <input type="text" name="complaint_title" placeholder="Complaint Title" value={formData.complaint_title} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <textarea name="description" placeholder="Detailed Description" value={formData.description} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", minHeight: "100px", marginBottom: "15px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="category" value={formData.category} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="maintenance">Maintenance</option>
                  <option value="payment">Payment</option>
                  <option value="noise">Noise</option>
                  <option value="safety">Safety</option>
                  <option value="other">Other</option>
                </select>
                <select name="severity" value={formData.severity} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select name="status" value={formData.status} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <textarea name="resolution_notes" placeholder="Resolution Notes (optional)" value={formData.resolution_notes} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", minHeight: "80px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Log Complaint'}
              </button>
            </form>
          </div>
        )}

        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ddd", borderRadius: "5px" }} />

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Tenant</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Complaint</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Severity</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDisputes.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No complaints</td></tr>
                ) : (
                  filteredDisputes.map(dispute => (
                    <tr key={dispute.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{getTenantName(dispute.tenant_id)}</td>
                      <td style={{ padding: "15px" }}>{dispute.complaint_title}</td>
                      <td style={{ padding: "15px" }}>{dispute.category}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "4px", background: getSeverityColor(dispute.severity), color: "white", fontSize: "12px" }}>
                          {dispute.severity.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "4px", background: getStatusColor(dispute.status), color: "white", fontSize: "12px" }}>
                          {dispute.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(dispute)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(dispute.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
