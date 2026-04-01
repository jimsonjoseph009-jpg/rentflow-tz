// In production on Vercel, use a relative path so requests are proxied same-origin.
// In development, fall back to the local backend.
const rawBase = process.env.REACT_APP_API_BASE || '';

export const API_BASE = rawBase.replace(/\/$/, '');
export const API_BASE_URL = `${API_BASE}/api`;

