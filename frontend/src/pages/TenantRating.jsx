import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function TenantRating() {
  const notify = useNotification();
  const [ratings, setRatings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    payment_history: 5,
    behavior: 5,
    reliability: 5,
    comments: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [ratingsRes, tenantsRes] = await Promise.all([
          axios.get('/tenant-ratings', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/tenants', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setRatings(ratingsRes.data || []);
        setTenants(tenantsRes.data || []);
      } catch (err) {
        console.error('Error loading data:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredRatings = ratings.filter(rating => {
    const tenant = tenants.find(t => t.id === rating.tenant_id);
    return tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.includes('_') && !isNaN(value) ? parseInt(value) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/tenant-ratings/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Tenant Rating', 'Rating updated.');
      } else {
        await axios.post('/tenant-ratings', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Tenant Rating', 'Rating saved.');
      }
      const res = await axios.get('/tenant-ratings', { headers: { Authorization: `Bearer ${token}` } });
      setRatings(res.data || []);
      setFormData({ tenant_id: '', payment_history: 5, behavior: 5, reliability: 5, comments: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Tenant Rating', err.response?.data?.message || 'Error saving rating');
    }
  };

  const handleEdit = (rating) => {
    setFormData({
      tenant_id: rating.tenant_id,
      payment_history: rating.payment_history,
      behavior: rating.behavior,
      reliability: rating.reliability,
      comments: rating.comments || ''
    });
    setEditId(rating.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm delete?')) return;
    try {
      await axios.delete(`/tenant-ratings/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setRatings(ratings.filter(r => r.id !== id));
      notify.success('Tenant Rating', 'Deleted.');
    } catch (err) {
      notify.error('Tenant Rating', err.response?.data?.message || 'Error deleting');
    }
  };

  const getTenantName = (id) => tenants.find(t => t.id === id)?.full_name || 'N/A';
  const getAverageScore = (rating) => Math.round((rating.payment_history + rating.behavior + rating.reliability) / 3);

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Tenant Credit Scores</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ tenant_id: '', payment_history: 5, behavior: 5, reliability: 5, comments: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Add Rating"}
          </button>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select
                  name="tenant_id"
                  value={formData.tenant_id}
                  onChange={handleInputChange}
                  required
                  style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}
                >
                  <option value="">Select Tenant</option>
                  {tenants.map(t => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                </select>
                <div>
                  <label>Payment History: {formData.payment_history}/10</label>
                  <input type="range" name="payment_history" min="0" max="10" value={formData.payment_history} onChange={handleInputChange} style={{ width: "100%" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <div>
                  <label>Behavior: {formData.behavior}/10</label>
                  <input type="range" name="behavior" min="0" max="10" value={formData.behavior} onChange={handleInputChange} style={{ width: "100%" }} />
                </div>
                <div>
                  <label>Reliability: {formData.reliability}/10</label>
                  <input type="range" name="reliability" min="0" max="10" value={formData.reliability} onChange={handleInputChange} style={{ width: "100%" }} />
                </div>
              </div>
              <textarea name="comments" placeholder="Comments..." value={formData.comments} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", minHeight: "80px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update Rating' : 'Add Rating'}
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
                  <th style={{ padding: "15px", textAlign: "center" }}>Payment</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Behavior</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Reliability</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Average</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRatings.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No ratings</td></tr>
                ) : (
                  filteredRatings.map(rating => (
                    <tr key={rating.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{getTenantName(rating.tenant_id)}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>{rating.payment_history}/10</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>{rating.behavior}/10</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>{rating.reliability}/10</td>
                      <td style={{ padding: "15px", textAlign: "center", fontWeight: "bold", color: "#667eea" }}>{getAverageScore(rating)}/10</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(rating)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(rating.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
