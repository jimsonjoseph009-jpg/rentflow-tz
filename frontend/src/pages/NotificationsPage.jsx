import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import '../styles/stream-layout.css';

export default function NotificationsPage() {
  const token = localStorage.getItem('token');
  const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [items, setItems] = useState([]);
  const [connected, setConnected] = useState(false);

  const load = async () => {
    try {
      const { data } = await axios.get('/notifications', { headers });
      setItems(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
    const streamUrl = `${apiBase}/api/notifications/stream`;
    const es = new EventSource(streamUrl, { withCredentials: true });

    es.addEventListener('connected', () => setConnected(true));
    es.addEventListener('notification', (event) => {
      try {
        const payload = JSON.parse(event.data);
        setItems((prev) => [payload, ...prev]);
      } catch {
        // ignore parse issues
      }
    });
    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = async (id) => {
    await axios.put(`/notifications/${id}/read`, {}, { headers });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAll = async () => {
    await axios.put('/notifications/read-all', {}, { headers });
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Signals</p>
            <h1 className="rf-page-title">Realtime Notifications</h1>
            <p className="rf-page-subtitle">
              Watch live notification flow and keep alert inboxes cleared across the platform.
            </p>
          </div>
        </section>

        <AppToolbar className="rf-toolbar-surface">
          <div className="rf-inline-actions">
            <span className={`rf-status-badge ${connected ? 'success' : 'danger'}`}>
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <button className="rf-btn" onClick={markAll}>Mark all read</button>
        </AppToolbar>

        <div className="rf-grid">
          {items.length === 0 ? <AppCard className="rf-empty-card">No notifications yet.</AppCard> : null}
          {items.map((n) => (
            <AppCard key={n.id} className="rf-section-card" style={{ border: n.is_read ? '1px solid #314c7d' : '1px solid #4f77bd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                <strong>{n.title}</strong>
                <small>{new Date(n.created_at).toLocaleString()}</small>
              </div>
              <p style={{ marginBottom: 8 }}>{n.message}</p>
              {!n.is_read ? <button className="rf-btn" onClick={() => markRead(n.id)}>Mark read</button> : <small>Read</small>}
            </AppCard>
          ))}
        </div>
    </>
  );
}



