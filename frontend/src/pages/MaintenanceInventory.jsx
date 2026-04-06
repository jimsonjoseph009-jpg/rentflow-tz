import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function MaintenanceInventory() {
  const notify = useNotification();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    part_name: '',
    category: '',
    quantity: '',
    unit_cost: '',
    supplier: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/maintenance-inventory', { headers: { Authorization: `Bearer ${token}` } });
        setInventory(res.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredInventory = inventory.filter(item =>
    item.part_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/maintenance-inventory/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Inventory', 'Updated.');
      } else {
        await axios.post('/maintenance-inventory', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Inventory', 'Added.');
      }
      const res = await axios.get('/maintenance-inventory', { headers: { Authorization: `Bearer ${token}` } });
      setInventory(res.data || []);
      setFormData({ part_name: '', category: '', quantity: '', unit_cost: '', supplier: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Inventory', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      part_name: item.part_name,
      category: item.category,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      supplier: item.supplier
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/maintenance-inventory/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setInventory(inventory.filter(i => i.id !== id));
    } catch (err) {
      notify.error('Inventory', err.response?.data?.message || 'Error');
    }
  };

  const getLowStockCount = () => inventory.filter(i => i.quantity <= 5).length;

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Maintenance Parts Inventory</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ part_name: '', category: '', quantity: '', unit_cost: '', supplier: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Add Part"}
          </button>
        </div>

        {getLowStockCount() > 0 && (
          <div style={{ background: "#fff3cd", padding: "15px", borderRadius: "5px", marginBottom: "20px", borderLeft: "4px solid #ff9800" }}>
            <strong>Warning:</strong> {getLowStockCount()} items have low stock (≤5 units)
          </div>
        )}

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="text" name="part_name" placeholder="Part Name" value={formData.part_name} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="text" name="category" placeholder="Category" value={formData.category} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="number" name="quantity" placeholder="Quantity" value={formData.quantity} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="number" name="unit_cost" placeholder="Unit Cost" value={formData.unit_cost} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <input type="text" name="supplier" placeholder="Supplier" value={formData.supplier} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Add'}
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
                  <th style={{ padding: "15px", textAlign: "left" }}>Part</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Qty</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Cost</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Supplier</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No items</td></tr>
                ) : (
                  filteredInventory.map(item => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #eee", background: item.quantity <= 5 ? "#fffde7" : "white" }}>
                      <td style={{ padding: "15px" }}>{item.part_name}</td>
                      <td style={{ padding: "15px" }}>{item.category}</td>
                      <td style={{ padding: "15px", textAlign: "center", fontWeight: "bold", color: item.quantity <= 5 ? "#f57f17" : "#333" }}>{item.quantity}</td>
                      <td style={{ padding: "15px" }}>TZS {item.unit_cost}</td>
                      <td style={{ padding: "15px" }}>{item.supplier}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(item)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(item.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
