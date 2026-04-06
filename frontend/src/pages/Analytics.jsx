import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import '../styles/stream-layout.css';

export default function Analytics() {
  const [stats, setStats] = useState({});
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, propsRes, unitsRes] = await Promise.all([
          axios.get('/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/properties', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/units', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setStats(statsRes.data || {});
        setProperties(propsRes.data || []);
        setUnits(unitsRes.data || []);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const totalUnits = units.length;
  const occupiedUnits = units.filter((unit) => unit.status === 'occupied').length;
  const vacantUnits = Math.max(totalUnits - occupiedUnits, 0);
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const incomePerUnit = totalUnits > 0 ? Math.round((stats.monthly_income || 0) / totalUnits) : 0;
  const topProperties = properties.slice(0, 5);

  const summaryInsights = useMemo(
    () => [
      `You have ${stats.total_properties || 0} properties with ${stats.total_units || 0} total units.`,
      `Occupancy is ${occupancyRate}% with ${occupiedUnits} occupied and ${vacantUnits} vacant units.`,
      `Average income per unit is ${incomePerUnit.toLocaleString()} TZS per month.`,
      `Monthly income currently stands at ${Number(stats.monthly_income || 0).toLocaleString()} TZS.`,
    ],
    [stats, occupancyRate, occupiedUnits, vacantUnits, incomePerUnit]
  );

  return (
    <div className="rf-page">
      
      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Reporting</p>
            <h1 className="rf-page-title">Analytics & Reports</h1>
            <p className="rf-page-subtitle">
              Review occupancy, income, and property distribution using the same command-style workspace.
            </p>
          </div>
        </section>

        {loading ? (
          <AppCard className="rf-empty-card">Loading analytics...</AppCard>
        ) : (
          <>
            <div className="rf-stats-grid">
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Total Properties</div>
                <div className="rf-stat-value">{stats.total_properties || 0}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Total Units</div>
                <div className="rf-stat-value rf-stat-cyan">{stats.total_units || 0}</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Occupancy Rate</div>
                <div className="rf-stat-value rf-stat-green">{occupancyRate}%</div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Monthly Income</div>
                <div className="rf-stat-value rf-stat-amber">{Number(stats.monthly_income || 0).toLocaleString()} TZS</div>
              </AppCard>
            </div>

            <div className="rf-grid cols-3" style={{ marginBottom: 16 }}>
              <AppCard className="rf-section-card">
                <div className="rf-section-head">
                  <div>
                    <h3>Unit Status Distribution</h3>
                    <p>Portfolio occupancy split.</p>
                  </div>
                </div>
                <div className="rf-stack-list">
                  <div className="rf-list-row">
                    <div className="rf-list-title">Occupied Units</div>
                    <div className="rf-list-meta">{occupiedUnits} of {totalUnits || 0}</div>
                    <div className="rf-meter"><span style={{ width: `${occupancyRate}%` }} /></div>
                  </div>
                  <div className="rf-list-row">
                    <div className="rf-list-title">Vacant Units</div>
                    <div className="rf-list-meta">{vacantUnits} of {totalUnits || 0}</div>
                    <div className="rf-meter rf-meter-warn"><span style={{ width: `${totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0}%` }} /></div>
                  </div>
                </div>
              </AppCard>

              <AppCard className="rf-section-card">
                <div className="rf-section-head">
                  <div>
                    <h3>Properties by Units</h3>
                    <p>Largest listings in the portfolio.</p>
                  </div>
                </div>
                {topProperties.length === 0 ? (
                  <div className="rf-empty">No properties yet.</div>
                ) : (
                  <div className="rf-stack-list">
                    {topProperties.map((property) => (
                      <div key={property.id} className="rf-list-row">
                        <div className="rf-list-title">{property.name}</div>
                        <div className="rf-list-meta">{property.units} units</div>
                        <div className="rf-meter"><span style={{ width: `${Math.min((Number(property.units || 0) / 20) * 100, 100)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </AppCard>

              <AppCard className="rf-section-card">
                <div className="rf-section-head">
                  <div>
                    <h3>Financial Summary</h3>
                    <p>Quick revenue context.</p>
                  </div>
                </div>
                <div className="rf-stack-list">
                  <div className="rf-list-row">
                    <div className="rf-list-title">Monthly Income</div>
                    <div className="rf-stat-value rf-stat-green" style={{ fontSize: 24 }}>
                      {Number(stats.monthly_income || 0).toLocaleString()} TZS
                    </div>
                  </div>
                  <div className="rf-list-row">
                    <div className="rf-list-title">Income per Unit</div>
                    <div className="rf-stat-value rf-stat-cyan" style={{ fontSize: 24 }}>
                      {incomePerUnit.toLocaleString()} TZS
                    </div>
                  </div>
                </div>
              </AppCard>
            </div>

            <AppCard className="rf-section-card">
              <div className="rf-section-head">
                <div>
                  <h3>Quick Insights</h3>
                  <p>Portfolio health summary at a glance.</p>
                </div>
              </div>
              <div className="rf-stack-list">
                {summaryInsights.map((insight) => (
                  <div key={insight} className="rf-list-row">
                    <div className="rf-list-title">{insight}</div>
                  </div>
                ))}
              </div>
            </AppCard>
          </>
        )}
      </div>
    </div>
  );
}
