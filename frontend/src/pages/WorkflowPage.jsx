import { useEffect, useState } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import '../styles/stream-layout.css';

const defaultRule = {
  name: '',
  event_type: 'payment_failed',
  conditions: '{"amount":{"gte":100000}}',
  actions: '[{"type":"notification","title":"Payment Alert","message":"Payment failed for {{tenant_name}}"}]',
};

export default function WorkflowPage() {
  const token = localStorage.getItem('token');
  const [rules, setRules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(defaultRule);

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    const [rulesRes, runsRes, templatesRes] = await Promise.all([
      axios.get('/workflows', { headers }),
      axios.get('/workflows/runs/list', { headers }),
      axios.get('/workflow-templates', { headers }),
    ]);
    setRules(rulesRes.data || []);
    setRuns(runsRes.data || []);
    setTemplates(templatesRes.data || []);
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createRule = async (event) => {
    event.preventDefault();
    await axios.post(
      '/workflows',
      {
        name: form.name,
        event_type: form.event_type,
        conditions: JSON.parse(form.conditions || '{}'),
        actions: JSON.parse(form.actions || '[]'),
        is_active: true,
      },
      { headers }
    );
    setForm(defaultRule);
    await load();
  };

  const triggerTest = async () => {
    await axios.post(
      '/workflows/trigger-test',
      {
        event_type: 'payment_failed',
        payload: { tenant_name: 'Test Tenant', amount: 200000, tenant_phone: '255700000000' },
      },
      { headers }
    );
    await load();
  };

  const applyTemplate = async (template) => {
    await axios.post('/workflows/from-template', template, { headers });
    await load();
  };

  return (
    <div className="rf-page">
      <Navbar />
      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Automation</p>
            <h1 className="rf-page-title">Workflow Automation</h1>
            <p className="rf-page-subtitle">
              Build event-based rules, reuse templates, and inspect recent workflow runs from a single control room.
            </p>
          </div>
        </section>

        <AppCard className="rf-section-card">
          <div className="rf-section-head">
            <div>
              <h3>Create Workflow Rule</h3>
              <p>Use JSON conditions and actions to automate responses.</p>
            </div>
          </div>
          <form onSubmit={createRule} className="rf-grid">
            <input placeholder="Rule name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <select value={form.event_type} onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value }))}>
              <option value="payment_failed">payment_failed</option>
              <option value="payment_success">payment_success</option>
              <option value="maintenance_created">maintenance_created</option>
              <option value="maintenance_updated">maintenance_updated</option>
            </select>
            <textarea rows={3} value={form.conditions} onChange={(e) => setForm((p) => ({ ...p, conditions: e.target.value }))} />
            <textarea rows={4} value={form.actions} onChange={(e) => setForm((p) => ({ ...p, actions: e.target.value }))} />
            <div className="rf-form-actions">
              <button className="rf-btn rf-btn-primary" type="submit">Create Workflow Rule</button>
            </div>
          </form>
        </AppCard>

        <AppToolbar className="rf-toolbar-surface">
          <button className="rf-btn" onClick={triggerTest}>Trigger Test Event</button>
          <button className="rf-btn" onClick={load}>Refresh</button>
        </AppToolbar>

        <div className="rf-grid cols-3">
          <AppCard className="rf-section-card">
            <div className="rf-section-head">
              <div>
                <h3>Templates</h3>
                <p>Start from reusable setups.</p>
              </div>
            </div>
            <div className="rf-stack-list">
              {templates.map((template) => (
                <div key={template.id} className="rf-list-row">
                  <div className="rf-list-title">{template.name}</div>
                  <div className="rf-list-meta">Event: {template.event_type}</div>
                  <div className="rf-form-actions">
                    <button className="rf-btn" onClick={() => applyTemplate(template)}>Use Template</button>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>

          <AppCard className="rf-section-card">
            <div className="rf-section-head">
              <div>
                <h3>Rules</h3>
                <p>Current workflow rules.</p>
              </div>
            </div>
            <pre className="rf-code-block">{JSON.stringify(rules, null, 2)}</pre>
          </AppCard>

          <AppCard className="rf-section-card">
            <div className="rf-section-head">
              <div>
                <h3>Recent Runs</h3>
                <p>Latest workflow execution records.</p>
              </div>
            </div>
            <pre className="rf-code-block">{JSON.stringify(runs, null, 2)}</pre>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
