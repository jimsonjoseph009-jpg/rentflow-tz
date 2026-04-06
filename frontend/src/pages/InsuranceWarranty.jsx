import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function InsuranceWarranty() {
  const notify = useNotification();
  const [records, setRecords] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    property_id: '',
    item_description: '',
    type: 'insurance',
    expiry_date: '',
    provider: '',
    policy_number: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [recordsRes, propertiesRes] = await Promise.all([
          axios.get('/insurance-warranty', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/properties', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setRecords(recordsRes.data || []);
        setProperties(propertiesRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredRecords = records.filter(r =>
    r.item_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/insurance-warranty/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Insurance', 'Updated.');
      } else {
        await axios.post('/insurance-warranty', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Insurance', 'Added.');
      }
      const res = await axios.get('/insurance-warranty', { headers: { Authorization: `Bearer ${token}` } });
      setRecords(res.data || []);
      setFormData({ property_id: '', item_description: '', type: 'insurance', expiry_date: '', provider: '', policy_number: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Insurance', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (record) => {
    setFormData({
      property_id: record.property_id,
      item_description: record.item_description,
      type: record.type,
      expiry_date: record.expiry_date,
      provider: record.provider,
      policy_number: record.policy_number
    });
    setEditId(record.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/insurance-warranty/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setRecords(records.filter(r => r.id !== id));
    } catch (err) {
      notify.error('Insurance', err.response?.data?.message || 'Error');
    }
  };

  const isExpiringSoon = (date) => {
    const expiry = new Date(date);
    const today = new Date();
    const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  };
  const isExpired = (date) => new Date(date) < new Date();
  const getExpiringCount = () => records.filter(r => isExpiringSoon(r.expiry_date)).length;
  const getExpiredCount = () => records.filter(r => isExpired(r.expiry_date)).length;

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Insurance & Warranty Tracker</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ property_id: '', item_description: '', type: 'insurance', expiry_date: '', provider: '', policy_number: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Add Record"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Total Records</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea", margin: 0 }}>{records.length}</h3>
          </div>
          {getExpiringCount() > 0 && (
            <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <p style={{ color: "#999", margin: "0 0 10px 0" }}>Expiring Soon (30 days)</p>
              <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800", margin: 0 }}>{getExpiringCount()}</h3>
            </div>
          )}
          {getExpiredCount() > 0 && (
            <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <p style={{ color: "#999", margin: "0 0 10px 0" }}>Expired</p>
              <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#f44336", margin: 0 }}>{getExpiredCount()}</h3>
            </div>
          )}
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <select name="property_id" value={formData.property_id} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }}>
                <option value="">Select Property</option>
                {properties.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
              <input type="text" name="item_description" placeholder="Item Description" value={formData.item_description} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="type" value={formData.type} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="insurance">Insurance</option>
                  <option value="warranty">Warranty</option>
                  <option value="license">License</option>
                </select>
                <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="text" name="provider" placeholder="Provider/Company" value={formData.provider} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="text" name="policy_number" placeholder="Policy/Serial Number" value={formData.policy_number} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Add Record'}
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
                  <th style={{ padding: "15px", textAlign: "left" }}>Item</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Provider</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Policy #</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Expiry Date</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No records</td></tr>
                ) : (
                  filteredRecords.map(record => {
                    const expired = isExpired(record.expiry_date);
                    const expiringSoon = isExpiringSoon(record.expiry_date);
                    return (
                      <tr key={record.id} style={{ borderBottom: "1px solid #eee", background: expired ? "#ffebee" : expiringSoon ? "#fffde7" : "white" }}>
                        <td style={{ padding: "15px" }}>{record.item_description}</td>
                        <td style={{ padding: "15px" }}>{record.type}</td>
                        <td style={{ padding: "15px" }}>{record.provider}</td>
                        <td style={{ padding: "15px" }}>{record.policy_number || '-'}</td>
                        <td style={{ padding: "15px" }}>{new Date(record.expiry_date).toLocaleDateString()}</td>
                        <td style={{ padding: "15px", textAlign: "center" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "4px", background: expired ? "#ffcdd2" : expiringSoon ? "#fff9c4" : "#c8e6c9", color: expired ? "#c62828" : expiringSoon ? "#f57f17" : "#2e7d32", fontSize: "12px" }}>
                            {expired ? "EXPIRED" : expiringSoon ? "EXPIRING" : "VALID"}
                          </span>
                        </td>
                        <td style={{ padding: "15px", textAlign: "center" }}>
                          <button onClick={() => handleEdit(record)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                          <button onClick={() => handleDelete(record.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
