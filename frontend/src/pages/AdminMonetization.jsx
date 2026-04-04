import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import { useNotification } from '../context/NotificationContext';

export default function AdminMonetization() {
  const token = localStorage.getItem('token');
  const notify = useNotification();
  const [data, setData] = useState(null);
  const [enterpriseClients, setEnterpriseClients] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedMetric, setSelectedMetric] = useState(null);
  const [metricDetails, setMetricDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedMetric) return;
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const res = await axios.get(`/admin/monetization/details/${selectedMetric}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMetricDetails(res.data || []);
      } catch (err) {
        setDetailsError(err.response?.data?.message || 'Failed to fetch details');
      } finally {
        setDetailsLoading(false);
      }
    };
    fetchDetails();
  }, [selectedMetric, token]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [summaryRes, enterpriseRes] = await Promise.all([
          axios.get('/admin/monetization', { headers }),
          axios.get('/enterprise/clients', { headers }),
        ]);
        setData(summaryRes.data);
        setEnterpriseClients(enterpriseRes.data || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to fetch monetization data. Please ensure you have admin privileges.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      load();
    } else {
      setLoading(false);
      setError('No authentication token found. Please login again.');
    }
  }, [token]);

  const updateEnterpriseClient = async (id, payload) => {
    setSavingId(id);
    try {
      await axios.put(`/enterprise/clients/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnterpriseClients((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...payload } : item))
      );
    } catch (error) {
      notify.error('Enterprise', error.response?.data?.message || 'Failed to update enterprise client');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="rf-neo-main">
      <header className="rf-neo-topbar">
        <div>
          <p className="rf-neo-eyebrow">Admin Console</p>
          <h1>Admin Monetization Dashboard</h1>
          <span>Manage platform revenue, transactions, and enterprise client partnerships.</span>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', color: '#666' }}>Loading monetization data...</p>
        </div>
      ) : error ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff0f0', borderRadius: '12px', color: '#d32f2f' }}>
          <h3>Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : !data ? (
        <p>No data available.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px', marginBottom: '20px' }}>
            {Object.entries(data).map(([k, v]) => (
              <div 
                key={k} 
                onClick={() => setSelectedMetric(k)}
                style={{ 
                  background: '#fff', 
                  borderRadius: '12px', 
                  padding: '16px', 
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  color: '#333'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                <h4 style={{ marginTop: 0, color: '#555', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</h4>
                <p style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>
                  {k.includes('revenue') || k.includes('fees') 
                    ? `TZS ${Number(v).toLocaleString()}` 
                    : Number(v).toLocaleString()}
                </p>
                <small style={{ color: '#0066cc', display: 'block', marginTop: '8px' }}>View Details &rarr;</small>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ marginTop: 0 }}>Enterprise Clients</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Company</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Contact</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Negotiated Price</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enterpriseClients.map((client) => (
                    <tr key={client.id} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '8px' }}>{client.company_name}</td>
                      <td style={{ padding: '8px' }}>
                        {client.contact_person || '-'}<br />
                        <small>{client.contact_email || client.user_email || '-'}</small>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <select
                          value={client.status || 'lead'}
                          onChange={(e) =>
                            setEnterpriseClients((prev) =>
                              prev.map((item) =>
                                item.id === client.id ? { ...item, status: e.target.value } : item
                              )
                            )
                          }
                        >
                          <option value="lead">lead</option>
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="number"
                          value={client.negotiated_price || ''}
                          onChange={(e) =>
                            setEnterpriseClients((prev) =>
                              prev.map((item) =>
                                item.id === client.id ? { ...item, negotiated_price: e.target.value } : item
                              )
                            )
                          }
                          placeholder="TZS"
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <button
                          onClick={() =>
                            updateEnterpriseClient(client.id, {
                              status: client.status,
                              negotiated_price: client.negotiated_price || null,
                            })
                          }
                          disabled={savingId === client.id}
                        >
                          {savingId === client.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedMetric && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#333'
          }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, textTransform: 'capitalize' }}>{selectedMetric.replace(/_/g, ' ')} Details</h2>
              <button 
                onClick={() => setSelectedMetric(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {detailsLoading ? (
                <p>Loading details...</p>
              ) : detailsError ? (
                <p style={{ color: '#d32f2f' }}>{detailsError}</p>
              ) : metricDetails.length === 0 ? (
                <p>No records found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys(metricDetails[0]).map(key => (
                        <th key={key} style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #eee', background: '#fafafa', textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricDetails.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        {Object.values(row).map((val, i) => (
                          <td key={i} style={{ padding: '12px 8px' }}>
                            {val === null ? '-' : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

