import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import '../styles/stream-layout.css';

export default function TimelinePage() {
  const token = localStorage.getItem('token');
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const loadTenants = async () => {
      const { data } = await axios.get('/tenants', { headers: { Authorization: `Bearer ${token}` } });
      setTenants(data || []);
    };
    loadTenants().catch(console.error);
  }, [token]);

  const loadTimeline = async (id) => {
    if (!id) return;
    const { data } = await axios.get(`/timeline/tenant/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setEvents(data || []);
  };

  return (
    <div className="rf-page">
            <div className="rf-page-content narrow">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">History</p>
            <h1 className="rf-page-title">Tenant Timeline</h1>
            <p className="rf-page-subtitle">
              Follow tenant events, updates, and lifecycle activity across the tenancy journey.
            </p>
          </div>
        </section>

        <AppToolbar className="rf-toolbar-surface">
          <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="">Select tenant</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>
            ))}
          </select>
          <button className="rf-btn rf-btn-primary" onClick={() => loadTimeline(tenantId)} disabled={!tenantId}>
            Load Timeline
          </button>
        </AppToolbar>

        <div className="rf-stack-list">
          {events.length === 0 ? <AppCard className="rf-empty-card">No timeline events yet.</AppCard> : null}
          {events.map((event) => (
            <AppCard key={event.id} className="rf-section-card">
              <div className="rf-list-title">{event.title}</div>
              <p className="rf-list-meta" style={{ marginTop: 6 }}>{event.description}</p>
              <small className="rf-list-meta">{event.event_type} • {new Date(event.created_at).toLocaleString()}</small>
            </AppCard>
          ))}
        </div>
      </div>
    </div>
  );
}
