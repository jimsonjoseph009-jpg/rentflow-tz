import Messages from './Messages';
import TenantMessages from './TenantMessages';

const getStoredRole = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw)?.role || null;
  } catch {
    return null;
  }
};

export default function MessagesGate() {
  const role = getStoredRole();
  return role === 'tenant' ? <TenantMessages /> : <Messages />;
}

