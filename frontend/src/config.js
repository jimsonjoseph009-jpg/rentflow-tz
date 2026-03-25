const rawBase = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export const API_BASE = rawBase.replace(/\/$/, '');
export const API_BASE_URL = `${API_BASE}/api`;
