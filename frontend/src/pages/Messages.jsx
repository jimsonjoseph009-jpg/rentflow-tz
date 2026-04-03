import { useEffect, useMemo, useRef, useState } from 'react';
import axios from '../utils/axiosConfig';
import axios from '../utils/axiosConfig';
import '../styles/stream-layout.css';

export default function Messages() {
  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null); // { threadId, tenantId, tenantName }
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeRef = useRef(active);
  const seenIdsRef = useRef(new Set());
  const refreshTimerRef = useRef(null);

  const loadThreads = async () => {
    setLoadingThreads(true);
    setError('');
    try {
      const res = await axios.get('/chat/threads');
      setThreads(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load threads');
    } finally {
      setLoadingThreads(false);
    }
  };

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
    const streamUrl = `${apiBase}/api/chat/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) return;
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        loadThreads();
      }, 350);
    };

    es.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || !payload.thread_id || !payload.id) return;

        if (seenIdsRef.current.has(payload.id)) return;
        seenIdsRef.current.add(payload.id);

        const current = activeRef.current;
        if (current?.threadId && payload.thread_id === current.threadId) {
          setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
          scheduleRefresh();
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
          return;
        }

        scheduleRefresh();
      } catch {
        // ignore
      }
    });

    return () => {
      es.close();
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openTenantThread = async (tenantId, tenantName) => {
    setActive({ threadId: null, tenantId, tenantName });
    setLoadingThread(true);
    setError('');
    try {
      const res = await axios.get(`/chat/threads/tenant/${tenantId}`);
      const threadId = res.data?.thread?.id;
      setActive({ threadId, tenantId, tenantName: res.data?.thread?.tenant_name || tenantName });
      const msgs = res.data?.messages || [];
      setMessages(msgs);
      // reset seen ids to current thread content so SSE doesn't duplicate
      seenIdsRef.current = new Set(msgs.map((m) => m.id).filter(Boolean));
      setDraft('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load conversation');
    } finally {
      setLoadingThread(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert('File is too large (max 25MB)');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !selectedFile) return;
    if (!active?.threadId) return;

    setUploading(true);
    setDraft('');
    const originalFile = selectedFile;
    const originalPreview = filePreview;
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      let mediaData = null;
      if (originalFile && originalPreview) {
        const upRes = await axios.post('/chat/upload', { data_url: originalPreview });
        mediaData = upRes.data;
      }

      const res = await axios.post(`/chat/threads/${active.threadId}/messages`, {
        body: text,
        media_url: mediaData?.media_url,
        media_type: mediaData?.media_type,
      });
      if (res.data?.id) seenIdsRef.current.add(res.data.id);
      setMessages((prev) => [...prev, res.data]);
      loadThreads();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
    } catch (err) {
      setDraft(text);
      setSelectedFile(originalFile);
      setFilePreview(originalPreview);
      setError(err.response?.data?.message || err.message || 'Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const filteredThreads = useMemo(() => threads, [threads]);

  return (
    <>
        <div className="rf-row-head" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Messages</h2>
          <small style={{ color: '#5a6783' }}>Landlord and tenant chat</small>
        </div>

        {error ? (
          <div className="rf-empty" style={{ borderColor: '#f8d7da', color: '#8a1a1a', marginBottom: 12 }}>
            {error}
          </div>
        ) : null}

        <div className="rf-chat-grid">
          <section className="rf-panel rf-chat-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <h3 style={{ margin: 0 }}>Inbox</h3>
              <button className="rf-btn" onClick={loadThreads}>Refresh</button>
            </div>

            {loadingThreads ? (
              <div className="rf-empty" style={{ marginTop: 12 }}>Loading threads...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="rf-empty" style={{ marginTop: 12 }}>No conversations yet.</div>
            ) : (
              <div className="rf-chat-threadlist">
                {filteredThreads.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`rf-chat-thread ${active?.tenantId === t.tenant_id ? 'active' : ''}`}
                    onClick={() => openTenantThread(t.tenant_id, t.tenant_name)}
                  >
                    <strong>{t.tenant_name || 'Tenant'}</strong>
                    <small>{t.last_message ? t.last_message.slice(0, 80) : 'Start a conversation'}</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rf-panel rf-chat-main">
            {!active ? (
              <div className="rf-empty">Select a tenant to start chatting.</div>
            ) : loadingThread ? (
              <div className="rf-empty">Loading conversation...</div>
            ) : (
              <>
                <div className="rf-chat-header">
                  <div>
                    <h3 style={{ margin: 0 }}>{active.tenantName || 'Tenant'}</h3>
                    <small style={{ color: 'var(--rf-muted)' }}>Live updates</small>
                  </div>
                </div>

                <div className="rf-chat-messages">
                  {messages.length === 0 ? (
                    <div className="rf-empty">No messages yet. Say hello.</div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rf-chat-bubble ${m.sender_type === 'landlord' ? 'out' : 'in'}`}
                      >
                        {m.media_url && (
                          <div className="rf-chat-media-wrapper">
                            {m.media_type === 'image' && (
                              <img src={m.media_url} alt="Media" className="rf-chat-img" onClick={() => window.open(m.media_url, '_blank')} />
                            )}
                            {m.media_type === 'video' && (
                              <video src={m.media_url} controls className="rf-chat-video" />
                            )}
                            {m.media_type === 'audio' && (
                              <audio src={m.media_url} controls className="rf-chat-audio" />
                            )}
                          </div>
                        )}
                        {m.body && <div className="rf-chat-body">{m.body}</div>}
                        <div className="rf-chat-time">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <form className="rf-chat-compose" onSubmit={sendMessage}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileSelect}
                  />
                  <button
                    type="button"
                    className="rf-btn"
                    title="Attach media"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!active?.threadId || uploading}
                    style={{ padding: '8px 12px' }}
                  >
                    📎
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={selectedFile ? `File: ${selectedFile.name}` : "Type a message..."}
                    disabled={!active?.threadId || uploading}
                  />
                  {selectedFile && (
                    <button
                      type="button"
                      className="rf-btn-close"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{ marginLeft: -40, zIndex: 5, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                  <button
                    className="rf-btn rf-btn-primary"
                    type="submit"
                    disabled={(!draft.trim() && !selectedFile) || !active?.threadId || uploading}
                  >
                    {uploading ? '...' : 'Send'}
                  </button>
                </form>
                {filePreview && (
                  <div style={{ padding: '0 20px 10px', marginTop: -10 }}>
                    <div className="rf-chat-preview-box" style={{ position: 'relative', display: 'inline-block' }}>
                      {selectedFile?.type.startsWith('image/') ? (
                        <img src={filePreview} alt="Preview" style={{ maxHeight: 100, borderRadius: 8, border: '1px solid #ddd' }} />
                      ) : (
                        <div style={{ padding: '10px 15px', background: '#f0f2f5', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>🎥 {selectedFile?.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
    </>
  );
}
