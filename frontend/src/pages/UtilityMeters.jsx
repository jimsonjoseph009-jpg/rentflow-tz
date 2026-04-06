import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function UtilityMeters() {
  const notify = useNotification();
  const [meters, setMeters] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    unit_id: '',
    meter_type: 'electricity',
    reading: '',
    reading_date: '',
    cost: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [metersRes, unitsRes] = await Promise.all([
          axios.get('/utility-meters', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/units', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setMeters(metersRes.data || []);
        setUnits(unitsRes.data || []);
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
        await axios.put(`/utility-meters/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Utility Meters', 'Reading updated.');
      } else {
        await axios.post('/utility-meters', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Utility Meters', 'Reading added.');
      }
      const res = await axios.get('/utility-meters', { headers: { Authorization: `Bearer ${token}` } });
      setMeters(res.data || []);
      setFormData({ unit_id: '', meter_type: 'electricity', reading: '', reading_date: '', cost: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Utility Meters', err.response?.data?.message || 'Error saving');
    }
  };

  const handleEdit = (meter) => {
    setFormData({
      unit_id: meter.unit_id,
      meter_type: meter.meter_type,
      reading: meter.reading,
      reading_date: meter.reading_date,
      cost: meter.cost
    });
    setEditId(meter.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/utility-meters/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMeters(meters.filter(m => m.id !== id));
    } catch (err) {
      notify.error('Utility Meters', err.response?.data?.message || 'Error');
    }
  };

  const getUnitInfo = (id) => units.find(u => u.id === id)?.unit_number || 'N/A';

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Utility Meter Readings</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ unit_id: '', meter_type: 'electricity', reading: '', reading_date: '', cost: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Record Reading"}
          </button>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="unit_id" value={formData.unit_id} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="">Select Unit</option>
                  {units.map(u => (<option key={u.id} value={u.id}>{u.unit_number}</option>))}
                </select>
                <select name="meter_type" value={formData.meter_type} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="gas">Gas</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="number" name="reading" placeholder="Meter Reading" value={formData.reading} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="date" name="reading_date" value={formData.reading_date} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <input type="number" name="cost" placeholder="Cost" value={formData.cost} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update Reading' : 'Add Reading'}
              </button>
            </form>
          </div>
        )}

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Unit</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Reading</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Cost</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {meters.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No readings</td></tr>
                ) : (
                  meters.map(meter => (
                    <tr key={meter.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{getUnitInfo(meter.unit_id)}</td>
                      <td style={{ padding: "15px" }}>{meter.meter_type}</td>
                      <td style={{ padding: "15px" }}>{meter.reading}</td>
                      <td style={{ padding: "15px" }}>{new Date(meter.reading_date).toLocaleDateString()}</td>
                      <td style={{ padding: "15px" }}>TZS {meter.cost}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(meter)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(meter.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
