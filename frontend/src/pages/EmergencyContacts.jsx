import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';

export default function EmergencyContacts() {
  const notify = useNotification();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_type: 'electrician',
    phone_number: '',
    email: '',
    address: '',
    service_area: ''
  });
  const [editId, setEditId] = useState(null);
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : {};
  const isLandlord = user.role === 'landlord';
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/emergency-contacts', { headers: { Authorization: `Bearer ${token}` } });
        setContacts(res.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const filteredContacts = contacts.filter(c =>
    c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/emergency-contacts/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Emergency', 'Updated.');
      } else {
        await axios.post('/emergency-contacts', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Emergency', 'Added.');
      }
      const res = await axios.get('/emergency-contacts', { headers: { Authorization: `Bearer ${token}` } });
      setContacts(res.data || []);
      setFormData({ contact_name: '', contact_type: 'electrician', phone_number: '', email: '', address: '', service_area: '' });
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Emergency', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (contact) => {
    setFormData({
      contact_name: contact.contact_name,
      contact_type: contact.contact_type,
      phone_number: contact.phone_number,
      email: contact.email || '',
      address: contact.address || '',
      service_area: contact.service_area || ''
    });
    setEditId(contact.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/emergency-contacts/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setContacts(contacts.filter(c => c.id !== id));
    } catch (err) {
      notify.error('Emergency', err.response?.data?.message || 'Error');
    }
  };

  const callContact = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const smsContact = (phone) => {
    window.location.href = `sms:${phone}`;
  };

  const contactTypes = ['Electrician', 'Plumber', 'Carpenter', 'Doctor', 'Police', 'Fire', 'Gas Company', 'Water Company', 'Other'];

  return (
    <div className="rf-shell">
      <Navbar />
      <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Emergency Contacts</h2>
          {isLandlord && (
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditId(null);
                setFormData({ contact_name: '', contact_type: 'electrician', phone_number: '', email: '', address: '', service_area: '' });
              }}
              style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
            >
              {showForm ? "Cancel" : "+ Add Contact"}
            </button>
          )}
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="text" name="contact_name" placeholder="Name" value={formData.contact_name} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <select name="contact_type" value={formData.contact_type} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  {contactTypes.map(type => (<option key={type} value={type.toLowerCase()}>{type}</option>))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <input type="tel" name="phone_number" placeholder="Phone" value={formData.phone_number} onChange={handleInputChange} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
                <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <input type="text" name="service_area" placeholder="Service Area" value={formData.service_area} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Add Contact'}
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
                  <th style={{ padding: "15px", textAlign: "left" }}>Name</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Phone</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Email</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Service Area</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No contacts</td></tr>
                ) : (
                  filteredContacts.map(contact => (
                    <tr key={contact.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{contact.contact_name}</td>
                      <td style={{ padding: "15px" }}>{contact.contact_type}</td>
                      <td style={{ padding: "15px" }}>{contact.phone_number}</td>
                      <td style={{ padding: "15px" }}>{contact.email || '-'}</td>
                      <td style={{ padding: "15px" }}>{contact.service_area || '-'}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => callContact(contact.phone_number)} style={{ padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Call</button>
                        <button onClick={() => smsContact(contact.phone_number)} style={{ padding: "6px 12px", background: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>SMS</button>
                        {isLandlord && (
                          <>
                            <button onClick={() => handleEdit(contact)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                            <button onClick={() => handleDelete(contact.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
                          </>
                        )}
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
