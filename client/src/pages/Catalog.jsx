import { useState } from 'react';
import { useApi } from '../useApi.js';
import ProductCard from '../components/ProductCard.jsx';

export default function Catalog() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [applied, setApplied] = useState({ search: '', category: '' }); // changes only on submit

  const params = new URLSearchParams();
  if (applied.search) params.set('search', applied.search);
  if (applied.category) params.set('category', applied.category);

  const { data: categories } = useApi('/categories');
  const { data: products, loading, error } = useApi(`/products?${params}`);

  const submit = (e) => {
    e.preventDefault();
    setApplied({ search, category });
  };
  const reset = () => {
    setSearch('');
    setCategory('');
    setApplied({ search: '', category: '' });
  };

  return (
    <>
      <h1>Wholesale catalog</h1>
      <form onSubmit={submit} className="filters">
        <input type="search" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.category_id} value={c.category_id}>{c.parent_name ? `${c.parent_name} › ` : ''}{c.name}</option>
          ))}
        </select>
        <div className="row-actions">
          <button type="submit">Search</button>
          <button type="button" className="secondary" onClick={reset}>Reset</button>
        </div>
      </form>

      {loading && <p aria-busy="true">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {products && products.length === 0 && <p className="muted">No products found.</p>}
      <div className="product-grid">
        {products?.map((p) => <ProductCard key={p.product_id} product={p} />)}
      </div>
    </>
  );
}
