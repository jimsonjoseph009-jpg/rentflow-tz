import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function VisitorLog() {
  const notify = useNotification();
  const [visitors, setVisitors] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    visitor_name: '',
    property_id: '',
    visit_date: '',
    visit_time: '',
    purpose: '',
    contact_number: ''
  });
  const [editId, setEditId] = useState(null);
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isTenant = user?.role === 'tenant';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [visitorsRes, propertiesRes] = await Promise.all([
          axios.get('/visitor-log'),
          axios.get('/properties')
        ]);
        setVisitors(visitorsRes.data || []);
        setProperties(propertiesRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const filteredVisitors = visitors.filter(v =>
    v.visitor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/visitor-log/${editId}`, formData);
        notify.success('Visitors', 'Updated.');
      } else {
        await axios.post('/visitor-log', formData);
        notify.success('Visitors', 'Logged.');
      }
      const res = await axios.get('/visitor-log');
      setVisitors(res.data || []);
      setFormData({ visitor_name: '', property_id: '', visit_date: '', visit_time: '', purpose: '', contact_number: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Visitors', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (visitor) => {
    setFormData({
      visitor_name: visitor.visitor_name,
      property_id: visitor.property_id,
      visit_date: visitor.visit_date,
      visit_time: visitor.visit_time,
      purpose: visitor.purpose,
      contact_number: visitor.contact_number
    });
    setEditId(visitor.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/visitor-log/${id}`);
      setVisitors(visitors.filter(v => v.id !== id));
    } catch (err) {
      notify.error('Visitors', err.response?.data?.message || 'Error');
    }
  };

  const getPropertyName = (id) => properties.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Visitor/Guest Log</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ visitor_name: '', property_id: '', visit_date: '', visit_time: '', purpose: '', contact_number: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Log Visitor"}
          </button>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: isTenant ? "1fr" : "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="text" name="visitor_name" placeholder="Visitor Name" value={formData.visitor_name} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                {!isTenant && (
                  <select name="property_id" value={formData.property_id} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                    <option value="">Select Property</option>
                    {properties.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="date" name="visit_date" value={formData.visit_date} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="time" name="visit_time" value={formData.visit_time} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <input type="text" name="purpose" placeholder="Purpose of Visit" value={formData.purpose} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <input type="tel" name="contact_number" placeholder="Contact Number" value={formData.contact_number} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Log Visitor'}
              </button>
            </form>
          </div>
        )}

        <input type="text" placeholder="Search visitor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ddd", borderRadius: "5px" }} />

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Property</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Date & Time</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Purpose</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Contact</th>
                  {!isTenant && <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No visitors</td></tr>
                ) : (
                  filteredVisitors.map(visitor => (
                    <tr key={visitor.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{visitor.visitor_name}</td>
                      <td style={{ padding: "15px" }}>{getPropertyName(visitor.property_id)}</td>
                      <td style={{ padding: "15px" }}>{new Date(visitor.visit_date).toLocaleDateString()} {visitor.visit_time}</td>
                      <td style={{ padding: "15px" }}>{visitor.purpose}</td>
                      <td style={{ padding: "15px" }}>{visitor.contact_number}</td>
                      {!isTenant && (
                        <td style={{ padding: "15px", textAlign: "center" }}>
                          <button onClick={() => handleEdit(visitor)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                          <button onClick={() => handleDelete(visitor.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
                        </td>
                      )}
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
