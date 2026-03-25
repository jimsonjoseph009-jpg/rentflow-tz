import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';

export default function VehicleManagement() {
  const notify = useNotification();
  const [vehicles, setVehicles] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    vehicle_type: 'car',
    registration_number: '',
    make_model: '',
    color: '',
    parking_spot: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [vehiclesRes, tenantsRes] = await Promise.all([
          axios.get('/vehicle-management', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/tenants', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setVehicles(vehiclesRes.data || []);
        setTenants(tenantsRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredVehicles = vehicles.filter(v => {
    const tenant = tenants.find(t => t.id === v.tenant_id);
    return tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || v.registration_number.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/vehicle-management/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Vehicles', 'Updated.');
      } else {
        await axios.post('/vehicle-management', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Vehicles', 'Added.');
      }
      const res = await axios.get('/vehicle-management', { headers: { Authorization: `Bearer ${token}` } });
      setVehicles(res.data || []);
      setFormData({ tenant_id: '', vehicle_type: 'car', registration_number: '', make_model: '', color: '', parking_spot: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Vehicles', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (vehicle) => {
    setFormData({
      tenant_id: vehicle.tenant_id,
      vehicle_type: vehicle.vehicle_type,
      registration_number: vehicle.registration_number,
      make_model: vehicle.make_model,
      color: vehicle.color,
      parking_spot: vehicle.parking_spot || ''
    });
    setEditId(vehicle.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/vehicle-management/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setVehicles(vehicles.filter(v => v.id !== id));
    } catch (err) {
      notify.error('Vehicles', err.response?.data?.message || 'Error');
    }
  };

  const getTenantName = (id) => tenants.find(t => t.id === id)?.full_name || 'Unknown';
  const getParkedCount = () => vehicles.length;

  return (
    <div className="rf-shell">
      <Navbar />
      <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Vehicle Management</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ tenant_id: '', vehicle_type: 'car', registration_number: '', make_model: '', color: '', parking_spot: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Register Vehicle"}
          </button>
        </div>

        <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "30px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <p style={{ color: "#999", margin: "0 0 10px 0" }}>Registered Vehicles</p>
          <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea", margin: 0 }}>{getParkedCount()}</h3>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="tenant_id" value={formData.tenant_id} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="">Select Tenant</option>
                  {tenants.map(t => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                </select>
                <select name="vehicle_type" value={formData.vehicle_type} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="car">Car</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="truck">Truck</option>
                  <option value="suv">SUV</option>
                  <option value="bus">Bus</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="text" name="registration_number" placeholder="License Plate" value={formData.registration_number} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="text" name="make_model" placeholder="Make & Model" value={formData.make_model} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="text" name="color" placeholder="Color" value={formData.color} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="text" name="parking_spot" placeholder="Parking Spot" value={formData.parking_spot} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Register Vehicle'}
              </button>
            </form>
          </div>
        )}

        <input type="text" placeholder="Search by tenant or plate..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ddd", borderRadius: "5px" }} />

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Tenant</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Make & Model</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>License Plate</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Color</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Parking</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No vehicles</td></tr>
                ) : (
                  filteredVehicles.map(vehicle => (
                    <tr key={vehicle.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{getTenantName(vehicle.tenant_id)}</td>
                      <td style={{ padding: "15px" }}>{vehicle.vehicle_type}</td>
                      <td style={{ padding: "15px" }}>{vehicle.make_model}</td>
                      <td style={{ padding: "15px", fontWeight: "bold" }}>{vehicle.registration_number}</td>
                      <td style={{ padding: "15px" }}>{vehicle.color}</td>
                      <td style={{ padding: "15px" }}>{vehicle.parking_spot || '-'}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(vehicle)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(vehicle.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
