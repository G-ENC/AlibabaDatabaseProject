import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p aria-busy="true">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!user.is_admin) return <article><h2>403 – Admins only</h2><p>Your account is not allowed to open this page.</p></article>;
  return children;
}
