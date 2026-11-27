import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { money } from '../utils/format.js';

export default function Checkout() {
  const { user } = useAuth();
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ shipping_street: '', shipping_city: '', shipping_country: '', method: 'card' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const placed = useRef(false);

  if (!placed.current && (user?.is_admin || items.length === 0)) return <Navigate to="/cart" replace />;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const order = await api.post('/orders', {
        ...form,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      placed.current = true; // stops the "empty cart" redirect below firing when the cart is cleared
      clear();
      navigate(`/orders/${order.order_id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Checkout</h1>
      <p>{items.length} product(s), total <strong>{money(total)}</strong></p>
      <form onSubmit={submit}>
        <label>Street <input value={form.shipping_street} onChange={set('shipping_street')} required /></label>
        <div className="grid">
          <label>City <input value={form.shipping_city} onChange={set('shipping_city')} required /></label>
          <label>Country <input value={form.shipping_country} onChange={set('shipping_country')} required /></label>
        </div>
        <label>
          Payment method
          <select value={form.method} onChange={set('method')}>
            <option value="card">Credit card</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </label>
        <p className="muted">
          You pay a 30% deposit now and the remaining balance later from the order page.
          Payment is simulated: no real card details are collected.
        </p>
        {error && <p className="error">{error}</p>}
        <button type="submit" aria-busy={busy} disabled={busy}>Pay deposit {money(Math.round(total * 30) / 100)}</button>
      </form>
    </>
  );
}
