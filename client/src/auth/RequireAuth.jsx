import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// Wrap a page: logged-out visitors are sent to /login and returned here afterwards.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p aria-busy="true">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}
