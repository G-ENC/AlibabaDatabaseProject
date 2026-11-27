import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../useApi.js';
import AdminNav from '../../components/AdminNav.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { date, money } from '../../utils/format.js';

export default function AdminOrders() {
  const [status, setStatus] = useState('');
  const { data: orders, loading, error } = useApi(`/orders${status ? `?status=${status}` : ''}`);

  return (
    <>
      <AdminNav />
      <h1>All orders</h1>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="SHIPPED">Shipped</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </label>
      {loading && <p aria-busy="true">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {orders && orders.length === 0 && <p className="muted">No orders.</p>}
      {orders && orders.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Date</th><th>Buyer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td><Link to={`/orders/${o.order_id}`}>#{o.order_id}</Link></td>
                  <td>{date(o.order_date)}</td>
                  <td>{o.username}</td>
                  <td>{o.item_count}</td>
                  <td>{money(o.total)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
