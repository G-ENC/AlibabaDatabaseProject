import { Link } from 'react-router-dom';
import { money, stars } from '../utils/format.js';

export default function ProductCard({ product }) {
  return (
    <article>
      <header>
        <strong><Link to={`/products/${product.product_id}`}>{product.name}</Link></strong>
        <div className="muted">{product.category_name} · {product.supplier_name}</div>
      </header>
      <div>
        <div className="price">{money(product.unit_price)} <span className="muted">/ unit</span></div>
        <div className="muted">Min. order: {product.min_order_qty} · In stock: {product.stock_quantity}</div>
        <div className="stars" title={product.avg_rating ?? 'No ratings'}>
          {stars(product.avg_rating)} <span className="muted">({product.review_count})</span>
        </div>
      </div>
    </article>
  );
}
