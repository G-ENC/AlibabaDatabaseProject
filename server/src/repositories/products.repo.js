import { many, one, run } from '../db.js';
import { HttpError } from '../utils/httpError.js';

// Product with supplier name, category name and review stats (JOIN + LEFT JOIN + AVG/COUNT).
const SELECT = `
  SELECT p.*,
         s.company_name            AS supplier_name,
         c.name                    AS category_name,
         ROUND(AVG(r.rating), 1)   AS avg_rating,
         COUNT(r.review_id)        AS review_count
  FROM product p
  JOIN supplier s     ON s.supplier_id = p.supplier_id
  JOIN category c     ON c.category_id = p.category_id
  LEFT JOIN review r  ON r.product_id  = p.product_id`;
const GROUP = 'GROUP BY p.product_id, s.company_name, c.name';

export async function list({ search, categoryId, supplierId } = {}) {
  const where = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
  }
  if (categoryId) {
    // The category plus all its sub-categories (so "Electronics" also shows smartphones).
    params.push(categoryId);
    where.push(`p.category_id IN (
      WITH RECURSIVE tree AS (
        SELECT category_id FROM category WHERE category_id = $${params.length}
        UNION ALL
        SELECT c2.category_id FROM category c2 JOIN tree t ON c2.parent_id = t.category_id
      )
      SELECT category_id FROM tree)`);
  }
  if (supplierId) {
    params.push(supplierId);
    where.push(`p.supplier_id = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return many(`${SELECT} ${whereSql} ${GROUP} ORDER BY p.product_id`, params);
}

export async function getById(id) {
  return one(`${SELECT} WHERE p.product_id = $1 ${GROUP}`, [id]);
}

export async function create(p) {
  const { product_id } = await one(
    `INSERT INTO product (name, description, unit_price, stock_quantity, min_order_qty, supplier_id, category_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING product_id`,
    [p.name, p.description, p.unit_price, p.stock_quantity, p.min_order_qty, p.supplier_id, p.category_id]
  );
  return getById(product_id);
}

export async function update(id, p) {
  const changed = await run(
    `UPDATE product
     SET name = $2, description = $3, unit_price = $4, stock_quantity = $5, min_order_qty = $6, supplier_id = $7, category_id = $8
     WHERE product_id = $1`,
    [id, p.name, p.description, p.unit_price, p.stock_quantity, p.min_order_qty, p.supplier_id, p.category_id]
  );
  return changed ? getById(id) : null;
}

export async function hasOrders(id) {
  return Boolean(await one('SELECT 1 FROM order_item WHERE product_id = $1 LIMIT 1', [id]));
}

export async function remove(id) {
  // order_item.product_id is ON DELETE RESTRICT; check first for a readable message.
  if (await hasOrders(id)) throw new HttpError(409, 'Product appears in orders and cannot be deleted');
  // Its reviews are removed by ON DELETE CASCADE.
  return (await run('DELETE FROM product WHERE product_id = $1', [id])) > 0;
}
