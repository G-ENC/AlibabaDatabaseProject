import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApi } from '../useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { date, money } from '../utils/format.js';

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: order, loading, error, reload } = useApi(`/orders/${id}`);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [actionError, setActionError] = useState('');

  if (loading) return <p aria-busy="true">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  // Runs an API call, then refreshes the order; shows the server's error if it fails.
  const run = async (call) => {
    setActionError('');
    try {
      await call();
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const isOwner = order.user_id === user.user_id;
  const cancelOwn = () => window.confirm('Cancel this order?') && run(() => api.patch(`/orders/${id}/cancel`));
  const cancelAsAdmin = () => window.confirm('Cancel this order?') && run(() => api.patch(`/orders/${id}/status`, { status: 'cancelled' }));
  const markDelivered = () => run(() => api.patch(`/orders/${id}/status`, { status: 'delivered' }));
  const ship = (e) => {
    e.preventDefault();
    run(() => api.post(`/orders/${id}/shipment`, { carrier, tracking_number: tracking }));
  };

  return (
    <>
      <p><Link to={user.is_admin ? '/admin/orders' : '/orders'}>← Orders</Link></p>
      <h1>Order #{order.order_id} <StatusBadge status={order.status} /></h1>
      <p className="muted">
        Placed {date(order.order_date)} by {order.username}. Ship to: {order.shipping_street}, {order.shipping_city}, {order.shipping_country}
      </p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>Unit price</th><th>Quantity</th><th>Line total</th></tr></thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.product_id}>
                <td><Link to={`/products/${i.product_id}`}>{i.product_name}</Link></td>
                <td>{money(i.unit_price)}</td>
                <td>{i.quantity}</td>
                <td>{money(i.line_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><th colSpan={3}>Total</th><th>{money(order.total)}</th></tr></tfoot>
        </table>
      </div>

      <div className="grid">
        <article>
          <h3>Payment</h3>
          {order.payment ? (
            <p>{money(order.payment.amount)} by {order.payment.method.replace('_', ' ')} on {date(order.payment.payment_date)}</p>
          ) : <p className="muted">No payment recorded.</p>}
        </article>
        <article>
          <h3>Shipment</h3>
          {order.shipment ? (
            <p>{order.shipment.carrier}, tracking {order.shipment.tracking_number}<br />
              Shipped {date(order.shipment.ship_date)} · <strong>{order.shipment.delivery_status.replace('_', ' ')}</strong></p>
          ) : <p className="muted">Not shipped yet.</p>}
        </article>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      {/* buyer: cancel while still paid */}
      {isOwner && !user.is_admin && order.status === 'paid' && (
        <button className="secondary" onClick={cancelOwn}>Cancel order</button>
      )}

      {/* admin: ship, deliver, cancel */}
      {user.is_admin && order.status === 'paid' && (
        <article>
          <h3>Ship this order</h3>
          <form onSubmit={ship} className="inline-form">
            <label>Carrier <input value={carrier} onChange={(e) => setCarrier(e.target.value)} required /></label>
            <label>Tracking number <input value={tracking} onChange={(e) => setTracking(e.target.value)} required /></label>
            <button type="submit">Create shipment</button>
          </form>
          <button className="secondary" onClick={cancelAsAdmin} style={{ marginTop: '1rem' }}>Cancel order</button>
        </article>
      )}
      {user.is_admin && order.status === 'shipped' && <button onClick={markDelivered}>Mark as delivered</button>}
    </>
  );
}
