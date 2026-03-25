import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';

export default function QRInspections() {
  const notify = useNotification();
  const [inspections, setInspections] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    qr_code: '',
    inspection_date: '',
    condition_status: 'good',
    notes: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [inspectionsRes, propertiesRes] = await Promise.all([
          axios.get('/qr-inspections', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/properties', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setInspections(inspectionsRes.data || []);
        setProperties(propertiesRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/qr-inspections/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('QR Inspections', 'Updated.');
      } else {
        await axios.post('/qr-inspections', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('QR Inspections', 'Inspection added.');
      }
      const res = await axios.get('/qr-inspections', { headers: { Authorization: `Bearer ${token}` } });
      setInspections(res.data || []);
      setFormData({ property_id: '', qr_code: '', inspection_date: '', condition_status: 'good', notes: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('QR Inspections', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (inspection) => {
    setFormData({
      property_id: inspection.property_id,
      qr_code: inspection.qr_code,
      inspection_date: inspection.inspection_date,
      condition_status: inspection.condition_status,
      notes: inspection.notes || ''
    });
    setEditId(inspection.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/qr-inspections/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setInspections(inspections.filter(i => i.id !== id));
    } catch (err) {
      notify.error('QR Inspections', err.response?.data?.message || 'Error');
    }
  };

  const getPropertyName = (id) => properties.find(p => p.id === id)?.name || 'Unknown';
  const getStatusColor = (status) => {
    const colors = { good: '#4CAF50', fair: '#ff9800', poor: '#f44336' };
    return colors[status] || '#999';
  };

  return (
    <div className="rf-shell">
      <Navbar />
      <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>QR Code Inspections</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ property_id: '', qr_code: '', inspection_date: '', condition_status: 'good', notes: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Quick Check"}
          </button>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="property_id" value={formData.property_id} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="">Select Property</option>
                  {properties.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
                <input type="text" name="qr_code" placeholder="Scan QR Code" value={formData.qr_code} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="date" name="inspection_date" value={formData.inspection_date} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <select name="condition_status" value={formData.condition_status} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
              <textarea name="notes" placeholder="Inspection notes..." value={formData.notes} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", minHeight: "80px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Save Inspection'}
              </button>
            </form>
          </div>
        )}

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Property</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>QR Code</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Condition</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Notes</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inspections.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No inspections</td></tr>
                ) : (
                  inspections.map(insp => (
                    <tr key={insp.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{getPropertyName(insp.property_id)}</td>
                      <td style={{ padding: "15px" }}>{insp.qr_code || 'N/A'}</td>
                      <td style={{ padding: "15px" }}>{new Date(insp.inspection_date).toLocaleDateString()}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "4px", background: getStatusColor(insp.condition_status), color: "white", fontSize: "12px" }}>
                          {insp.condition_status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "15px" }}>{insp.notes || '-'}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(insp)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(insp.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
