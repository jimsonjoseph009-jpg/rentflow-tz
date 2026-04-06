import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function TaxDeductions() {
  const notify = useNotification();
  const [deductions, setDeductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: '',
    deduction_date: '',
    receipt_url: ''
  });
  const [editId, setEditId] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/tax-deductions', { headers: { Authorization: `Bearer ${token}` } });
        setDeductions(res.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredDeductions = deductions.filter(d =>
    d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/tax-deductions/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Tax', 'Updated.');
      } else {
        await axios.post('/tax-deductions', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Tax', 'Added.');
      }
      const res = await axios.get('/tax-deductions', { headers: { Authorization: `Bearer ${token}` } });
      setDeductions(res.data || []);
      setFormData({ description: '', category: '', amount: '', deduction_date: '', receipt_url: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Tax', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      description: item.description,
      category: item.category,
      amount: item.amount,
      deduction_date: item.deduction_date,
      receipt_url: item.receipt_url || ''
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/tax-deductions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setDeductions(deductions.filter(d => d.id !== id));
    } catch (err) {
      notify.error('Tax', err.response?.data?.message || 'Error');
    }
  };

  const getTotalDeductions = () => deductions.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const getByCategory = () => {
    const grouped = {};
    deductions.forEach(d => {
      grouped[d.category] = (grouped[d.category] || 0) + (parseFloat(d.amount) || 0);
    });
    return Object.entries(grouped);
  };

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Tax Deductions Calculator</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ description: '', category: '', amount: '', deduction_date: '', receipt_url: '' });
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ Add Deduction"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Total Deductible</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50", margin: 0 }}>TZS {getTotalDeductions().toLocaleString()}</h3>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Tax Savings (30%)</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#2196F3", margin: 0 }}>TZS {Math.round(getTotalDeductions() * 0.30).toLocaleString()}</h3>
          </div>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <input type="text" name="description" placeholder="Description" value={formData.description} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="category" value={formData.category} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="">Category</option>
                  <option value="repairs">Repairs & Maintenance</option>
                  <option value="utilities">Utilities</option>
                  <option value="insurance">Insurance</option>
                  <option value="property_tax">Property Tax</option>
                  <option value="advertising">Advertising</option>
                  <option value="professional">Professional Fees</option>
                </select>
                <input type="number" name="amount" placeholder="Amount" value={formData.amount} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <input type="date" name="deduction_date" value={formData.deduction_date} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <input type="text" name="receipt_url" placeholder="Receipt URL (optional)" value={formData.receipt_url} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Add'}
              </button>
            </form>
          </div>
        )}

        {getByCategory().length > 0 && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0 }}>Deductions by Category</h3>
            {getByCategory().map(([cat, amt]) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>
                <span>{cat}</span>
                <strong>TZS {amt.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        )}

        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ddd", borderRadius: "5px" }} />

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Description</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Amount</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeductions.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No deductions</td></tr>
                ) : (
                  filteredDeductions.map(ded => (
                    <tr key={ded.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{ded.description}</td>
                      <td style={{ padding: "15px" }}>{ded.category}</td>
                      <td style={{ padding: "15px" }}>TZS {ded.amount}</td>
                      <td style={{ padding: "15px" }}>{new Date(ded.deduction_date).toLocaleDateString()}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(ded)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(ded.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
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
