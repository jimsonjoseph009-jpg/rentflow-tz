import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';

export default function VoiceNotes() {
  const notify = useNotification();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'inspection',
    audio_url: '',
    transcription: '',
    created_at: new Date().toISOString().slice(0, 10)
  });
  const [editId, setEditId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [localAudioPreview, setLocalAudioPreview] = useState('');
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/voice-notes', { headers: { Authorization: `Bearer ${token}` } });
        setNotes(res.data || []);
      } catch (err) {
        console.error('Error:', err);
      }
      setLoading(false);
    };
    loadData();
  }, [token]);

  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop?.();
      } catch {}
      if (mediaStreamRef.current) {
        for (const t of mediaStreamRef.current.getTracks()) t.stop();
      }
      if (localAudioPreview) URL.revokeObjectURL(localAudioPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/voice-notes/${editId}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Voice Notes', 'Updated.');
      } else {
        await axios.post('/voice-notes', formData, { headers: { Authorization: `Bearer ${token}` } });
        notify.success('Voice Notes', 'Saved.');
      }
      const res = await axios.get('/voice-notes', { headers: { Authorization: `Bearer ${token}` } });
      setNotes(res.data || []);
      setFormData({ title: '', category: 'inspection', audio_url: '', transcription: '', created_at: new Date().toISOString().slice(0, 10) });
      setEditId(null);
      setShowForm(false);
      setIsRecording(false);
      if (localAudioPreview) URL.revokeObjectURL(localAudioPreview);
      setLocalAudioPreview('');
    } catch (err) {
      notify.error('Voice Notes', err.response?.data?.message || 'Error');
    }
  };

  const handleEdit = (note) => {
    setFormData({
      title: note.title,
      category: note.category,
      audio_url: note.audio_url || '',
      transcription: note.transcription || '',
      created_at: note.created_at
    });
    setEditId(note.id);
    setShowForm(true);
    if (localAudioPreview) URL.revokeObjectURL(localAudioPreview);
    setLocalAudioPreview('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Confirm?')) return;
    try {
      await axios.delete(`/voice-notes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setNotes(notes.filter(n => n.id !== id));
    } catch (err) {
      notify.error('Voice Notes', err.response?.data?.message || 'Error');
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        notify.error('Voice Notes', 'Recording not supported on this browser.');
        return;
      }

      if (localAudioPreview) URL.revokeObjectURL(localAudioPreview);
      setLocalAudioPreview('');
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav',
      ];
      const mimeType = preferredTypes.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setLocalAudioPreview(url);

          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Failed to read audio'));
            reader.readAsDataURL(blob);
          });

          const uploadRes = await axios.post('/voice-notes/upload-audio', { dataUrl });
          const audioUrl = uploadRes.data?.audio_url || '';
          if (audioUrl) {
            setFormData((prev) => ({ ...prev, audio_url: audioUrl }));
            notify.success('Voice Notes', 'Recording uploaded.');
          } else {
            notify.error('Voice Notes', 'Upload failed: missing audio_url');
          }
        } catch (err) {
          notify.error('Voice Notes', err.response?.data?.message || err.message || 'Failed to upload recording');
        } finally {
          if (mediaStreamRef.current) {
            for (const t of mediaStreamRef.current.getTracks()) t.stop();
            mediaStreamRef.current = null;
          }
        }
      };

      recorder.start();
      setIsRecording(true);
      notify.info('Voice Notes', 'Recording started.');
    } catch (err) {
      notify.error('Voice Notes', err.message || 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop?.();
      setIsRecording(false);
    } catch (err) {
      notify.error('Voice Notes', err.message || 'Failed to stop recording');
    }
  };

  return (
    <div className="rf-shell">
      <Navbar />
      <main className="rf-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold" }}>Voice Notes</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setFormData({ title: '', category: 'inspection', audio_url: '', transcription: '', created_at: new Date().toISOString().slice(0, 10) });
              setIsRecording(false);
              if (localAudioPreview) URL.revokeObjectURL(localAudioPreview);
              setLocalAudioPreview('');
            }}
            style={{ padding: "10px 20px", background: showForm ? "#f44336" : "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            {showForm ? "Cancel" : "+ New Note"}
          </button>
        </div>

        {showForm && (
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
            <form onSubmit={handleSubmit}>
              <input type="text" name="title" placeholder="Note Title" value={formData.title} onChange={handleInputChange} required style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                <select name="category" value={formData.category} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
                  <option value="inspection">Inspection</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="tenant">Tenant</option>
                  <option value="general">General</option>
                </select>
                <input type="date" name="created_at" value={formData.created_at} onChange={handleInputChange} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }} />
              </div>
              <div style={{ background: "#f0f0f0", padding: "15px", borderRadius: "5px", marginBottom: "15px", textAlign: "center" }}>
                <p style={{ margin: "0 0 10px 0", color: "#666" }}>Recording Controls</p>
                <button type="button" onClick={isRecording ? stopRecording : startRecording} style={{ padding: "10px 20px", background: isRecording ? "#f44336" : "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </button>
                {(formData.audio_url || localAudioPreview) ? (
                  <div style={{ marginTop: 12 }}>
                    <audio controls src={formData.audio_url || localAudioPreview} style={{ width: "100%" }} />
                    <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 12 }}>
                      {formData.audio_url ? 'Saved audio URL attached to this note.' : 'Preview (not yet saved).'}
                    </p>
                  </div>
                ) : null}
              </div>
              <textarea name="transcription" placeholder="Transcription or notes..." value={formData.transcription} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", minHeight: "100px", marginBottom: "15px" }} />
              <input type="text" name="audio_url" placeholder="Audio file URL (optional)" value={formData.audio_url} onChange={handleInputChange} style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "5px", marginBottom: "15px" }} />
              <button type="submit" style={{ width: "100%", padding: "12px", background: "#667eea", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
                {editId ? 'Update' : 'Save Note'}
              </button>
            </form>
          </div>
        )}

        {loading ? <p>Loading...</p> : (
          <div style={{ background: "white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: "15px", textAlign: "left" }}>Title</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Category</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Audio</th>
                  <th style={{ padding: "15px", textAlign: "left" }}>Transcription</th>
                  <th style={{ padding: "15px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "#999" }}>No notes</td></tr>
                ) : (
                  notes.map(note => (
                    <tr key={note.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "15px" }}>{note.title}</td>
                      <td style={{ padding: "15px" }}>{note.category}</td>
                      <td style={{ padding: "15px" }}>{new Date(note.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "15px" }}>
                        {note.audio_url ? (
                          <audio controls src={note.audio_url} style={{ width: 220 }} />
                        ) : (
                          <span style={{ color: "#999" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "15px" }}>{note.transcription ? note.transcription.substring(0, 50) + '...' : '-'}</td>
                      <td style={{ padding: "15px", textAlign: "center" }}>
                        <button onClick={() => handleEdit(note)} style={{ padding: "6px 12px", background: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", marginRight: "8px" }}>Edit</button>
                        <button onClick={() => handleDelete(note.id)} style={{ padding: "6px 12px", background: "#f44336", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
