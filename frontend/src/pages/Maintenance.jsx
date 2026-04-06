import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import AppModal from '../components/ui/AppModal';
import AppTable from '../components/ui/AppTable';
import AppToolbar from '../components/ui/AppToolbar';
import '../styles/stream-layout.css';

export default function Maintenance() {
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const isTenant = user?.role === 'tenant';
  const token = localStorage.getItem('token');

  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    unit_id: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    budget: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reqRes, propsRes, unitsRes] = await Promise.all([
          axios.get('/maintenance').catch(() => ({ data: [] })),
          axios.get('/properties').catch(() => ({ data: [] })),
          axios.get('/units').catch(() => ({ data: [] })),
        ]);

        setRequests(reqRes.data || []);
        setProperties(propsRes.data || []);
        setUnits(unitsRes.data || []);
      } catch (err) {
        console.error('Error fetching maintenance data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleAddRequest = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('/maintenance', formData);
      setRequests([...requests, response.data]);
      setFormData({
        property_id: '',
        unit_id: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        budget: '',
      });
      setShowForm(false);
    } catch (err) {
      console.error('Error adding maintenance request:', err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const response = await axios.put(
        `/maintenance/${id}`,
        { status: newStatus }
      );
      setRequests(requests.map((request) => (request.id === id ? response.data : request)));
    } catch (err) {
      console.error('Error updating maintenance request:', err);
    }
  };

  const handleDeleteRequest = async (id) => {
    try {
      await axios.delete(`/maintenance/${id}`);
      setRequests(requests.filter((request) => request.id !== id));
    } catch (err) {
      console.error('Error deleting maintenance request:', err);
    }
  };

  const filteredRequests = requests.filter(
    (request) => {
      const term = String(searchTerm || '').toLowerCase();
      const description = String(request.description || '').toLowerCase();
      const propertyName = String(
        properties.find((property) => property.id === request.property_id)?.name || ''
      ).toLowerCase();

      const matchesTerm = !term || description.includes(term) || propertyName.includes(term);
      const matchesStatus = !filterStatus || request.status === filterStatus;
      return matchesTerm && matchesStatus;
    }
  );

  const getPropertyName = (id) => properties.find((property) => property.id === id)?.name || 'Unknown';

  return (
    <div className="rf-page">
      
      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Operations</p>
            <h1 className="rf-page-title">Maintenance Tracker</h1>
            <p className="rf-page-subtitle">
              Handle property issues, monitor request progress, and keep repair budgets visible across the portfolio.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <button onClick={() => setShowForm(true)} className="rf-btn rf-btn-primary">+ New Request</button>
          </div>
        </section>

        <AppModal open={showForm} title="Create Maintenance Request" onClose={() => setShowForm(false)} width="820px">
          <form onSubmit={handleAddRequest} className="rf-grid">
            {!isTenant && (
              <div className="rf-grid cols-3">
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, property_id: e.target.value }))}
                  required={!isTenant}
                >
                  <option value="">Select Property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
                <select
                  value={formData.unit_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, unit_id: e.target.value }))}
                >
                  <option value="">Select Unit (Optional)</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Budget (TZS)"
                  value={formData.budget}
                  onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                />
              </div>
            )}
            <textarea
              placeholder="Describe the maintenance issue"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              required
              rows="4"
            />
            <div className="rf-grid cols-3">
              <select
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              {!isTenant && (
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              )}
              <div />
            </div>
            <div className="rf-form-actions">
              <button type="button" className="rf-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="rf-btn rf-btn-primary">Create Request</button>
            </div>
          </form>
        </AppModal>

        {loading ? (
          <AppCard className="rf-empty-card">Loading maintenance data...</AppCard>
        ) : (
          <>
            <div className="rf-stats-grid">
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Total Requests</div>
                <div className="rf-stat-value">{requests.length}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Pending</div>
                <div className="rf-stat-value rf-stat-amber">{requests.filter((request) => request.status === 'pending').length}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">In Progress</div>
                <div className="rf-stat-value rf-stat-cyan">{requests.filter((request) => request.status === 'in_progress').length}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Completed</div>
                <div className="rf-stat-value rf-stat-green">{requests.filter((request) => request.status === 'completed').length}</div>
              </AppCard>
            </div>

            <AppToolbar className="rf-toolbar-surface">
              <input
                type="text"
                placeholder="Search maintenance requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rf-toolbar-input-grow"
              />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </AppToolbar>

            <AppCard className="rf-table-card">
              {filteredRequests.length === 0 ? (
                <div className="rf-empty">No maintenance requests found.</div>
              ) : (
                <AppTable headers={['Property', 'Description', 'Priority', 'Status', 'Budget', ...(isTenant ? [] : ['Actions'])]}>
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{getPropertyName(request.property_id)}</td>
                      <td>{request.description?.length > 50 ? `${request.description.slice(0, 50)}...` : request.description}</td>
                      <td>
                        <span className={`rf-status-badge ${request.priority === 'high' ? 'danger' : request.priority === 'medium' ? 'warning' : 'success'}`}>
                          {request.priority?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {isTenant ? (
                          <span style={{ textTransform: 'capitalize' }}>{request.status.replace('_', ' ')}</span>
                        ) : (
                          <select value={request.status} onChange={(e) => handleUpdateStatus(request.id, e.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}
                      </td>
                      <td>{request.budget ? `${parseFloat(request.budget).toLocaleString()} TZS` : 'N/A'}</td>
                      {!isTenant && (
                        <td>
                          <div className="rf-table-actions">
                            <button className="rf-btn rf-btn-danger" onClick={() => handleDeleteRequest(request.id)}>Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </AppTable>
              )}
            </AppCard>
          </>
        )}
      </div>
    </div>
  );
}
