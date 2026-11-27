import { many, one, run } from '../db.js';
import { HttpError } from '../utils/httpError.js';

// Category with its parent's name (self-join).
const SELECT = `
  SELECT c.*, parent.name AS parent_name
  FROM category c
  LEFT JOIN category parent ON parent.category_id = c.parent_id`;

export async function list() {
  return many(`${SELECT} ORDER BY c.category_id`);
}

export async function getById(id) {
  return one(`${SELECT} WHERE c.category_id = $1`, [id]);
}

export async function create({ name, description, parent_id }) {
  const { category_id } = await one(
    'INSERT INTO category (name, description, parent_id) VALUES ($1, $2, $3) RETURNING category_id',
    [name, description, parent_id]
  );
  return getById(category_id);
}

export async function update(id, { name, description, parent_id }) {
  const changed = await run(
    'UPDATE category SET name = $2, description = $3, parent_id = $4 WHERE category_id = $1',
    [id, name, description, parent_id]
  );
  return changed ? getById(id) : null;
}

export async function remove(id) {
  // product.category_id is ON DELETE RESTRICT; check first for a readable message.
  if (await one('SELECT 1 FROM product WHERE category_id = $1 LIMIT 1', [id])) {
    throw new HttpError(409, 'Category still has products');
  }
  // Sub-categories become top-level (parent_id ON DELETE SET NULL).
  return (await run('DELETE FROM category WHERE category_id = $1', [id])) > 0;
}
