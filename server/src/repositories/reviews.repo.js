import { many, one, run } from '../db.js';
import { HttpError } from '../utils/httpError.js';

const SELECT = `
  SELECT r.*, u.username
  FROM review r
  JOIN users u ON u.user_id = r.user_id`;

export async function listByProduct(productId) {
  return many(`${SELECT} WHERE r.product_id = $1 ORDER BY r.review_date DESC, r.review_id DESC`, [productId]);
}

export async function getById(id) {
  return one(`${SELECT} WHERE r.review_id = $1`, [id]);
}

export async function create({ user_id, product_id, rating, comment }) {
  // UNIQUE (user_id, product_id) also enforces this; checked first for a readable message.
  if (await one('SELECT 1 FROM review WHERE user_id = $1 AND product_id = $2', [user_id, product_id])) {
    throw new HttpError(409, 'You already reviewed this product');
  }
  const { review_id } = await one(
    'INSERT INTO review (rating, comment, user_id, product_id) VALUES ($1, $2, $3, $4) RETURNING review_id',
    [rating, comment, user_id, product_id]
  );
  return getById(review_id);
}

export async function update(id, { rating, comment }) {
  const changed = await run('UPDATE review SET rating = $2, comment = $3 WHERE review_id = $1', [id, rating, comment]);
  return changed ? getById(id) : null;
}

export async function remove(id) {
  return (await run('DELETE FROM review WHERE review_id = $1', [id])) > 0;
}
