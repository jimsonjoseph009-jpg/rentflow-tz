import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import '../styles/stream-layout.css';

const parseMeta = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export default function CollectionsCenter() {
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [running, setRunning] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [error, setError] = useState('');
  const [lastRun, setLastRun] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const res = await axios.get('/notifications?limit=30', { headers });
      const raw = res.data || [];
      const filtered = raw.filter((item) => {
        const title = String(item.title || '').toLowerCase();
        return title.includes('payment retry') || title.includes('reminder');
      });
      setAlerts(filtered);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load collections alerts');
    } finally {
      setLoadingAlerts(false);
    }
  }, [headers]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const runAutomation = async ({ mode = 'all', dryRun = false }) => {
    try {
      setRunning(true);
      setError('');
      const res = await axios.post(`/payments/collections/run?mode=${mode}&dry_run=${dryRun}`, {}, { headers });
      setLastRun(res.data);
      await loadAlerts();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to run automation');
    } finally {
      setRunning(false);
    }
  };

  const reminders = lastRun?.reminders;
  const retries = lastRun?.retries;

  return (
    <div className="rf-page">
      <Navbar />
      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Collections</p>
            <h1 className="rf-page-title">Collections Center</h1>
            <p className="rf-page-subtitle">
              Run reminders, apply retry rules, and watch collections-related alerts in one place.
            </p>
          </div>
        </section>

        <AppToolbar className="rf-toolbar-surface">
          <button className="rf-btn" onClick={() => runAutomation({ mode: 'all', dryRun: true })} disabled={running}>
            {running ? 'Running...' : 'Dry Run (All)'}
          </button>
          <button className="rf-btn" onClick={() => runAutomation({ mode: 'reminders', dryRun: false })} disabled={running}>
            Send Reminders
          </button>
          <button className="rf-btn" onClick={() => runAutomation({ mode: 'retries', dryRun: false })} disabled={running}>
            Run Retry Rules
          </button>
          <button className="rf-btn rf-btn-primary" onClick={() => runAutomation({ mode: 'all', dryRun: false })} disabled={running}>
            Run Full Automation
          </button>
        </AppToolbar>

        {error && <div className="rf-empty rf-empty-danger">{error}</div>}

        <div className="rf-stats-grid">
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Reminders Sent</div>
            <div className="rf-stat-value">{reminders?.sent ?? 0}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Tenants Processed</div>
            <div className="rf-stat-value rf-stat-cyan">{reminders?.processed ?? 0}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Retry Matches</div>
            <div className="rf-stat-value rf-stat-amber">{retries?.matched_rules ?? 0}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Retry Notifications</div>
            <div className="rf-stat-value rf-stat-green">{retries?.notified ?? 0}</div>
          </AppCard>
        </div>

        <AppCard className="rf-section-card">
          <div className="rf-section-head">
            <div>
              <h3>Last Run Result</h3>
              <p>Most recent collections automation response.</p>
            </div>
          </div>
          {!lastRun ? (
            <div className="rf-empty">No run yet. Use one of the run buttons above.</div>
          ) : (
            <div className="rf-stack-list">
              <div className="rf-list-row"><strong>Mode:</strong> {lastRun.mode}</div>
              <div className="rf-list-row"><strong>Dry Run:</strong> {String(lastRun.dry_run)}</div>
              <div className="rf-list-row"><strong>Run At:</strong> {new Date(lastRun.run_at).toLocaleString()}</div>
            </div>
          )}
        </AppCard>

        <AppCard className="rf-section-card">
          <div className="rf-section-head">
            <div>
              <h3>Recent Collections Alerts</h3>
              <p>Reminder and retry-related notifications.</p>
            </div>
          </div>
          {loadingAlerts ? (
            <div className="rf-empty">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="rf-empty">No collections alerts found.</div>
          ) : (
            <div className="rf-stack-list">
              {alerts.map((item) => {
                const meta = parseMeta(item.metadata);
                const isHigh = String(item.title || '').toLowerCase().includes('retry');

                return (
                  <div key={item.id} className="rf-list-row">
                    <div className="rf-inline-actions" style={{ justifyContent: 'space-between' }}>
                      <strong>{item.title}</strong>
                      <span className={`rf-status-badge ${isHigh ? 'danger' : 'warning'}`}>
                        {isHigh ? 'HIGH' : 'MEDIUM'}
                      </span>
                    </div>
                    <div className="rf-list-meta" style={{ marginTop: 6 }}>{item.message}</div>
                    <small className="rf-list-meta">{new Date(item.created_at).toLocaleString()}</small>
                    {meta?.retry_url ? (
                      <div style={{ marginTop: 8 }}>
                        <a className="rf-table-link" href={meta.retry_url} target="_blank" rel="noreferrer">
                          Open Retry Payment Link
                        </a>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </AppCard>
      </div>
    </div>
  );
}
