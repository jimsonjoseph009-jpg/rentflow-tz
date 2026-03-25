import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';

export default function AdminMonetization() {
  const token = localStorage.getItem('token');
  const notify = useNotification();
  const [data, setData] = useState(null);
  const [enterpriseClients, setEnterpriseClients] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    <div style={{ minHeight: '100vh', background: '#f7f9fc' }}>
      <Navbar />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <h1>Admin Monetization Dashboard</h1>
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
                <div key={k} style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ marginTop: 0 }}>{k.replace(/_/g, ' ')}</h4>
                  <p style={{ fontSize: '24px', margin: 0 }}>{Number(v).toLocaleString()}</p>
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
      </div>
    </div>
  );
}
