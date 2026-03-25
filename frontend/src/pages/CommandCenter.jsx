import { useEffect, useState } from 'react';
import API from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import AppCard from '../components/ui/AppCard';
import '../styles/stream-layout.css';

export default function CommandCenter() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await API.get('/insights/command-center');
        setData(res.data);
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load command center');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const summary = data?.summary || {};
  const alerts = data?.alerts || [];

  return (
    <div className="rf-page">
      <Navbar />

      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Insights</p>
            <h1 className="rf-page-title">Portfolio Command Center</h1>
            <p className="rf-page-subtitle">Live portfolio health, collection risk, and occupancy signals.</p>
          </div>
        </section>

        {loading && <AppCard className="rf-empty-card">Loading command center...</AppCard>}
        {!loading && error && <div className="rf-empty rf-empty-danger">{error}</div>}

        {!loading && !error && (
          <>
            <div className="rf-stats-grid">
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Occupancy Rate</div>
                <div className="rf-stat-value rf-stat-green">{summary.occupancy_rate || 0}%</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Collection Rate</div>
                <div className="rf-stat-value rf-stat-cyan">{summary.collection_rate || 0}%</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Monthly Collected</div>
                <div className="rf-stat-value">{(summary.monthly_collected || 0).toLocaleString()} TZS</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Collection Gap</div>
                <div className="rf-stat-value rf-stat-amber">{(summary.collection_gap || 0).toLocaleString()} TZS</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">At-Risk Tenants</div>
                <div className="rf-stat-value rf-stat-rose">{summary.at_risk_tenants || 0}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Portfolio Units</div>
                <div className="rf-stat-value rf-stat-violet">{summary.occupied_units || 0}/{summary.total_units || 0}</div>
              </AppCard>
            </div>

            <AppCard className="rf-section-card">
              <div className="rf-section-head">
                <div>
                  <h3>Priority Alerts</h3>
                  <p>Critical and medium-level issues requiring action.</p>
                </div>
              </div>
              {alerts.length === 0 ? (
                <div className="rf-empty">No critical issues right now.</div>
              ) : (
                <div className="rf-stack-list">
                  {alerts.map((alert) => (
                    <div key={alert.code} className="rf-list-row">
                      <div className="rf-inline-actions" style={{ justifyContent: 'space-between' }}>
                        <strong>{alert.title}</strong>
                        <span className={`rf-status-badge ${alert.level === 'high' ? 'danger' : 'warning'}`}>
                          {alert.level || 'medium'}
                        </span>
                      </div>
                      <div className="rf-list-meta" style={{ marginTop: 6 }}>{alert.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </AppCard>
          </>
        )}
      </div>
    </div>
  );
}
