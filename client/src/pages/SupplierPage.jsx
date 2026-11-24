import { Link, useParams } from 'react-router-dom';
import { useApi } from '../useApi.js';
import ProductCard from '../components/ProductCard.jsx';

export default function SupplierPage() {
  const { id } = useParams();
  const { data: supplier, loading, error } = useApi(`/suppliers/${id}`);

  if (loading) return <p aria-busy="true">Loading…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <p><Link to="/">← Catalog</Link></p>
      <article>
        <h1>{supplier.company_name} {supplier.verified_status && <span className="badge delivered">Verified</span>}</h1>
        <ul>
          <li>Location: {[supplier.city, supplier.country].filter(Boolean).join(', ')}</li>
          <li>Established: {supplier.year_established ?? '—'}</li>
          <li>Contact: {supplier.contact_email ?? '—'}</li>
        </ul>
      </article>
      <h2>Products</h2>
      {supplier.products.length === 0 && <p className="muted">This supplier has no products.</p>}
      <div className="product-grid">
        {supplier.products.map((p) => <ProductCard key={p.product_id} product={p} />)}
      </div>
    </>
  );
}
