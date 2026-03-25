import { Navigate } from "react-router-dom";

const getStoredRole = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role || null;
  } catch {
    return null;
  }
};

export default function ProtectedRoute({ children, roles }) {
  const loggedIn = Boolean(localStorage.getItem("user"));
  const role = getStoredRole();

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(roles) && roles.length && role && !roles.includes(role)) {
    const fallback = role === "tenant" ? "/tenant" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
