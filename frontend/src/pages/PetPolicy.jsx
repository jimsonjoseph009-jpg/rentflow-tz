import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';

export default function PetPolicy() {
  const notify = useNotification();
  const [pets, setPets] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    tenant_id: '',
    pet_type: 'dog',
    pet_name: '',
    breed: '',
    weight: '',
    policy_compliant: true,
    notes: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [petsRes, tenantsRes] = await Promise.all([
          axios.get('/pet-policy', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/tenants', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setPets(petsRes.data || []);
        setTenants(tenantsRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredPets = pets.filter(p => {
    const tenant = tenants.find(t => t.id === p.tenant_id);
    return (tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.pet_name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'policy_compliant' ? e.target.checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/pet-policy/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Pet Policy', 'Updated.');
      } else {
        await axios.post('/pet-policy', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Pet Policy', 'Added.');
      }
      const res = await axios.get('/pet-policy', { headers: { Authorization: `Bearer ${token}` } });
      setPets(res.data || []);
      setFormData({ tenant_id: '', pet_type: 'dog', pet_name: '', breed: '', weight: '', policy_compliant: true, notes: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Pet Policy', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (pet) => {
    setFormData({
      tenant_id: pet.tenant_id,
      pet_type: pet.pet_type,
      pet_name: pet.pet_name,
      breed: pet.breed,
      weight: pet.weight,
      policy_compliant: pet.policy_compliant,
      notes: pet.notes || ''
    });
    setEditId(pet.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/pet-policy/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPets(pets.filter(p => p.id !== id));
    } catch (err) {
      notify.error('Pet Policy', err.response?.data?.message || 'Error');
    }
  };

  const getTenantName = (id) => tenants.find(t => t.id === id)?.full_name || 'Unknown';
  const getNonCompliantCount = () => pets.filter(p => !p.policy_compliant).length;

  return (
    <div className="rf-shell">
      <Navbar />
      <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Pet Policy Manager</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ tenant_id: '', pet_type: 'dog', pet_name: '', breed: '', weight: '', policy_compliant: true, notes: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Log Pet"}
          </button>
        </div>

        {getNonCompliantCount() > 0 && (
          <div style={{ background: "#ffebee", padding: "15px", borderRadius: "5px", marginBottom: "20px", borderLeft: "4px solid #f44336" }}>
            <strong>Alert:</strong> {getNonCompliantCount()} pet(s) not compliant with policy
          </div>
        )}

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="tenant_id" value={formData.tenant_id} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="">Select Tenant</option>
                  {tenants.map(t => (<option key={t.id} value={t.id}>{t.full_name}</option>))}
                </select>
                <select name="pet_type" value={formData.pet_type} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                  <option value="bird">Bird</option>
                  <option value="fish">Fish</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="text" name="pet_name" placeholder="Pet Name" value={formData.pet_name} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="text" name="breed" placeholder="Breed" value={formData.breed} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <input type="text" name="weight" placeholder="Weight (kg)" value={formData.weight} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <input type="checkbox" name="policy_compliant" checked={formData.policy_compliant} onChange={handleInputChange} />
                Policy Compliant
              </label>
              <textarea name="notes" placeholder="Notes..." value={formData.notes} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", minHeight: "80px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Log Pet'}
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
                  <th style={{ padding: "15px", textAlign: "left" }}>Pet</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Breed</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Weight</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Compliant</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPets.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No pets</td></tr>
                ) : (
                  filteredPets.map(pet => (
                    <tr key={pet.id} style={{ borderBottom: "1px solid #eee", background: !pet.policy_compliant ? "#ffebee" : "white" }}>
                      <td style={{ padding: "15px" }}>{getTenantName(pet.tenant_id)}</td>
                      <td style={{ padding: "15px" }}>{pet.pet_name}</td>
                      <td style={{ padding: "15px" }}>{pet.pet_type}</td>
                      <td style={{ padding: "15px" }}>{pet.breed || '-'}</td>
                      <td style={{ padding: "15px" }}>{pet.weight || '-'}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <span style={{ padding: "4px 12px", borderRadius: "4px", background: pet.policy_compliant ? "#c8e6c9" : "#ffcdd2", color: pet.policy_compliant ? "#2e7d32" : "#c62828", fontSize: "12px" }}>
                          {pet.policy_compliant ? "YES" : "NO"}
                        </span>
                      </td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(pet)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(pet.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
