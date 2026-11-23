import { Link } from 'react-router-dom';
import { useApi } from '../useApi.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { date, money } from '../utils/format.js';

export default function Orders() {
  const { data: orders, loading, error } = useApi('/orders/mine');

  return (
    <>
      <h1>My orders</h1>
      {loading && <p aria-busy="true">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {orders && orders.length === 0 && <p className="muted">Nothing here yet. <Link to="/">Browse the catalog</Link></p>}
      {orders && orders.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_id}>
                  <td><Link to={`/orders/${o.order_id}`}>#{o.order_id}</Link></td>
                  <td>{date(o.order_date)}</td>
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
