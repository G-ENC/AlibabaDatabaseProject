import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from '../cart/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items, clear } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    clear(); // do not leave one person's cart for the next login
    navigate('/');
  };

  return (
    <nav className="container top">
      <ul>
        <li><Link to="/" className="brand">Alibaba</Link></li>
      </ul>
      <ul>
        <li><NavLink to="/">Catalog</NavLink></li>
        {user && !user.is_admin && <li><NavLink to="/cart">Cart ({items.length})</NavLink></li>}
        {user && !user.is_admin && <li><NavLink to="/orders">My orders</NavLink></li>}
        {user?.is_admin && <li><NavLink to="/admin">Admin</NavLink></li>}
        {user ? (
          <>
            <li className="muted">{user.username}{user.is_admin ? ' (admin)' : ''}</li>
            <li><a href="#logout" onClick={(e) => { e.preventDefault(); handleLogout(); }}>Logout</a></li>
          </>
        ) : (
          <>
            <li><NavLink to="/login">Login</NavLink></li>
            <li><NavLink to="/register">Register</NavLink></li>
          </>
        )}
      </ul>
    </nav>
  );
}
