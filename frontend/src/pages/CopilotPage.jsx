import { useState } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import AppCard from '../components/ui/AppCard';
import AppToolbar from '../components/ui/AppToolbar';
import '../styles/stream-layout.css';

export default function CopilotPage() {
  const token = localStorage.getItem('token');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(
        '/copilot',
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnswer(data.answer);
      setResult(data.result);
    } catch (error) {
      setAnswer(error.response?.data?.message || 'Copilot request failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rf-page">
      <Navbar />
      <div className="rf-page-content narrow">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">AI</p>
            <h1 className="rf-page-title">AI Copilot</h1>
            <p className="rf-page-subtitle">
              Ask questions in English or Swahili about revenue, failed payments, occupancy, and portfolio trends.
            </p>
          </div>
        </section>

        <AppToolbar className="rf-toolbar-surface">
          <form onSubmit={ask} style={{ display: 'flex', gap: 10, width: '100%', flexWrap: 'wrap' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask: monthly revenue, failed payments, vacant units..."
              className="rf-toolbar-input-grow"
            />
            <button className="rf-btn rf-btn-primary" type="submit" disabled={loading}>
              {loading ? 'Thinking...' : 'Ask'}
            </button>
          </form>
        </AppToolbar>

        {answer ? (
          <AppCard className="rf-section-card">
            <div className="rf-section-head">
              <div>
                <h3>Copilot Answer</h3>
                <p>Interpreted from your portfolio data.</p>
              </div>
            </div>
            <div className="rf-list-row">
              <div className="rf-list-title">{answer}</div>
            </div>
            {result ? (
              <pre className="rf-code-block">{JSON.stringify(result, null, 2)}</pre>
            ) : null}
          </AppCard>
        ) : (
          <AppCard className="rf-empty-card">Ask a question to get started.</AppCard>
        )}
      </div>
    </div>
  );
}
