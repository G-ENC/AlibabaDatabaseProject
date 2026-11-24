import { db, nextId } from '../data/mockData.js';
import { HttpError } from '../utils/httpError.js';
import { pick } from '../utils/validate.js';

const FIELDS = ['name', 'description', 'unit_price', 'stock_quantity', 'min_order_qty', 'supplier_id', 'category_id'];

// Adds supplier name, category name and review stats (a JOIN + AVG once the DB exists).
function withJoins(p) {
  const reviews = db.reviews.filter((r) => r.product_id === p.product_id);
  const sum = reviews.reduce((total, r) => total + r.rating, 0);
  return {
    ...p,
    supplier_name: db.suppliers.find((s) => s.supplier_id === p.supplier_id)?.company_name ?? null,
    category_name: db.categories.find((c) => c.category_id === p.category_id)?.name ?? null,
    avg_rating: reviews.length ? Math.round((sum / reviews.length) * 10) / 10 : null,
    review_count: reviews.length,
  };
}

// A category plus all its sub-categories (so "Electronics" also shows smartphones).
function categoryAndDescendants(id) {
  const ids = [id];
  for (const child of db.categories.filter((c) => c.parent_id === id)) {
    ids.push(...categoryAndDescendants(child.category_id));
  }
  return ids;
}

export async function list({ search, categoryId, supplierId } = {}) {
  let rows = db.products;
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
  }
  if (categoryId) {
    const ids = categoryAndDescendants(categoryId);
    rows = rows.filter((p) => ids.includes(p.category_id));
  }
  if (supplierId) rows = rows.filter((p) => p.supplier_id === supplierId);
  return rows.map(withJoins);
}

export async function getById(id) {
  const p = db.products.find((x) => x.product_id === id);
  return p ? withJoins(p) : null;
}

export async function create(data) {
  const product = { product_id: nextId('products', 'product_id'), description: null, created_at: new Date().toISOString(), ...pick(data, FIELDS) };
  db.products.push(product);
  return withJoins(product);
}

export async function update(id, data) {
  const p = db.products.find((x) => x.product_id === id);
  if (!p) return null;
  Object.assign(p, pick(data, FIELDS));
  return withJoins(p);
}

export async function hasOrders(id) {
  return db.order_items.some((i) => i.product_id === id);
}

export async function remove(id) {
  const index = db.products.findIndex((p) => p.product_id === id);
  if (index === -1) return false;
  if (await hasOrders(id)) throw new HttpError(409, 'Product appears in orders and cannot be deleted');
  db.reviews = db.reviews.filter((r) => r.product_id !== id); // reviews are deleted with the product
  db.products.splice(index, 1);
  return true;
}
