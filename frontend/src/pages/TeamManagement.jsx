import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';
import '../styles/stream-layout.css';

const emptyForm = {
  full_name: '',
  email: '',
  role: 'manager',
  status: 'invited',
};

export default function TeamManagement() {
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const loadMembers = useCallback(async () => {
    try {
      const res = await axios.get('/team-members', { headers });
      setMembers(res.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load team members');
    }
  }, [headers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/team-members/${editingId}`, form, { headers });
      } else {
        await axios.post('/team-members', form, { headers });
      }
      setForm(emptyForm);
      setEditingId(null);
      await loadMembers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save member');
    }
  };

  const startEdit = (member) => {
    setEditingId(member.id);
    setForm({
      full_name: member.full_name || '',
      email: member.email || '',
      role: member.role || 'manager',
      status: member.status || 'invited',
    });
  };

  const removeMember = async (id) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await axios.delete(`/team-members/${id}`, { headers });
      await loadMembers();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to remove member');
    }
  };

  return (
    <div className="rf-page">
            <main className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Team</p>
            <h1 className="rf-page-title">Multi-user Management</h1>
            <p className="rf-page-subtitle">Add managers, accountants, viewers, and support users for your rental operations.</p>
          </div>
        </section>

        {error ? <div className="rf-empty rf-empty-danger" style={{ marginBottom: 12 }}>{error}</div> : null}

        <section className="rf-section-card" style={{ marginBottom: 18 }}>
          <div className="rf-section-head">
            <div>
              <h3>{editingId ? 'Edit Team Member' : 'Add Team Member'}</h3>
              <p>Create and manage operational team access.</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="rf-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            <input name="full_name" value={form.full_name} onChange={onChange} placeholder="Full name" required />
            <input name="email" value={form.email} onChange={onChange} placeholder="Email" required />
            <select name="role" value={form.role} onChange={onChange}>
              <option value="manager">Manager</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">Viewer</option>
              <option value="support">Support</option>
            </select>
            <select name="status" value={form.status} onChange={onChange}>
              <option value="invited">Invited</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="rf-form-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="rf-btn rf-btn-primary" type="submit">
                {editingId ? 'Update Member' : 'Add Member'}
              </button>
              {editingId ? (
                <button className="rf-btn" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rf-row">
          <div className="rf-row-head">
            <h2 style={{ margin: 0 }}>Team Members</h2>
            <small style={{ color: '#5a6783' }}>{members.length} member(s)</small>
          </div>
          {members.length === 0 ? (
            <div className="rf-empty">No team members yet.</div>
          ) : (
            <div className="rf-carousel">
              {members.map((member) => (
                <article key={member.id} className="rf-card" style={{ minWidth: 280 }}>
                  <h3 className="rf-card-title">{member.full_name}</h3>
                  <p className="rf-card-meta">{member.email}</p>
                  <p className="rf-card-meta">Role: {member.role}</p>
                  <p className="rf-card-meta">Status: {member.status}</p>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="rf-btn" onClick={() => startEdit(member)}>Edit</button>
                    <button className="rf-btn" onClick={() => removeMember(member.id)} style={{ color: '#b42318', borderColor: '#f3c7cc' }}>
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
