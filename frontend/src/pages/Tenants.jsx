import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import LocationPicker from '../components/LocationPicker';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import AppModal from '../components/ui/AppModal';
import AppTable from '../components/ui/AppTable';
import { useNotification } from '../context/NotificationContext';
import '../styles/stream-layout.css';

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  unit_id: '',
  lease_start: '',
  lease_end: '',
  latitude: '',
  longitude: ''
};

export default function Tenants() {
  const notify = useNotification();
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [payLinkModal, setPayLinkModal] = useState({ open: false, tenant: null });
  const [payLinkForm, setPayLinkForm] = useState({ amount: '', expires_in_days: 7 });
  const [payLinkResult, setPayLinkResult] = useState({ url: '', token: '' });
  const [payLinkError, setPayLinkError] = useState('');
  const [payLinkLoading, setPayLinkLoading] = useState(false);
  const [chatLinkModal, setChatLinkModal] = useState({ open: false, tenant: null });
  const [chatLinkForm, setChatLinkForm] = useState({ expires_in_days: 30 });
  const [chatLinkResult, setChatLinkResult] = useState({ url: '', token: '' });
  const [chatLinkError, setChatLinkError] = useState('');
  const [chatLinkLoading, setChatLinkLoading] = useState(false);
  const [inviteModal, setInviteModal] = useState({ open: false, tenant: null });
  const [inviteForm, setInviteForm] = useState({ expires_in_days: 7 });
  const [inviteResult, setInviteResult] = useState({ url: '', token: '' });
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const token = localStorage.getItem('token');

  const fetchTenants = async () => {
    try {
      const response = await axios.get('/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(response.data || []);
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await axios.get('/units', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnits(response.data || []);
    } catch (err) {
      console.error('Error fetching units:', err);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTenants(), fetchUnits()]);
      setLoading(false);
    };
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTenants = tenants.filter((tenant) =>
    (tenant.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tenant.phone || '').includes(searchTerm)
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openModal = (tenant = null) => {
    if (tenant) {
      setFormData({
        full_name: tenant.full_name,
        email: tenant.email,
        phone: tenant.phone,
        unit_id: tenant.unit_id || '',
        lease_start: tenant.lease_start || '',
        lease_end: tenant.lease_end || '',
        latitude: tenant.latitude ?? '',
        longitude: tenant.longitude ?? ''
      });
      setEditId(tenant.id);
    } else {
      setFormData(emptyForm);
      setEditId(null);
    }
    setShowForm(true);
  };

  const openPayLinkModal = (tenant) => {
    setPayLinkModal({ open: true, tenant });
    setPayLinkForm({ amount: '', expires_in_days: 7 });
    setPayLinkResult({ url: '', token: '' });
    setPayLinkError('');
    setPayLinkLoading(false);
  };

  const closePayLinkModal = () => {
    setPayLinkModal({ open: false, tenant: null });
    setPayLinkError('');
    setPayLinkLoading(false);
  };

  const openChatLinkModal = (tenant) => {
    setChatLinkModal({ open: true, tenant });
    setChatLinkForm({ expires_in_days: 30 });
    setChatLinkResult({ url: '', token: '' });
    setChatLinkError('');
    setChatLinkLoading(false);
  };

  const closeChatLinkModal = () => {
    setChatLinkModal({ open: false, tenant: null });
    setChatLinkError('');
    setChatLinkLoading(false);
  };

  const createChatLink = async (event) => {
    event.preventDefault();
    if (!chatLinkModal.tenant) return;

    const expiresNum = Number(chatLinkForm.expires_in_days);
    if (!Number.isFinite(expiresNum) || expiresNum < 1 || expiresNum > 365) {
      setChatLinkError('Expiry must be between 1 and 365 days.');
      return;
    }

    setChatLinkLoading(true);
    setChatLinkError('');
    setChatLinkResult({ url: '', token: '' });

    try {
      const res = await axios.post(
        '/chat/tenant-links',
        {
          tenant_id: chatLinkModal.tenant.id,
          expires_in_days: expiresNum,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setChatLinkResult({ url: res.data?.public_url || '', token: res.data?.token || '' });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create chat link';
      setChatLinkError(message);
    } finally {
      setChatLinkLoading(false);
    }
  };

  const copyChatLink = async () => {
    const text = chatLinkResult.url;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notify.info('Chat Link', 'Link copied.');
    } catch {
      window.prompt('Copy this link:', text);
    }
  };

  const openInviteModal = (tenant) => {
    setInviteModal({ open: true, tenant });
    setInviteForm({ expires_in_days: 7 });
    setInviteResult({ url: '', token: '' });
    setInviteError('');
    setInviteLoading(false);
  };

  const closeInviteModal = () => {
    setInviteModal({ open: false, tenant: null });
    setInviteError('');
    setInviteLoading(false);
  };

  const createInvite = async (event) => {
    event.preventDefault();
    if (!inviteModal.tenant) return;

    const expiresNum = Number(inviteForm.expires_in_days);
    if (!Number.isFinite(expiresNum) || expiresNum < 1 || expiresNum > 60) {
      setInviteError('Expiry must be between 1 and 60 days.');
      return;
    }

    setInviteLoading(true);
    setInviteError('');
    setInviteResult({ url: '', token: '' });

    try {
      const res = await axios.post(
        '/tenant-invites',
        {
          tenant_id: inviteModal.tenant.id,
          expires_in_days: expiresNum,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInviteResult({ url: res.data?.public_url || '', token: res.data?.token || '' });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create invite';
      setInviteError(message);
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = async () => {
    const text = inviteResult.url;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notify.info('Invite Link', 'Link copied.');
    } catch {
      window.prompt('Copy this link:', text);
    }
  };

  const createPayLink = async (event) => {
    event.preventDefault();
    if (!payLinkModal.tenant) return;

    const amountNum = Number(payLinkForm.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setPayLinkError('Enter a valid amount (TZS).');
      return;
    }

    const expiresNum = Number(payLinkForm.expires_in_days);
    if (!Number.isFinite(expiresNum) || expiresNum < 1 || expiresNum > 60) {
      setPayLinkError('Expiry must be between 1 and 60 days.');
      return;
    }

    setPayLinkLoading(true);
    setPayLinkError('');
    setPayLinkResult({ url: '', token: '' });

    try {
      const res = await axios.post(
        '/paylinks',
        {
          tenant_id: payLinkModal.tenant.id,
          amount: amountNum,
          expires_in_days: expiresNum,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPayLinkResult({ url: res.data?.public_url || '', token: res.data?.token || '' });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to create pay link';
      setPayLinkError(message);
    } finally {
      setPayLinkLoading(false);
    }
  };

  const copyPayLink = async () => {
    const text = payLinkResult.url;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      notify.info('Pay Link', 'Link copied.');
    } catch {
      window.prompt('Copy this link:', text);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/tenants/${editId}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        notify.success('Tenants', 'Tenant updated successfully.');
      } else {
        await axios.post('/tenants', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        notify.success('Tenants', 'Tenant saved successfully.');
      }
      await fetchTenants();
      setFormData(emptyForm);
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      notify.error('Tenants', err.response?.data?.message || 'Error saving tenant');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`/tenants/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchTenants();
      notify.success('Tenants', 'Tenant deleted successfully.');
    } catch (err) {
      notify.error('Tenants', err.response?.data?.message || 'Error deleting tenant');
    }
  };

  const getUnitInfo = (unitId) => {
    const unit = units.find((u) => u.id === unitId);
    return unit ? unit.unit_number : 'N/A';
  };

  const activeLeases = tenants.filter((tenant) => tenant.lease_end && new Date(tenant.lease_end) >= new Date()).length;

  return (
    <>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Residents</p>
            <h2 className="rf-page-title">Tenants</h2>
            <p className="rf-page-subtitle">
              Manage tenant records, lease dates, and share payment, chat, or invite links from one place.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <button className="rf-btn rf-btn-primary" onClick={() => openModal()}>
              + Add Tenant
            </button>
          </div>
        </section>

        <div className="rf-stats-grid">
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Total Tenants</div>
            <div className="rf-stat-value">{tenants.length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Active Leases</div>
            <div className="rf-stat-value rf-stat-green">{activeLeases}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Assigned Units</div>
            <div className="rf-stat-value rf-stat-cyan">{tenants.filter((tenant) => tenant.unit_id).length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Search Results</div>
            <div className="rf-stat-value rf-stat-violet">{filteredTenants.length}</div>
          </AppCard>
        </div>

        <AppToolbar className="rf-toolbar-surface">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rf-toolbar-input-grow"
          />
          <button className="rf-btn rf-btn-primary" onClick={() => openModal()}>
            + Add Tenant
          </button>
        </AppToolbar>

        <AppModal open={showForm} title={editId ? 'Edit Tenant' : 'Add Tenant'} onClose={() => setShowForm(false)} width="760px">
          <form onSubmit={handleSubmit} className="rf-grid">
            <div className="rf-grid cols-3">
              <input
                type="text"
                name="full_name"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <input
                type="tel"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="rf-grid cols-3">
              <select name="unit_id" value={formData.unit_id} onChange={handleInputChange}>
                <option value="">Select Unit (Optional)</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.unit_number}</option>
                ))}
              </select>
              <input
                type="date"
                name="lease_start"
                value={formData.lease_start}
                onChange={handleInputChange}
                required
              />
              <input
                type="date"
                name="lease_end"
                value={formData.lease_end}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="rf-grid cols-3">
              <input
                type="number"
                step="any"
                name="latitude"
                placeholder="Latitude (optional)"
                value={formData.latitude}
                onChange={handleInputChange}
              />
              <input
                type="number"
                step="any"
                name="longitude"
                placeholder="Longitude (optional)"
                value={formData.longitude}
                onChange={handleInputChange}
              />
              <button
                type="button"
                className="rf-btn"
                onClick={() => {
                  if (!navigator.geolocation) {
                    notify.warning('Geolocation', 'Not supported on this browser.');
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setFormData((prev) => ({
                        ...prev,
                        latitude: String(position.coords.latitude),
                        longitude: String(position.coords.longitude),
                      }));
                    },
                    () => notify.error('Geolocation', 'Failed to get current location.'),
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }}
              >
                Use Current Location
              </button>
            </div>

            <LocationPicker
              height={260}
              latitude={formData.latitude}
              longitude={formData.longitude}
              onChange={({ lat, lng }) =>
                setFormData((prev) => ({
                  ...prev,
                  latitude: String(lat),
                  longitude: String(lng),
                }))
              }
            />

            <div className="rf-form-actions">
              <button type="button" className="rf-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="rf-btn rf-btn-primary">{editId ? 'Update Tenant' : 'Add Tenant'}</button>
            </div>
          </form>
        </AppModal>

        {loading ? (
          <AppCard className="rf-empty-card">Loading tenants...</AppCard>
        ) : filteredTenants.length === 0 ? (
          <AppCard className="rf-empty-card">No tenants found.</AppCard>
        ) : (
          <AppCard className="rf-table-card">
            <AppTable headers={['Name', 'Email', 'Phone', 'Unit', 'Lease Start', 'Lease End', 'Actions']}>
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>{tenant.full_name}</td>
                  <td>{tenant.email}</td>
                  <td>{tenant.phone}</td>
                  <td>{getUnitInfo(tenant.unit_id)}</td>
                  <td>{tenant.lease_start ? new Date(tenant.lease_start).toLocaleDateString() : 'N/A'}</td>
                  <td>{tenant.lease_end ? new Date(tenant.lease_end).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <div className="rf-table-actions">
                    {tenant.latitude && tenant.longitude ? (
                      <a
                        href={`https://www.google.com/maps?q=${tenant.latitude},${tenant.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rf-btn"
                      >
                        View Map
                      </a>
                    ) : null}
                    <button className="rf-btn" onClick={() => openPayLinkModal(tenant)}>Pay Link</button>
                    <button className="rf-btn" onClick={() => openChatLinkModal(tenant)}>Chat Link</button>
                    <button className="rf-btn" onClick={() => openInviteModal(tenant)}>Invite</button>
                    <button className="rf-btn" onClick={() => openModal(tenant)}>Edit</button>
                    <button className="rf-btn rf-btn-danger" onClick={() => handleDelete(tenant.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </AppTable>
          </AppCard>
        )}

        <AppModal
          open={payLinkModal.open}
          title={payLinkModal.tenant ? `Create Pay Link: ${payLinkModal.tenant.full_name}` : 'Create Pay Link'}
          onClose={closePayLinkModal}
          width="620px"
        >
          <form onSubmit={createPayLink} className="rf-grid">
            <div className="rf-grid cols-3">
              <input
                type="number"
                name="amount"
                placeholder="Amount (TZS)"
                min="1"
                step="0.01"
                value={payLinkForm.amount}
                onChange={(e) => setPayLinkForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
              <input
                type="number"
                name="expires_in_days"
                placeholder="Expiry (days)"
                min="1"
                max="60"
                value={payLinkForm.expires_in_days}
                onChange={(e) => setPayLinkForm((prev) => ({ ...prev, expires_in_days: e.target.value }))}
              />
              <button className="rf-btn rf-btn-primary" type="submit" disabled={payLinkLoading}>
                {payLinkLoading ? 'Creating...' : 'Create Link'}
              </button>
            </div>

            {payLinkError ? (
              <div className="rf-empty" style={{ borderColor: '#f8d7da', color: '#8a1a1a' }}>
                {payLinkError}
              </div>
            ) : null}

            {payLinkResult.url ? (
              <div className="rf-panel" style={{ background: 'var(--app-surface-2)', border: '1px solid var(--app-border)' }}>
                <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 800 }}>Public Pay Link</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input type="text" readOnly value={payLinkResult.url} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button type="button" className="rf-btn" onClick={copyPayLink}>
                      Copy Link
                    </button>
                    <a
                      className="rf-btn"
                      href={`https://wa.me/?text=${encodeURIComponent(payLinkResult.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Share WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--rf-muted)' }}>
                Tenant will open the link and pay without logging in. Link expires in up to 60 days.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="rf-btn" onClick={closePayLinkModal}>Close</button>
            </div>
          </form>
        </AppModal>

        <AppModal
          open={chatLinkModal.open}
          title={chatLinkModal.tenant ? `Create Chat Link: ${chatLinkModal.tenant.full_name}` : 'Create Chat Link'}
          onClose={closeChatLinkModal}
          width="620px"
        >
          <form onSubmit={createChatLink} className="rf-grid">
            <div className="rf-grid cols-3">
              <input
                type="number"
                name="expires_in_days"
                placeholder="Expiry (days)"
                min="1"
                max="365"
                value={chatLinkForm.expires_in_days}
                onChange={(e) => setChatLinkForm((prev) => ({ ...prev, expires_in_days: e.target.value }))}
              />
              <div />
              <button className="rf-btn rf-btn-primary" type="submit" disabled={chatLinkLoading}>
                {chatLinkLoading ? 'Creating...' : 'Create Link'}
              </button>
            </div>

            {chatLinkError ? (
              <div className="rf-empty" style={{ borderColor: '#f8d7da', color: '#8a1a1a' }}>
                {chatLinkError}
              </div>
            ) : null}

            {chatLinkResult.url ? (
              <div className="rf-panel" style={{ background: 'var(--app-surface-2)', border: '1px solid var(--app-border)' }}>
                <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 800 }}>Tenant Chat Link</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input type="text" readOnly value={chatLinkResult.url} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button type="button" className="rf-btn" onClick={copyChatLink}>
                      Copy Link
                    </button>
                    <a
                      className="rf-btn"
                      href={`https://wa.me/?text=${encodeURIComponent(chatLinkResult.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Share WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--rf-muted)' }}>
                Tenant will open this link to chat without logging in.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="rf-btn" onClick={closeChatLinkModal}>Close</button>
            </div>
          </form>
        </AppModal>

        <AppModal
          open={inviteModal.open}
          title={inviteModal.tenant ? `Invite Tenant: ${inviteModal.tenant.full_name}` : 'Invite Tenant'}
          onClose={closeInviteModal}
          width="620px"
        >
          <form onSubmit={createInvite} className="rf-grid">
            <div className="rf-grid cols-3">
              <input
                type="number"
                name="expires_in_days"
                placeholder="Expiry (days)"
                min="1"
                max="60"
                value={inviteForm.expires_in_days}
                onChange={(e) => setInviteForm((prev) => ({ ...prev, expires_in_days: e.target.value }))}
              />
              <div />
              <button className="rf-btn rf-btn-primary" type="submit" disabled={inviteLoading}>
                {inviteLoading ? 'Creating...' : 'Create Invite'}
              </button>
            </div>

            {inviteError ? (
              <div className="rf-empty" style={{ borderColor: '#f8d7da', color: '#8a1a1a' }}>
                {inviteError}
              </div>
            ) : null}

            {inviteResult.url ? (
              <div className="rf-panel" style={{ background: 'var(--app-surface-2)', border: '1px solid var(--app-border)' }}>
                <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 800 }}>Tenant Invite Link</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input type="text" readOnly value={inviteResult.url} />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button type="button" className="rf-btn" onClick={copyInviteLink}>
                      Copy Link
                    </button>
                    <a
                      className="rf-btn"
                      href={`https://wa.me/?text=${encodeURIComponent(inviteResult.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Share WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: 'var(--rf-muted)' }}>
                Tenant will open this link, set a password, and get a tenant login account.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="rf-btn" onClick={closeInviteModal}>Close</button>
            </div>
          </form>
        </AppModal>
    </>
  );
}

