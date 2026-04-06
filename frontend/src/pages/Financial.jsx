import { useEffect, useMemo, useState } from 'react';
import axios from '../utils/axiosConfig';
import AppCard from '../components/ui/AppCard';
import AppModal from '../components/ui/AppModal';
import AppTable from '../components/ui/AppTable';
import '../styles/stream-layout.css';

const categories = ['maintenance', 'utilities', 'repairs', 'cleaning', 'security', 'insurance', 'other'];

export default function Financial() {
  const token = localStorage.getItem('token');
  const [expenses, setExpenses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showMethodForm, setShowMethodForm] = useState(false);
  const [methodFormData, setMethodFormData] = useState({ provider_name: 'M-Pesa', account_name: '', account_number: '', instructions: '' });
  const [earnings, setEarnings] = useState({
    total_rent_collected: 0,
    monthly_revenue: 0,
    tenant_payment_status: [],
  });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'maintenance',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const storedExpenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        setExpenses(storedExpenses);

        const totalExpenses = storedExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        setStats({ totalExpenses });

        const earningsRes = await axios.get('/payments/earnings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEarnings(
          earningsRes.data || {
            total_rent_collected: 0,
            monthly_revenue: 0,
            tenant_payment_status: [],
          }
        );

        const methodsRes = await axios.get('/payment-methods', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPaymentMethods(methodsRes.data || []);
      } catch (err) {
        console.error('Error fetching financial data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleAddExpense = (event) => {
    event.preventDefault();
    const newExpense = {
      id: Date.now(),
      ...formData,
      amount: parseFloat(formData.amount),
    };

    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));

    setStats((prev) => ({
      ...prev,
      totalExpenses: (prev.totalExpenses || 0) + newExpense.amount,
    }));

    setFormData({
      description: '',
      amount: '',
      category: 'maintenance',
      date: new Date().toISOString().split('T')[0],
    });
    setShowForm(false);
  };

  const handleDeleteExpense = (id) => {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) return;

    const updatedExpenses = expenses.filter((item) => item.id !== id);
    setExpenses(updatedExpenses);
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));

    setStats((prev) => ({
      ...prev,
      totalExpenses: (prev.totalExpenses || 0) - expense.amount,
    }));
  };

  const handleAddMethod = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/payment-methods', methodFormData, { headers: { Authorization: `Bearer ${token}` } });
      const methodsRes = await axios.get('/payment-methods', { headers: { Authorization: `Bearer ${token}` } });
      setPaymentMethods(methodsRes.data || []);
      setShowMethodForm(false);
      setMethodFormData({ provider_name: 'M-Pesa', account_name: '', account_number: '', instructions: '' });
    } catch (err) {
      console.error('Error adding method');
    }
  };

  const handleDeleteMethod = async (id) => {
    if (!window.confirm('Delete this payment method?')) return;
    try {
      await axios.delete(`/payment-methods/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const categoryBreakdown = useMemo(
    () =>
      categories.map((category) => ({
        category,
        total: expenses
          .filter((expense) => expense.category === category)
          .reduce((sum, expense) => sum + parseFloat(expense.amount), 0),
      })),
    [expenses]
  );

  const expensesThisMonth = expenses
    .filter((expense) => new Date(expense.date).getMonth() === new Date().getMonth())
    .reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="rf-page">
      
      <div className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Money</p>
            <h1 className="rf-page-title">Financial Tracking</h1>
            <p className="rf-page-subtitle">
              Review rent performance, record internal expenses, and keep tenant payment visibility in one place.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <button onClick={() => setShowForm(true)} className="rf-btn rf-btn-primary">+ Add Expense</button>
          </div>
        </section>

        <AppModal open={showForm} title="Add Expense" onClose={() => setShowForm(false)} width="720px">
          <form onSubmit={handleAddExpense} className="rf-grid">
            <div className="rf-grid cols-3">
              <input
                type="text"
                placeholder="Expense description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                required
              />
              <input
                type="number"
                placeholder="Amount (TZS)"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                required
                step="0.01"
              />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <select
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
            <div className="rf-form-actions">
              <button type="button" className="rf-btn" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="rf-btn rf-btn-primary">Save Expense</button>
            </div>
          </form>
        </AppModal>

        <AppModal open={showMethodForm} title="Add Payment Method" onClose={() => setShowMethodForm(false)} width="500px">
          <form onSubmit={handleAddMethod} className="rf-grid">
            <select
              value={methodFormData.provider_name}
              onChange={(e) => setMethodFormData((prev) => ({ ...prev, provider_name: e.target.value }))}
              required
            >
              <option value="M-Pesa">M-Pesa</option>
              <option value="Tigo Pesa">Tigo Pesa</option>
              <option value="Airtel Money">Airtel Money</option>
              <option value="Halopesa">Halopesa</option>
              <option value="CRDB Bank">CRDB Bank</option>
              <option value="NMB Bank">NMB Bank</option>
            </select>
            <input
              type="text"
              placeholder="Account Name (e.g., Juma M."
              value={methodFormData.account_name}
              onChange={(e) => setMethodFormData((prev) => ({ ...prev, account_name: e.target.value }))}
              required
            />
            <input
              type="text"
              placeholder="Account/Till Number (e.g. 555666)"
              value={methodFormData.account_number}
              onChange={(e) => setMethodFormData((prev) => ({ ...prev, account_number: e.target.value }))}
              required
            />
            <textarea
              placeholder="Any special instructions for the tenant?"
              value={methodFormData.instructions}
              onChange={(e) => setMethodFormData((prev) => ({ ...prev, instructions: e.target.value }))}
            />
            <div className="rf-form-actions">
              <button type="button" className="rf-btn" onClick={() => setShowMethodForm(false)}>Cancel</button>
              <button type="submit" className="rf-btn rf-btn-primary">Save Method</button>
            </div>
          </form>
        </AppModal>

        {loading ? (
          <AppCard className="rf-empty-card">Loading financial data...</AppCard>
        ) : (
          <>
            <div className="rf-stats-grid">
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Total Rent Collected</div>
                <div className="rf-stat-value rf-stat-green">
                  {Number(earnings.total_rent_collected || 0).toLocaleString()} TZS
                </div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Monthly Revenue</div>
                <div className="rf-stat-value rf-stat-cyan">
                  {Number(earnings.monthly_revenue || 0).toLocaleString()} TZS
                </div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Total Expenses</div>
                <div className="rf-stat-value rf-stat-rose">
                  {Number(stats.totalExpenses || 0).toLocaleString()} TZS
                </div>
              </AppCard>
              <AppCard className="rf-stat-card">
                <div className="rf-stat-label">Expenses This Month</div>
                <div className="rf-stat-value rf-stat-amber">
                  {expensesThisMonth.toLocaleString()} TZS
                </div>
              </AppCard>
            </div>

            <div className="rf-grid cols-3" style={{ marginBottom: 16 }}>
              <AppCard className="rf-section-card">
                <div className="rf-section-head">
                  <div>
                    <h3>Expense Breakdown</h3>
                    <p>Spend by category.</p>
                  </div>
                </div>
                <div className="rf-stack-list">
                  {categoryBreakdown.map((item) => (
                    <div key={item.category} className="rf-list-row">
                      <div className="rf-list-title">{item.category.toUpperCase()}</div>
                      <div className="rf-list-meta">{item.total.toLocaleString()} TZS</div>
                      <div className="rf-meter"><span style={{ width: `${Math.min((item.total / Math.max(Number(stats.totalExpenses || 0), 1)) * 100, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              </AppCard>

              <AppCard className="rf-section-card" style={{ gridColumn: 'span 2' }}>
                <div className="rf-section-head">
                  <div>
                    <h3>Tenant Payment Status</h3>
                    <p>Latest payment activity by tenant.</p>
                  </div>
                </div>
                {earnings.tenant_payment_status?.length ? (
                  <AppTable headers={['Tenant', 'Last Status', 'Last Payment']}>
                    {earnings.tenant_payment_status.map((item) => (
                      <tr key={item.tenant_id}>
                        <td>{item.tenant_name}</td>
                        <td>
                          <span className={`rf-status-badge ${
                            item.last_payment_status === 'completed' ? 'success' : item.last_payment_status === 'pending' ? 'warning' : 'danger'
                          }`}>
                            {item.last_payment_status || 'pending'}
                          </span>
                        </td>
                        <td>{item.last_payment_date ? new Date(item.last_payment_date).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </AppTable>
                ) : (
                  <div className="rf-empty">No tenant payment activity yet.</div>
                )}
              </AppCard>
            </div>

            <AppCard className="rf-section-card" style={{ marginBottom: 16 }}>
              <div className="rf-section-head">
                <div>
                  <h3>Direct Payment Methods</h3>
                  <p>Bank and Mobile accounts tenants can use to pay you rent directly.</p>
                </div>
                <div className="rf-section-actions">
                  <button onClick={() => setShowMethodForm(true)} className="rf-btn">+ Add Method</button>
                </div>
              </div>
              {paymentMethods.length === 0 ? (
                <div className="rf-empty">No direct payment methods active. Tenants won't be able to pay via the platform.</div>
              ) : (
                <AppTable headers={['Provider', 'Account Name', 'Number', 'Actions']}>
                  {paymentMethods.map((method) => (
                    <tr key={method.id}>
                      <td><span className="rf-status-badge cyan">{method.provider_name}</span></td>
                      <td>{method.account_name}</td>
                      <td>{method.account_number}</td>
                      <td>
                        <button className="rf-btn rf-btn-danger" onClick={() => handleDeleteMethod(method.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </AppTable>
              )}
            </AppCard>

            <AppCard className="rf-section-card">
              <div className="rf-section-head">
                <div>
                  <h3>Recent Expenses</h3>
                  <p>Latest expense entries recorded locally.</p>
                </div>
              </div>
              {expenses.length === 0 ? (
                <div className="rf-empty">No expenses recorded yet.</div>
              ) : (
                <AppTable headers={['Date', 'Description', 'Category', 'Amount', 'Action']}>
                  {[...expenses].reverse().map((expense) => (
                    <tr key={expense.id}>
                      <td>{new Date(expense.date).toLocaleDateString()}</td>
                      <td>{expense.description}</td>
                      <td><span className="rf-status-badge warning">{expense.category}</span></td>
                      <td>{Number(expense.amount || 0).toLocaleString()} TZS</td>
                      <td>
                        <div className="rf-table-actions">
                          <button className="rf-btn rf-btn-danger" onClick={() => handleDeleteExpense(expense.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </AppTable>
              )}
            </AppCard>
          </>
        )}
      </div>
    </div>
  );
}
