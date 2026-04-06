import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

export default function OccupancyForecast() {
  const [forecast, setForecast] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [forecastRes, propertiesRes] = await Promise.all([
          axios.get('/occupancy-forecast', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('/properties', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setForecast(forecastRes.data || []);
        setProperties(propertiesRes.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  const getPropertyName = (id) => properties.find(p => p.id === id)?.name || 'Unknown';
  const getDaysUntilEmpty = (leaseEnd) => {
    const end = new Date(leaseEnd);
    const today = new Date();
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  };
  const getOccupancyPercent = () => {
    if (forecast.length === 0) return 0;
    const occupied = forecast.filter(f => getDaysUntilEmpty(f.lease_end) > 0).length;
    return Math.round((occupied / forecast.length) * 100);
  };

  return (
    <div className="rf-shell">
            <main className="rf-content">
        <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "20px" }}>Occupancy Forecast</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "30px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Overall Occupancy</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#667eea", margin: 0 }}>{getOccupancyPercent()}%</h3>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Total Units</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#4CAF50", margin: 0 }}>{forecast.length}</h3>
          </div>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <p style={{ color: "#999", margin: "0 0 10px 0" }}>Vacant in 30 Days</p>
            <h3 style={{ fontSize: "32px", fontWeight: "bold", color: "#ff9800", margin: 0 }}>
              {forecast.filter(f => {
                const days = getDaysUntilEmpty(f.lease_end);
                return days > 0 && days <= 30;
              }).length}
            </h3>
          </div>
        </div>

        {loading ? (
          <p>Loading forecast...</p>
        ) : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Property</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Tenant</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Lease Ends</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Days Until Empty</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {forecast.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No forecast data</td></tr>
                ) : (
                  forecast.map((f, idx) => {
                    const days = getDaysUntilEmpty(f.lease_end);
                    const status = days <= 0 ? "VACANT" : days <= 30 ? "SOON" : "OCCUPIED";
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "15px" }}>{getPropertyName(f.property_id)}</td>
                        <td style={{ padding: "15px" }}>{f.tenant_name || 'N/A'}</td>
                        <td style={{ padding: "15px" }}>{new Date(f.lease_end).toLocaleDateString()}</td>
                        <td style={{ padding: "15px", textAlign: "center", fontWeight: "bold" }}>{days}</td>
                        <td style={{ padding: "15px", textAlign: "center" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "4px", background: status === "VACANT" ? "#ffcdd2" : status === "SOON" ? "#fff9c4" : "#c8e6c9", color: status === "VACANT" ? "#c62828" : status === "SOON" ? "#f57f17" : "#2e7d32", fontSize: "12px" }}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
