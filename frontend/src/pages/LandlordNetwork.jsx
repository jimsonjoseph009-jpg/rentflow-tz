import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';

export default function LandlordNetwork() {
  const notify = useNotification();
  const [landlords, setLandlords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    landlord_name: '',
    email: '',
    phone: '',
    properties_count: '',
    city: '',
    experience_years: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/landlord-network', { headers: { Authorization: `Bearer ${token}` } });
        setLandlords(res.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredLandlords = landlords.filter(l =>
    l.landlord_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/landlord-network/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Network', 'Updated.');
      } else {
        await axios.post('/landlord-network', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Network', 'Added.');
      }
      const res = await axios.get('/landlord-network', { headers: { Authorization: `Bearer ${token}` } });
      setLandlords(res.data || []);
      setFormData({ landlord_name: '', email: '', phone: '', properties_count: '', city: '', experience_years: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Network', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (landlord) => {
    setFormData({
      landlord_name: landlord.landlord_name,
      email: landlord.email,
      phone: landlord.phone,
      properties_count: landlord.properties_count,
      city: landlord.city,
      experience_years: landlord.experience_years
    });
    setEditId(landlord.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/landlord-network/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setLandlords(landlords.filter(l => l.id !== id));
    } catch (err) {
      notify.error('Network', err.response?.data?.message || 'Error');
    }
  };

  const contactLandlord = (email) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="rf-shell">
      <Navbar />
      <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Landlord Network</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ landlord_name: '', email: '', phone: '', properties_count: '', city: '', experience_years: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Connect Landlord"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Network Members</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea", margin: 0 }}>{landlords.length}</h3>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Avg Experience</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50", margin: 0 }}>
              {landlords.length > 0 ? Math.round(landlords.reduce((sum, l) => sum + (parseFloat(l.experience_years) || 0), 0) / landlords.length) : 0} yrs
            </h3>
          </div>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <input type="text" name="landlord_name" placeholder="Full Name" value={formData.landlord_name} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="tel" name="phone" placeholder="Phone" value={formData.phone} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="number" name="properties_count" placeholder="Properties" value={formData.properties_count} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="number" name="experience_years" placeholder="Years Experience" value={formData.experience_years} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Add to Network'}
              </button>
            </form>
          </div>
        )}

        <input type="text" placeholder="Search by name or city..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ddd", borderRadius: "5px" }} />

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>City</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Properties</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Exp (yrs)</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Email</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Phone</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLandlords.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No members</td></tr>
                ) : (
                  filteredLandlords.map(landlord => (
                    <tr key={landlord.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{landlord.landlord_name}</td>
                      <td style={{ padding: "15px" }}>{landlord.city}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>{landlord.properties_count}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>{landlord.experience_years}</td>
                      <td style={{ padding: "15px" }}>{landlord.email}</td>
                      <td style={{ padding: "15px" }}>{landlord.phone}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => contactLandlord(landlord.email)} style={{ padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Email</button>
                        <button onClick={() => handleEdit(landlord)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(landlord.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
