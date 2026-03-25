import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from '../utils/axiosConfig';
import Navbar from '../components/Navbar';
import '../styles/stream-layout.css';

const emptyForm = {
  title: '',
  description: '',
  category: 'apartment',
  listing_type: 'rent',
  price_tzs: '',
  location: '',
  media_type: 'image',
  media_url: '',
  is_active: true,
};
const MAX_MEDIA_SIZE_MB = 20;
const categories = ['all', 'house', 'hostel', 'apartment', 'airbnb'];

export default function Marketplace() {
  const token = localStorage.getItem('token');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const [publicListings, setPublicListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('public');
  const [category, setCategory] = useState('all');
  const fileInputRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [pubRes, mineRes] = await Promise.all([
        axios.get('/marketplace/public'),
        axios.get('/marketplace/mine', { headers }),
      ]);
      setPublicListings(pubRes.data || []);
      setMyListings(mineRes.data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load marketplace data');
    }
  }, [headers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openPicker = () => fileInputRef.current?.click();

  const onFileSelected = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please choose an image or video file only.');
      return;
    }

    const maxBytes = MAX_MEDIA_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File is too large. Please choose a file smaller than ${MAX_MEDIA_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        media_type: file.type.startsWith('video/') ? 'video' : 'image',
        media_url: String(reader.result || ''),
      }));
      setError('');
    };
    reader.onerror = () => setError('Failed to read selected file.');
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, price_tzs: Number(form.price_tzs || 0) };
      if (editingId) {
        await axios.put(`/marketplace/${editingId}`, payload, { headers });
      } else {
        await axios.post('/marketplace', payload, { headers });
      }
      resetForm();
      await loadData();
    } catch (err) {
      if (err?.response?.status === 413) {
        setError('Media payload is too large. Use a smaller video/image file.');
      } else {
        setError(err?.response?.data?.message || 'Failed to save listing');
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setActiveTab('mine');
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'apartment',
      listing_type: item.listing_type || 'rent',
      price_tzs: Number(item.price_tzs || 0),
      location: item.location || '',
      media_type: item.media_type || 'image',
      media_url: item.media_url || '',
      is_active: Boolean(item.is_active),
    });
  };

  const removeListing = async (id) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      await axios.delete(`/marketplace/${id}`, { headers });
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete listing');
    }
  };

  const listings = useMemo(() => {
    const base = activeTab === 'mine' ? myListings : publicListings;
    if (category === 'all') return base;
    return base.filter((item) => item.category === category);
  }, [activeTab, myListings, publicListings, category]);

  const renderMedia = (item) => {
    if (!item.media_url) {
      return <div className="rf-movie-placeholder">No Media</div>;
    }

    if (item.media_type === 'video') {
      return (
        <video muted controls className="rf-movie-media">
          <source src={item.media_url} />
        </video>
      );
    }

    return <img src={item.media_url} alt={item.title} className="rf-movie-media" />;
  };

  return (
    <div className="rf-page">
      <Navbar />
      <main className="rf-page-content">
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Listings</p>
            <h1 className="rf-page-title">Premium Marketplace</h1>
            <p className="rf-page-subtitle">
              Streaming-style property discovery for houses, hostels, apartments, and Airbnb listings.
            </p>
          </div>
        </section>

        {error ? <div className="rf-empty" style={{ color: '#b42318', marginBottom: 12 }}>{error}</div> : null}

        <div className="rf-market-layout">
          <section className="rf-market-editor rf-market-editor-sticky">
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Listing' : 'Add New Listing'}</h3>
            <form onSubmit={onSubmit} className="rf-market-form-grid">
              <input name="title" value={form.title} onChange={onChange} placeholder="Title" required />
              <input name="location" value={form.location} onChange={onChange} placeholder="Location" />
              <select name="category" value={form.category} onChange={onChange}>
                <option value="house">House</option>
                <option value="hostel">Hostel</option>
                <option value="apartment">Apartment</option>
                <option value="airbnb">Airbnb</option>
              </select>
              <select name="listing_type" value={form.listing_type} onChange={onChange}>
                <option value="rent">Rent</option>
                <option value="sale">Sale</option>
                <option value="short_stay">Short Stay</option>
              </select>
              <input name="price_tzs" type="number" value={form.price_tzs} onChange={onChange} placeholder="Price (TZS)" />
              <select name="media_type" value={form.media_type} onChange={onChange}>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
              <input name="media_url" value={form.media_url} onChange={onChange} placeholder="Media URL (optional)" />

              <div className="rf-market-upload" style={{ gridColumn: '1 / -1' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={onFileSelected}
                  style={{ display: 'none' }}
                />
                <button className="rf-btn" type="button" onClick={openPicker}>Chagua Picha/Video</button>
                <small style={{ color: '#5a6783' }}>Inafungua folders moja kwa moja.</small>
              </div>

              {form.media_url ? (
                <div className="rf-market-preview" style={{ gridColumn: '1 / -1' }}>
                  {form.media_type === 'video' ? (
                    <video controls>
                      <source src={form.media_url} />
                    </video>
                  ) : (
                    <img src={form.media_url} alt="Listing preview" />
                  )}
                </div>
              ) : null}

              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                placeholder="Description"
                style={{ gridColumn: '1 / -1', minHeight: 80 }}
              />
              <label style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} /> Active listing
              </label>
              <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1', flexWrap: 'wrap' }}>
                <button className="rf-btn rf-btn-primary" disabled={saving} type="submit">
                  {saving ? 'Saving...' : editingId ? 'Update Listing' : 'Add Listing'}
                </button>
                {editingId ? <button className="rf-btn" type="button" onClick={resetForm}>Cancel</button> : null}
              </div>
            </form>
          </section>

          <section>
            <div className="rf-movie-toolbar">
              <div className="rf-movie-tabs">
                <button className={`rf-btn ${activeTab === 'public' ? 'rf-btn-primary' : ''}`} onClick={() => setActiveTab('public')}>
                  Public Feed
                </button>
                <button className={`rf-btn ${activeTab === 'mine' ? 'rf-btn-primary' : ''}`} onClick={() => setActiveTab('mine')}>
                  My Listings
                </button>
              </div>
              <div className="rf-movie-cats">
                {categories.map((item) => (
                  <button
                    key={item}
                    className={`rf-btn ${category === item ? 'rf-btn-primary' : ''}`}
                    onClick={() => setCategory(item)}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {listings.length === 0 ? (
              <div className="rf-empty">No listings in this view yet.</div>
            ) : (
              <div className="rf-movie-grid">
                {listings.map((item) => (
                  <article key={`${activeTab}-${item.id}`} className="rf-movie-card">
                    <div className="rf-movie-frame">{renderMedia(item)}</div>
                    <div className="rf-movie-overlay">
                      <h3>{item.title}</h3>
                      <p>{item.category} • {item.listing_type}</p>
                      <p>{Number(item.price_tzs || 0).toLocaleString()} TZS</p>
                      <small>{item.location || 'Tanzania'}</small>
                      {activeTab === 'mine' ? (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button className="rf-btn" onClick={() => startEdit(item)}>Edit</button>
                          <button className="rf-btn" onClick={() => removeListing(item.id)} style={{ color: '#b42318', borderColor: '#f3c7cc' }}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
