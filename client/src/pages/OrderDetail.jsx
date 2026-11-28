import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApi } from '../useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { date, money } from '../utils/format.js';

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const isBuyer = order.user_id === user.user_id && !user.is_admin;
  const canCancel = order.status === 'PENDING' || order.status === 'PAID';
  const payBalance = () => run(() => api.post(`/orders/${id}/pay-balance`));
  const cancelOwn = () => window.confirm('Cancel this order?') && run(() => api.patch(`/orders/${id}/cancel`));
  const cancelAsAdmin = () => window.confirm('Cancel this order?') && run(() => api.patch(`/orders/${id}/status`, { status: 'CANCELLED' }));
  const deleteOrder = async () => {
    if (!window.confirm(`Delete order #${order.order_id} with its items, payments and shipment? This cannot be undone.`)) return;
    setActionError('');
    try {
      await api.del(`/orders/${id}`);
      navigate('/admin/orders');
    } catch (err) {
      setActionError(err.message);
    }
  };
  const markDelivered = () => run(() => api.patch(`/orders/${id}/status`, { status: 'DELIVERED' }));
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
                <td>{money(i.price_at_order)}</td>
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
          <h3>Payments</h3>
          {order.payments.length === 0 && <p className="muted">No payment recorded.</p>}
          {order.payments.map((p) => (
            <p key={p.payment_id}>
              <strong>{p.payment_type.toLowerCase()}</strong> {money(p.amount)} by {p.method.replace('_', ' ')} on {date(p.payment_date)}
            </p>
          ))}
          <p className="muted">
            Paid {money(order.paid)}
            {order.status !== 'CANCELLED' && order.remaining > 0 && <> · Remaining <strong>{money(order.remaining)}</strong></>}
          </p>
          {isBuyer && order.status === 'PENDING' && (
            <button onClick={payBalance}>Pay balance {money(order.remaining)}</button>
          )}
        </article>
        <article>
          <h3>Shipment</h3>
          {order.shipment ? (
            <p>{order.shipment.carrier}, tracking {order.shipment.tracking_number}<br />
              {order.shipment.ship_date ? `Shipped ${date(order.shipment.ship_date)}` : 'Not shipped yet'} · <StatusBadge status={order.shipment.delivery_status} /></p>
          ) : <p className="muted">{order.status === 'PENDING' ? 'Ships after the balance is paid.' : 'Not shipped yet.'}</p>}
        </article>
      </div>

      {actionError && <p className="error">{actionError}</p>}

      {/* buyer: cancel before shipping */}
      {isBuyer && canCancel && (
        <button className="secondary" onClick={cancelOwn}>Cancel order</button>
      )}

      {/* admin: ship (only when fully paid), deliver, cancel */}
      {user.is_admin && order.status === 'PAID' && (
        <article>
          <h3>Ship this order</h3>
          {order.shipment && <p className="muted">Updates the prepared shipment and marks it in transit.</p>}
          <form onSubmit={ship} className="inline-form">
            <label>Carrier <input value={carrier} onChange={(e) => setCarrier(e.target.value)} required /></label>
            <label>Tracking number <input value={tracking} onChange={(e) => setTracking(e.target.value)} required /></label>
            <button type="submit">Create shipment</button>
          </form>
        </article>
      )}
      {user.is_admin && canCancel && <button className="secondary" onClick={cancelAsAdmin}>Cancel order</button>}
      {user.is_admin && order.status === 'SHIPPED' && <button onClick={markDelivered}>Mark as delivered</button>}
      {user.is_admin && <button className="secondary contrast" onClick={deleteOrder}>Delete order</button>}
    </>
  );
}
