import { useEffect, useRef, useState } from 'react';
import axios from '../utils/axiosConfig';
import '../styles/stream-layout.css';

export default function TenantMessages() {
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const threadRef = useRef(thread);
  const seenIdsRef = useRef(new Set());

  const load = async () => {
    setError('');
    try {
      const res = await axios.get('/chat/tenant/messages');
      const nextThread = res.data?.thread || null;
      const nextMessages = res.data?.messages || [];
      setThread(nextThread);
      setMessages(nextMessages);
      threadRef.current = nextThread;
      seenIdsRef.current = new Set(nextMessages.map((message) => message.id).filter(Boolean));
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load messages');
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, []);

  useEffect(() => {
    threadRef.current = thread;
  }, [thread]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
    const streamUrl = `${apiBase}/api/chat/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (!payload || !payload.thread_id || !payload.id) return;
        const current = threadRef.current;
        if (!current?.id || payload.thread_id !== current.id) return;
        if (seenIdsRef.current.has(payload.id)) return;

        seenIdsRef.current.add(payload.id);
        setMessages((prev) => (prev.some((message) => message.id === payload.id) ? prev : [...prev, payload]));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
      } catch {
        // ignore
      }
    });

    return () => eventSource.close();
  }, []);

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

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !selectedFile) return;

    setUploading(true);
    setDraft('');
    setError('');
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

      const res = await axios.post('/chat/tenant/messages', {
        body: text,
        media_url: mediaData?.media_url,
        media_type: mediaData?.media_type,
      });
      if (res.data?.id) seenIdsRef.current.add(res.data.id);
      setMessages((prev) => [...prev, res.data]);
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

  return (
    <div className="rf-page">
            <main className="rf-page-content narrow">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Messages</p>
            <h1 className="rf-page-title">Tenant Messages</h1>
            <p className="rf-page-subtitle">
              {thread?.property_name ? `Property: ${thread.property_name}` : 'Chat with your landlord.'}
              {thread?.unit_number ? ` • Unit: ${thread.unit_number}` : ''}
              {thread?.landlord_name ? ` • Landlord: ${thread.landlord_name}` : ''}
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <div className="rf-neo-live-badge">
              <span className="rf-status-dot" aria-hidden="true" />
              <span>Live</span>
            </div>
          </div>
        </section>

        {error ? <div className="rf-empty rf-empty-danger" style={{ marginBottom: 12 }}>{error}</div> : null}

        <section className="rf-panel rf-reveal" style={{ '--delay': '120ms' }}>
          {loading ? (
            <div className="rf-empty">Loading conversation...</div>
          ) : (
            <>
              <div className="rf-chat-messages" style={{ height: 480 }}>
                {messages.length === 0 ? (
                  <div className="rf-empty">No messages yet. Say hello.</div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={`rf-chat-bubble ${message.sender_type === 'tenant' ? 'out' : 'in'}`}>
                      {message.media_url && (
                        <div className="rf-chat-media-wrapper">
                          {message.media_type === 'image' && (
                            <img src={message.media_url} alt="Media" className="rf-chat-img" onClick={() => window.open(message.media_url, '_blank')} />
                          )}
                          {message.media_type === 'video' && (
                            <video src={message.media_url} controls className="rf-chat-video" />
                          )}
                          {message.media_type === 'audio' && (
                            <audio src={message.media_url} controls className="rf-chat-audio" />
                          )}
                        </div>
                      )}
                      {message.body && <div className="rf-chat-body">{message.body}</div>}
                      <div className="rf-chat-time">{message.created_at ? new Date(message.created_at).toLocaleString() : ''}</div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <form className="rf-chat-compose" onSubmit={send}>
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
                  disabled={uploading}
                  style={{ padding: '8px 12px' }}
                >
                  📎
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={selectedFile ? `File: ${selectedFile.name}` : "Andika ujumbe..."}
                  disabled={uploading}
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
                  disabled={(!draft.trim() && !selectedFile) || uploading}
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
      </main>
    </div>
  );
}
