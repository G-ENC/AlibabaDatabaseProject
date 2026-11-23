import { NavLink } from 'react-router-dom';

export default function AdminNav() {
  return (
    <nav>
      <ul>
        <li><NavLink to="/admin" end>Reports</NavLink></li>
        <li><NavLink to="/admin/products">Products</NavLink></li>
        <li><NavLink to="/admin/categories">Categories</NavLink></li>
        <li><NavLink to="/admin/suppliers">Suppliers</NavLink></li>
        <li><NavLink to="/admin/orders">Orders</NavLink></li>
        <li><NavLink to="/admin/users">Users</NavLink></li>
      </ul>
    </nav>
  );
}
