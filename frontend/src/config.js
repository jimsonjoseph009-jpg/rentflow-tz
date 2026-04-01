// In production (Vercel), we must use a relative path so requests are proxied same-origin.
// This avoids cross-origin cookie issues.
const isProduction = process.env.NODE_ENV === 'production' || (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
const rawBase = isProduction ? '' : (process.env.REACT_APP_API_BASE || 'http://localhost:5000');

export const API_BASE = rawBase.replace(/\/$/, '');
export const API_BASE_URL = `${API_BASE}/api`;


