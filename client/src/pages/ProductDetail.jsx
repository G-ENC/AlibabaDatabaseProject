import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../useApi.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import Reviews from '../components/Reviews.jsx';
import { money, stars } from '../utils/format.js';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const { data: product, loading, error } = useApi(`/products/${id}`);
  const { data: reviews, reload: reloadReviews } = useApi(`/products/${id}/reviews`);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');

  if (loading) return <p aria-busy="true">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  const qty = quantity === '' ? product.min_order_qty : Number(quantity);

  const addToCart = (e) => {
    e.preventDefault();
    if (!Number.isInteger(qty) || qty < product.min_order_qty) {
      return setMessage(`Minimum order is ${product.min_order_qty}.`);
    }
    if (qty > product.stock_quantity) return setMessage(`Only ${product.stock_quantity} in stock.`);
    cart.add(product, qty);
    setMessage(`Added ${qty} to the cart.`);
  };

  return (
    <>
      <p><Link to="/">← Catalog</Link></p>
      <article>
        <h1>{product.name}</h1>
        <p>{product.description}</p>
        <p className="price">{money(product.unit_price)} <span className="muted">/ unit</span></p>
        <p>
          <span className="stars">{stars(product.avg_rating)}</span>{' '}
          <span className="muted">{product.avg_rating ?? '–'} ({product.review_count} reviews)</span>
        </p>
        <ul>
          <li>Category: {product.category_name}</li>
          <li>Supplier: <Link to={`/suppliers/${product.supplier_id}`}>{product.supplier_name}</Link></li>
          <li>Minimum order: {product.min_order_qty} units</li>
          <li>In stock: {product.stock_quantity} units</li>
        </ul>

        {!user?.is_admin && (
          <form onSubmit={addToCart} className="inline-form">
            <label>
              Quantity
              <input type="number" min={product.min_order_qty} max={product.stock_quantity} placeholder={product.min_order_qty} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
            <button type="submit">Add to cart</button>
            {message && <button type="button" className="secondary" onClick={() => navigate('/cart')}>Go to cart</button>}
          </form>
        )}
        {message && <p className="muted">{message}</p>}
      </article>

      <Reviews productId={product.product_id} reviews={reviews ?? []} reload={reloadReviews} />
    </>
  );
}
