import { useState, useEffect, Fragment } from "react";
import axios from "../utils/axiosConfig";
import LocationPicker from "./LocationPicker";
import '../styles/stream-layout.css';
import { useNotification } from "../context/NotificationContext";
import AppCard from "./ui/AppCard";
import AppToolbar from "./ui/AppToolbar";
import AppModal from "./ui/AppModal";
import AppTable from "./ui/AppTable";

function Properties() {
  const notify = useNotification();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState("name_asc");
  const [savedSearchName, setSavedSearchName] = useState("");
  const [savedSearches, setSavedSearches] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [compareIds, setCompareIds] = useState([]);
  const [formData, setFormData] = useState({ name: "", units: "", address: "", latitude: "", longitude: "" });

  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Fetch properties
  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get("/properties", {
        headers: authHeaders,
      });
      setProperties(res.data || []);
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError(err.response?.data?.message || "Failed to load properties");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await axios.get('/properties/favorites', { headers: authHeaders });
      setFavoriteIds(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setFavoriteIds([]);
    }
  };

  const fetchSavedSearches = async () => {
    try {
      const res = await axios.get('/properties/saved-searches', { headers: authHeaders });
      setSavedSearches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching saved searches:', err);
      setSavedSearches([]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadDiscovery = async () => {
      await Promise.all([fetchProperties(), fetchFavorites(), fetchSavedSearches()]);
    };
    loadDiscovery();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openModal = (property = null) => {
    if (property) {
      setEditingProperty(property);
      setFormData({
        name: property.name || "",
        units: property.units || "",
        address: property.address || "",
        latitude: property.latitude || "",
        longitude: property.longitude || "",
      });
    } else {
      setEditingProperty(null);
      setFormData({ name: "", units: "", address: "", latitude: "", longitude: "" });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await axios.put(`/properties/${editingProperty.id}`, formData, {
          headers: authHeaders,
        });
      } else {
        await axios.post("/properties", formData, {
          headers: authHeaders,
        });
      }
      await Promise.all([fetchProperties(), fetchSavedSearches()]);
      setShowForm(false);
      setEditingProperty(null);
      setFormData({ name: "", units: "", address: "", latitude: "", longitude: "" });
      notify.success("Properties", "Property saved successfully.");
    } catch (err) {
      notify.error("Properties", err.response?.data?.message || "Error submitting form");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`/properties/${id}`, {
        headers: authHeaders,
      });
      await Promise.all([fetchProperties(), fetchSavedSearches(), fetchFavorites()]);
      notify.success("Properties", "Property deleted successfully.");
    } catch (err) {
      notify.error("Properties", err.response?.data?.message || "Error deleting property");
    }
  };

  const toggleFavorite = async (propertyId) => {
    const exists = favoriteIds.includes(propertyId);
    try {
      if (exists) {
        await axios.delete(`/properties/favorites/${propertyId}`, { headers: authHeaders });
        setFavoriteIds((prev) => prev.filter((id) => id !== propertyId));
      } else {
        await axios.post(`/properties/favorites/${propertyId}`, {}, { headers: authHeaders });
        setFavoriteIds((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      notify.error("Favorites", err.response?.data?.message || "Failed to update favorite");
    }
  };

  const toggleCompare = (propertyId) => {
    setCompareIds((prev) => {
      if (prev.includes(propertyId)) return prev.filter((id) => id !== propertyId);
      if (prev.length >= 3) {
        notify.warning("Compare", "You can compare up to 3 properties at once.");
        return prev;
      }
      return [...prev, propertyId];
    });
  };

  const searchMatchesProperty = (prop, query) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return true;
    return (
      (prop.name || "").toLowerCase().includes(q) ||
      (prop.address || "").toLowerCase().includes(q)
    );
  };

  const sortProperties = (list, currentSort) => {
    return [...list].sort((a, b) => {
      if (currentSort === "name_asc") return String(a.name || "").localeCompare(String(b.name || ""));
      if (currentSort === "name_desc") return String(b.name || "").localeCompare(String(a.name || ""));
      if (currentSort === "units_desc") return Number(b.units || 0) - Number(a.units || 0);
      if (currentSort === "units_asc") return Number(a.units || 0) - Number(b.units || 0);
      return 0;
    });
  };

  const getFilteredByConfig = (query, currentSort) => {
    const matched = properties.filter((prop) => searchMatchesProperty(prop, query));
    return sortProperties(matched, currentSort);
  };

  const saveCurrentSearch = async () => {
    const name = savedSearchName.trim() || `Search ${savedSearches.length + 1}`;
    try {
      await axios.post(
        '/properties/saved-searches',
        { name, query: searchTerm, sort_by: sortBy },
        { headers: authHeaders }
      );
      setSavedSearchName("");
      await fetchSavedSearches();
    } catch (err) {
      notify.error("Saved Search", err.response?.data?.message || "Failed to save search");
    }
  };

  const applySavedSearch = (search) => {
    setSearchTerm(search.query || "");
    setSortBy(search.sort_by || search.sortBy || "name_asc");
  };

  const deleteSavedSearch = async (id) => {
    try {
      await axios.delete(`/properties/saved-searches/${id}`, { headers: authHeaders });
      await fetchSavedSearches();
    } catch (err) {
      notify.error("Saved Search", err.response?.data?.message || "Failed to remove search");
    }
  };

  const markSearchSeen = async (id) => {
    try {
      await axios.put(`/properties/saved-searches/${id}/mark-seen`, {}, { headers: authHeaders });
      await fetchSavedSearches();
    } catch (err) {
      notify.error("Saved Search", err.response?.data?.message || "Failed to mark as seen");
    }
  };

  // Filter + sort properties
  const filteredProperties = getFilteredByConfig(searchTerm, sortBy);

  const favoriteCount = properties.filter((p) => favoriteIds.includes(p.id)).length;
  const avgUnits = properties.length
    ? (properties.reduce((sum, p) => sum + Number(p.units || 0), 0) / properties.length).toFixed(1)
    : "0.0";
  const comparedProperties = properties.filter((p) => compareIds.includes(p.id));

  const computeAreaScore = (prop) => {
    let score = 0;
    if (prop.latitude && prop.longitude) score += 30;
    score += Math.min((Number(prop.units || 0) / 20) * 30, 30);
    if ((prop.address || "").trim().length >= 10) score += 20;
    if (favoriteIds.includes(prop.id)) score += 20;
    return Math.round(score);
  };

  const topAreaProperty = [...properties].sort((a, b) => computeAreaScore(b) - computeAreaScore(a))[0];

  const recommendationBase =
    properties.find((p) => p.id === compareIds[0]) || filteredProperties[0] || properties[0] || null;

  const recommendedProperties = recommendationBase
    ? properties
        .filter((p) => p.id !== recommendationBase.id)
        .map((p) => {
          const unitDistance = Math.abs(Number(p.units || 0) - Number(recommendationBase.units || 0));
          const sameFirstAddressWord =
            String(p.address || "").split(" ")[0].toLowerCase() ===
            String(recommendationBase.address || "").split(" ")[0].toLowerCase();
          const score = Math.max(0, 100 - unitDistance * 8) + (sameFirstAddressWord ? 20 : 0);
          return { ...p, recommendationScore: Math.min(score, 100) };
        })
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, 3)
    : [];

  const savedSearchAlerts = savedSearches.map((s) => ({
    ...s,
    matchCount: Number(s.match_count || 0),
    newCount: Number(s.new_count || 0),
  }));

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      notify.warning("Geolocation", "Not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(position.coords.latitude).toFixed(7),
          longitude: Number(position.coords.longitude).toFixed(7),
        }));
      },
      () => notify.error("Geolocation", "Failed to get current location.")
    );
  };

  return (
    <>
        <section className="rf-page-hero">
          <div>
            <p className="rf-page-eyebrow">Portfolio</p>
            <h2 className="rf-page-title">Properties</h2>
            <p className="rf-page-subtitle">
              Manage listings, saved searches, comparisons, and map-ready property records from one workspace.
            </p>
          </div>
          <div className="rf-page-hero-actions">
            <button onClick={() => openModal()} className="rf-btn rf-btn-primary">+ Add Property</button>
          </div>
        </section>

        <div className="rf-stats-grid rf-stats-grid-5">
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Total Properties</div>
            <div className="rf-stat-value">{properties.length}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Saved Favorites</div>
            <div className="rf-stat-value rf-stat-rose">{favoriteCount}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Average Units</div>
            <div className="rf-stat-value rf-stat-cyan">{avgUnits}</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Compare List</div>
            <div className="rf-stat-value rf-stat-violet">{compareIds.length}/3</div>
          </AppCard>
          <AppCard className="rf-stat-card">
            <div className="rf-stat-label">Top Area Score</div>
            <div className="rf-stat-value rf-stat-green" style={{ fontSize: "18px" }}>
              {topAreaProperty ? `${topAreaProperty.name} (${computeAreaScore(topAreaProperty)}/100)` : "-"}
            </div>
          </AppCard>
        </div>

        <AppToolbar className="rf-toolbar-surface">
          <input
            type="text"
            placeholder="Search by name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rf-toolbar-input-grow"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name_asc">Sort: Name A-Z</option>
            <option value="name_desc">Sort: Name Z-A</option>
            <option value="units_desc">Sort: Units High-Low</option>
            <option value="units_asc">Sort: Units Low-High</option>
          </select>
          <button onClick={() => openModal()} className="rf-btn rf-btn-primary">
            + Add Property
          </button>
        </AppToolbar>

        <AppCard className="rf-section-card">
          <div className="rf-section-head">
            <div>
              <h3>Saved Search Alerts</h3>
              <p>Keep reusable property filters and monitor new matches.</p>
            </div>
          </div>
          <div className="rf-inline-actions" style={{ marginBottom: "12px" }}>
            <input
              type="text"
              placeholder="Saved search name (optional)"
              value={savedSearchName}
              onChange={(e) => setSavedSearchName(e.target.value)}
              style={{ minWidth: "220px" }}
            />
            <button onClick={saveCurrentSearch} className="rf-btn rf-btn-primary">
              Save Current Search
            </button>
          </div>
          {savedSearchAlerts.length === 0 ? (
            <div className="rf-empty">No saved searches yet.</div>
          ) : (
            <div className="rf-stack-list">
              {savedSearchAlerts.map((s) => (
                <div key={s.id} className="rf-list-row">
                  <div>
                    <div className="rf-list-title">{s.name}</div>
                    <div className="rf-list-meta">
                      query: "{s.query || "all"}" | matches: {s.matchCount}
                      {s.newCount > 0 ? ` | new: ${s.newCount}` : ""}
                    </div>
                  </div>
                  <div className="rf-inline-actions">
                    <button onClick={() => applySavedSearch(s)} className="rf-btn">Apply</button>
                    <button onClick={() => markSearchSeen(s.id)} className="rf-btn">Mark Seen</button>
                    <button onClick={() => deleteSavedSearch(s.id)} className="rf-btn rf-btn-danger">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppCard>

        {recommendedProperties.length > 0 && (
          <AppCard className="rf-section-card">
            <div className="rf-section-head">
              <div>
                <h3>
              Recommended Similar Properties {recommendationBase ? `(based on ${recommendationBase.name})` : ""}
                </h3>
                <p>Suggested properties based on similar size and address signals.</p>
              </div>
            </div>
            <div className="rf-grid cols-3">
              {recommendedProperties.map((p) => (
                <div key={p.id} className="rf-mini-card">
                  <div className="rf-list-title">{p.name}</div>
                  <div className="rf-list-meta">{p.address || "-"}</div>
                  <div className="rf-list-meta" style={{ marginTop: "6px" }}>Units: {p.units || 0}</div>
                  <div className="rf-list-meta" style={{ color: "var(--rf-accent)" }}>Similarity: {Math.round(p.recommendationScore)}%</div>
                </div>
              ))}
            </div>
          </AppCard>
        )}

        {comparedProperties.length >= 2 && (
          <AppCard className="rf-section-card">
            <div className="rf-section-head">
              <div>
                <h3>Property Comparison</h3>
                <p>Compare units, address coverage, and map availability.</p>
              </div>
              <button onClick={() => setCompareIds([])} className="rf-btn rf-btn-danger">Clear Compare</button>
            </div>
            <AppTable headers={['Property', 'Units', 'Address', 'Map']}>
                {comparedProperties.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.units}</td>
                    <td>{p.address || "-"}</td>
                    <td>
                      {p.latitude && p.longitude ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=16/${p.latitude}/${p.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rf-table-link"
                        >
                          Open
                        </a>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
            </AppTable>
          </AppCard>
        )}

        <AppModal open={showForm} title={editingProperty ? "Edit Property" : "Add Property"} onClose={() => setShowForm(false)} width="760px">
              <form onSubmit={handleSubmit} className="rf-grid">
                <input
                  type="text"
                  name="name"
                  placeholder="Property Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="number"
                  name="units"
                  placeholder="Number of Units"
                  value={formData.units}
                  onChange={handleChange}
                  required
                />
                <textarea
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows="3"
                />

                <div>
                  <button type="button" onClick={useCurrentLocation} className="rf-btn">
                    Use Current Location
                  </button>
                </div>

                <LocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={({ lat, lng }) =>
                    setFormData((prev) => ({
                      ...prev,
                      latitude: Number(lat).toFixed(7),
                      longitude: Number(lng).toFixed(7),
                    }))
                  }
                />

                <div className="rf-grid cols-3">
                  <input
                    type="number"
                    step="0.0000001"
                    name="latitude"
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                  />
                  <input
                    type="number"
                    step="0.0000001"
                    name="longitude"
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                  />
                  <div />
                </div>

                <div className="rf-form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="rf-btn">Cancel</button>
                  <button type="submit" className="rf-btn rf-btn-primary">{editingProperty ? "Update" : "Add"}</button>
                </div>
              </form>
        </AppModal>

        {loading && <AppCard className="rf-empty-card">Loading properties...</AppCard>}
        
        {error && (
          <div className="rf-empty rf-empty-danger">Error: {error}</div>
        )}

        {!loading && !error && properties.length === 0 && (
          <AppCard className="rf-empty-card">No properties yet. Click "Add Property" to get started.</AppCard>
        )}

        {!loading && !error && properties.length > 0 && filteredProperties.length === 0 && (
          <AppCard className="rf-empty-card">No properties match your search. Try different keywords.</AppCard>
        )}

        {!loading && !error && filteredProperties.length > 0 && (
          <AppCard className="rf-table-card">
            <AppTable headers={['Name', 'Units', 'Address', 'Saved', 'Compare', 'Area Score', 'Actions']}>
                {filteredProperties.map((prop) => (
                  <tr key={prop.id}>
                    <td>{prop.name}</td>
                    <td>{prop.units}</td>
                    <td>{prop.address}</td>
                    <td>
                      <button
                        onClick={() => toggleFavorite(prop.id)}
                        className="rf-favorite-btn"
                        title={favoriteIds.includes(prop.id) ? "Remove from favorites" : "Save as favorite"}
                      >
                        {favoriteIds.includes(prop.id) ? "★" : "☆"}
                      </button>
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={compareIds.includes(prop.id)}
                        onChange={() => toggleCompare(prop.id)}
                      />
                    </td>
                    <td>
                      <span className={`rf-status-badge ${
                        computeAreaScore(prop) >= 70 ? 'success' : computeAreaScore(prop) >= 40 ? 'warning' : 'danger'
                      }`}>
                        {computeAreaScore(prop)}/100
                      </span>
                    </td>
                    <td>
                      <div className="rf-table-actions">
                      {prop.latitude && prop.longitude ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${prop.latitude}&mlon=${prop.longitude}#map=16/${prop.latitude}/${prop.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rf-btn"
                        >
                          View Map
                        </a>
                      ) : null}
                      <button onClick={() => openModal(prop)} className="rf-btn">Edit</button>
                      <button onClick={() => handleDelete(prop.id)} className="rf-btn rf-btn-danger">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </AppTable>
          </AppCard>
        )}
    </>
  );
}

export default Properties;
