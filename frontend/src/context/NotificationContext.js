import { useState, useEffect, createContext, useContext } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (type, title, message, duration = 4000) => {
    const id = Date.now();
    const notification = { id, type, title, message };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const success = (title, message) => addNotification('success', title, message);
  const error = (title, message) => addNotification('error', title, message);
  const warning = (title, message) => addNotification('warning', title, message);
  const info = (title, message) => addNotification('info', title, message);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
    const streamUrl = `${apiBase}/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);

    es.addEventListener('notification', (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = payload.type || 'info';
        addNotification(type, payload.title || 'Notification', payload.message || '');
      } catch {
        // Ignore malformed event payload
      }
    });

    return () => es.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      success,
      error,
      warning,
      info
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  const getStyles = (type) => {
    const baseStyle = {
      padding: "16px",
      borderRadius: "8px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "10px",
      minWidth: "300px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      animation: "slideIn 0.3s ease-out"
    };

    const colors = {
      success: { bg: "#4CAF50", border: "#2e7d32" },
      error: { bg: "#f44336", border: "#c62828" },
      warning: { bg: "#FF9800", border: "#e65100" },
      info: { bg: "#2196F3", border: "#1565c0" }
    };

    return {
      ...baseStyle,
      background: colors[type]?.bg || colors.info.bg,
      borderLeft: `4px solid ${colors[type]?.border || colors.info.border}`
    };
  };

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "10000",
      maxWidth: "400px"
    }}>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(400px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }
      `}</style>
      {notifications.map(notification => (
        <div key={notification.id} style={getStyles(notification.type)}>
          <div style={{ color: "white", flex: 1 }}>
            <p style={{ margin: "0 0 4px 0", fontWeight: "bold", fontSize: "14px" }}>
              {notification.title}
            </p>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "white",
              fontSize: "20px",
              cursor: "pointer",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              marginLeft: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
