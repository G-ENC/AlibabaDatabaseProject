import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { money } from '../utils/format.js';

export default function Cart() {
  const { user } = useAuth();
  const { items, setQuantity, remove, total } = useCart();
  const navigate = useNavigate();

  if (user?.is_admin) return <article><h2>Admins cannot place orders.</h2></article>;

  if (items.length === 0) {
    return (
      <article>
        <h2>Your cart is empty</h2>
        <Link to="/">Browse the catalog</Link>
      </article>
    );
  }

  const invalid = items.some((i) => !Number.isInteger(i.quantity) || i.quantity < i.min_order_qty || i.quantity > i.stock_quantity);

  return (
    <>
      <h1>Cart</h1>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Product</th><th>Unit price</th><th>Quantity</th><th>Subtotal</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.product_id}>
                <td><Link to={`/products/${i.product_id}`}>{i.name}</Link><div className="muted">min {i.min_order_qty} · stock {i.stock_quantity}</div></td>
                <td>{money(i.unit_price)}</td>
                <td>
                  <input type="number" style={{ width: '7rem', marginBottom: 0 }} min={i.min_order_qty} max={i.stock_quantity} value={i.quantity} onChange={(e) => setQuantity(i.product_id, Number(e.target.value))} />
                </td>
                <td>{money(i.quantity * i.unit_price)}</td>
                <td><button className="secondary" onClick={() => remove(i.product_id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th colSpan={3}>Total</th><th colSpan={2}>{money(total)}</th></tr>
          </tfoot>
        </table>
      </div>
      {invalid && <p className="error">Some quantities are below the minimum order or above the stock.</p>}
      <button disabled={invalid} onClick={() => navigate('/checkout')}>Checkout</button>
    </>
  );
}
