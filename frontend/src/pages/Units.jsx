import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import '../styles/stream-layout.css';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import AppModal from '../components/ui/AppModal';
import AppTable from '../components/ui/AppTable';
import { useNotification } from '../context/NotificationContext';

export default function Units() {
  const notify = useNotification();
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState({ unit_number: '', property_id: '', rent_amount: '' });

  const token = localStorage.getItem('token');

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/units', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnits(res.data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await axios.get('/properties', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(res.data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchUnits();
    fetchProperties();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        unit_number: unit.unit_number,
        property_id: unit.property_id,
        rent_amount: unit.rent_amount
      });
    } else {
      setEditingUnit(null);
      setFormData({ unit_number: '', property_id: '', rent_amount: '' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await axios.put(`/units/${editingUnit.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/units', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchUnits();
      setShowForm(false);
      setEditingUnit(null);
      setFormData({ unit_number: '', property_id: '', rent_amount: '' });
      notify.success('Units', 'Unit saved successfully.');
    } catch (err) {
      notify.error('Units', err.response?.data?.message || 'Error saving unit');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`/units/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUnits();
      notify.success('Units', 'Unit deleted successfully.');
    } catch (err) {
      notify.error('Units', err.response?.data?.message || 'Error deleting unit');
    }
  };

  const filteredUnits = units.filter((unit) => {
    const matchesSearch = (unit.unit_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="rf-page">
      <Navbar />

      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Inventory</p>
            <h2 className="rf-page-title">Units</h2>
            <p className="rf-page-subtitle">
              Maintain unit inventory, rent amounts, and occupancy status across all connected properties.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <button onClick={() => openModal()} className="rf-btn rf-btn-primary">+ Add Unit</button>
          </div>
        </section>

        <div className="rf-stats-grid">
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Total Units</div>
            <div className="rf-stat-value">{units.length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Occupied</div>
            <div className="rf-stat-value rf-stat-green">{units.filter((unit) => unit.status === 'occupied').length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Vacant</div>
            <div className="rf-stat-value rf-stat-amber">{units.filter((unit) => (unit.status || 'vacant') !== 'occupied').length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Listed Properties</div>
            <div className="rf-stat-value rf-stat-cyan">{properties.length}</div>
          </AppCard>
        </div>

        <AppToolbar className="rf-toolbar-surface">
          <input
            type="text"
            placeholder="Search by unit number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rf-toolbar-input-grow"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
          </select>
          <button onClick={() => openModal()} className="rf-btn rf-btn-primary">+ Add Unit</button>
        </AppToolbar>

        {showForm && (
          <AppModal open={showForm} title={editingUnit ? 'Edit Unit' : 'Add Unit'} onClose={() => setShowForm(false)}>
              <form onSubmit={handleSubmit} className="rf-grid">
                <input
                  type="text"
                  name="unit_number"
                  placeholder="Unit Number (e.g., A1, B2)"
                  value={formData.unit_number}
                  onChange={handleChange}
                  required
                />
                <select
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Property</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>{prop.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  name="rent_amount"
                  placeholder="Rent Amount (TZS)"
                  value={formData.rent_amount}
                  onChange={handleChange}
                  required
                  step="0.01"
                />

                <div className="rf-form-actions">
                  <button type="button" className="rf-btn" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="rf-btn rf-btn-primary">{editingUnit ? 'Update' : 'Add'}</button>
                </div>
              </form>
            </AppModal>
        )}

        {loading && <AppCard className="rf-empty-card">Loading units...</AppCard>}

        {!loading && units.length === 0 && <AppCard className="rf-empty-card">No units yet. Click "Add Unit" to get started.</AppCard>}

        {!loading && units.length > 0 && filteredUnits.length === 0 && (
          <AppCard className="rf-empty-card">No units match your search or filter.</AppCard>
        )}

        {!loading && filteredUnits.length > 0 && (
          <AppCard className="rf-table-card">
            <AppTable headers={['Unit Number', 'Property', 'Rent Amount (TZS)', 'Status', 'Actions']}>
                {filteredUnits.map((unit) => {
                  const property = properties.find((p) => p.id === unit.property_id);
                  return (
                    <tr key={unit.id}>
                      <td>{unit.unit_number}</td>
                      <td>{property?.name || unit.property_name || 'Unknown'}</td>
                      <td>{Number(unit.rent_amount || 0).toLocaleString()}</td>
                      <td>
                        <span className={`rf-status-badge ${unit.status === 'occupied' ? 'success' : 'warning'}`}>
                          {unit.status || 'vacant'}
                        </span>
                      </td>
                      <td>
                        <div className="rf-table-actions">
                          <button className="rf-btn" onClick={() => openModal(unit)}>Edit</button>
                          <button className="rf-btn rf-btn-danger" onClick={() => handleDelete(unit.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </AppTable>
          </AppCard>
        )}
      </div>
    </div>
  );
}
