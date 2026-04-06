import { useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

export default function PropertyMedia() {
  const { isDark } = useTheme();
  const notify = useNotification();
  const token = localStorage.getItem("token");
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaType, setMediaType] = useState('photo');

  const bgColor = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardColor = isDark ? '#2a2a2a' : 'white';
  const textColor = isDark ? '#e0e0e0' : '#333';
  const borderColor = isDark ? '#444' : '#ddd';
  const inputBg = isDark ? '#333' : '#f9f9f9';

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await axios.get('/properties', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProperties(response.data || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [token]);

  useEffect(() => {
    if (selectedProperty) {
      // Load media from localStorage
      const storedMedia = JSON.parse(localStorage.getItem(`media_${selectedProperty}`) || '[]');
      setMedia(storedMedia);
    }
  }, [selectedProperty]);

  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedProperty) {
      notify.warning('Media', 'Please select a property and file.');
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const newMedia = {
          id: Date.now(),
          name: selectedFile.name,
          type: mediaType,
          data: reader.result,
          uploadDate: new Date().toLocaleDateString(),
          size: (selectedFile.size / 1024).toFixed(2) + ' KB'
        };

        const updatedMedia = [...media, newMedia];
        setMedia(updatedMedia);
        localStorage.setItem(`media_${selectedProperty}`, JSON.stringify(updatedMedia));
        
        setSelectedFile(null);
        setMediaType('photo');
        document.getElementById('fileInput').value = '';
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      console.error('Error uploading file:', err);
      notify.error('Media', 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = (id) => {
    const updatedMedia = media.filter(m => m.id !== id);
    setMedia(updatedMedia);
    localStorage.setItem(`media_${selectedProperty}`, JSON.stringify(updatedMedia));
  };

  const handleDownload = (media) => {
    const link = document.createElement('a');
    link.href = media.data;
    link.download = media.name;
    link.click();
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    return '📎';
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div style={{
      background: cardColor,
      padding: "20px",
      borderRadius: "10px",
      boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
      flex: "1",
      minWidth: "200px",
      border: `2px solid ${color}20`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: textColor + '99', fontSize: "12px", marginBottom: "8px", textTransform: "uppercase" }}>
            {title}
          </p>
          <p style={{ fontSize: "28px", fontWeight: "bold", color: color }}>{value}</p>
        </div>
        <div style={{ fontSize: "32px" }}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bgColor }}>
            
      <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "30px", color: textColor }}>
          📸 Property Media Gallery
        </h1>

        {loading ? (
          <p style={{ textAlign: "center", color: textColor + '99' }}>Loading properties...</p>
        ) : (
          <>
            {/* Property Selector */}
            <div style={{
              background: cardColor,
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "30px",
              boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <label style={{
                display: "block",
                marginBottom: "10px",
                color: textColor,
                fontWeight: "bold",
                fontSize: "16px"
              }}>
                Select Property
              </label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  border: `1px solid ${borderColor}`,
                  borderRadius: "5px",
                  background: inputBg,
                  color: textColor,
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
              >
                <option value="">Choose a property...</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>{prop.name}</option>
                ))}
              </select>
            </div>

            {selectedProperty && (
              <>
                {/* Summary Stats */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "40px"
                }}>
                  <StatCard
                    title="Total Files"
                    value={media.length}
                    icon="📁"
                    color="#667eea"
                  />
                  <StatCard
                    title="Photos"
                    value={media.filter(m => m.type === 'photo').length}
                    icon="🖼️"
                    color="#2196F3"
                  />
                  <StatCard
                    title="Documents"
                    value={media.filter(m => m.type === 'document').length}
                    icon="📄"
                    color="#FF9800"
                  />
                </div>

                {/* Upload Form */}
                <div style={{
                  background: cardColor,
                  padding: "20px",
                  borderRadius: "10px",
                  marginBottom: "30px",
                  boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                  <h3 style={{ color: textColor, marginBottom: "15px", fontSize: "18px", fontWeight: "bold" }}>
                    Upload New File
                  </h3>
                  <form onSubmit={handleUpload}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: textColor, fontWeight: "bold" }}>
                          File Type
                        </label>
                        <select
                          value={mediaType}
                          onChange={(e) => setMediaType(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: `1px solid ${borderColor}`,
                            borderRadius: "5px",
                            background: inputBg,
                            color: textColor
                          }}
                        >
                          <option value="photo">Photo</option>
                          <option value="document">Document</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: textColor, fontWeight: "bold" }}>
                          Select File
                        </label>
                        <input
                          id="fileInput"
                          type="file"
                          onChange={handleFileSelect}
                          style={{
                            width: "100%",
                            padding: "10px",
                            border: `1px solid ${borderColor}`,
                            borderRadius: "5px",
                            background: inputBg,
                            color: textColor
                          }}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={uploading}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: uploading ? "#999" : "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: uploading ? "not-allowed" : "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      {uploading ? "Uploading..." : "Upload File"}
                    </button>
                  </form>
                </div>

                {/* Media Gallery */}
                <div style={{
                  background: cardColor,
                  borderRadius: "10px",
                  padding: "20px",
                  boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)"
                }}>
                  <h3 style={{ color: textColor, marginBottom: "20px", fontSize: "18px", fontWeight: "bold" }}>
                    Media Files
                  </h3>
                  {media.length === 0 ? (
                    <p style={{ color: textColor + '99', textAlign: "center", padding: "40px 0" }}>
                      No files uploaded yet. Upload your first file above.
                    </p>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                      gap: "15px"
                    }}>
                      {media.map(item => (
                        <div key={item.id} style={{
                          background: isDark ? '#333' : '#f9f9f9',
                          borderRadius: "8px",
                          padding: "15px",
                          border: `1px solid ${borderColor}`
                        }}>
                          <div style={{ textAlign: "center", marginBottom: "15px" }}>
                            {item.type === 'photo' && item.data.startsWith('data:image') ? (
                              <img
                                src={item.data}
                                alt={item.name}
                                style={{
                                  maxWidth: "100%",
                                  maxHeight: "150px",
                                  borderRadius: "5px",
                                  objectFit: "cover"
                                }}
                              />
                            ) : (
                              <div style={{
                                fontSize: "48px",
                                height: "150px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}>
                                {getFileIcon(item.name)}
                              </div>
                            )}
                          </div>
                          <p style={{ color: textColor, fontSize: "14px", fontWeight: "bold", margin: "0 0 5px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.name}
                          </p>
                          <p style={{ color: textColor + '99', fontSize: "12px", margin: "0 0 8px 0" }}>
                            {item.size} • {item.uploadDate}
                          </p>
                          <p style={{
                            color: item.type === 'photo' ? '#2196F3' : '#FF9800',
                            fontSize: "11px",
                            fontWeight: "bold",
                            margin: "0 0 12px 0",
                            textTransform: "uppercase"
                          }}>
                            {item.type}
                          </p>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleDownload(item)}
                              style={{
                                flex: 1,
                                padding: "8px",
                                background: "#2196F3",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold"
                              }}
                            >
                              Download
                            </button>
                            <button
                              onClick={() => handleDeleteMedia(item.id)}
                              style={{
                                flex: 1,
                                padding: "8px",
                                background: "#f44336",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold"
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {!selectedProperty && (
              <div style={{
                background: cardColor,
                padding: "40px",
                borderRadius: "10px",
                textAlign: "center",
                color: textColor + '99',
                boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                Select a property above to view and manage its media
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
