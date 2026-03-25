import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../utils/axiosConfig';
import '../styles/stream-layout.css';

export default function PublicChat() {
  const { token } = useParams();
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

  const load = async () => {
    if (!token) return;
    setError('');
    try {
      const res = await axios.get(`/chat/public/${token}`);
      setThread(res.data?.thread || null);
      setMessages(res.data?.messages || []);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load chat');
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
        // Shared upload endpoint (public) - send token in header for authorization
        const upRes = await axios.post('/chat/upload', 
          { data_url: originalPreview },
          { headers: { 'x-chat-token': token } }
        );
        mediaData = upRes.data;
      }

      const res = await axios.post(`/chat/public/${token}/messages`, {
        body: text,
        media_url: mediaData?.media_url,
        media_type: mediaData?.media_type,
      });
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
      <main className="rf-page-content narrow" style={{ paddingTop: 34 }}>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Secure Link</p>
            <h1 className="rf-page-title" style={{ marginBottom: 10 }}>Messages</h1>
            <p className="rf-page-subtitle">
              {thread?.property_name ? `Property: ${thread.property_name}` : 'Chat with your landlord.'}
              {thread?.tenant_name ? ` • Tenant: ${thread.tenant_name}` : ''}
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <div className="rf-neo-live-badge">
              <span className="rf-status-dot" aria-hidden="true" />
              <span>Secure</span>
            </div>
          </div>
        </section>

        <section className="rf-panel rf-reveal" style={{ '--delay': '120ms' }}>
          {loading ? (
            <div className="rf-empty">Loading chat...</div>
          ) : error ? (
            <div className="rf-empty" style={{ borderColor: '#f8d7da', color: '#8a1a1a' }}>
              {error}
            </div>
          ) : (
            <>
              <div className="rf-chat-messages" style={{ height: 460 }}>
                {messages.length === 0 ? (
                  <div className="rf-empty">No messages yet. Say hello.</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`rf-chat-bubble ${m.sender_type === 'tenant' ? 'out' : 'in'}`}>
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
                <button className="rf-btn rf-btn-primary" type="submit" disabled={(!draft.trim() && !selectedFile) || uploading}>
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
