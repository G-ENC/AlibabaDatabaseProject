import { db, nextId } from '../data/mockData.js';
import { HttpError } from '../utils/httpError.js';

const withUsername = (r) => ({
  ...r,
  username: db.users.find((u) => u.user_id === r.user_id)?.username ?? null,
});

export async function listByProduct(productId) {
  return db.reviews
    .filter((r) => r.product_id === productId)
    .sort((a, b) => b.review_date.localeCompare(a.review_date))
    .map(withUsername);
}

export async function getById(id) {
  const r = db.reviews.find((x) => x.review_id === id);
  return r ? withUsername(r) : null;
}

export async function create({ user_id, product_id, rating, comment }) {
  if (db.reviews.some((r) => r.user_id === user_id && r.product_id === product_id)) {
    throw new HttpError(409, 'You already reviewed this product');
  }
  const review = { review_id: nextId('reviews', 'review_id'), rating, comment, review_date: new Date().toISOString(), user_id, product_id };
  db.reviews.push(review);
  return withUsername(review);
}

export async function update(id, { rating, comment }) {
  const r = db.reviews.find((x) => x.review_id === id);
  if (!r) return null;
  r.rating = rating;
  r.comment = comment;
  return withUsername(r);
}

export async function remove(id) {
  const index = db.reviews.findIndex((r) => r.review_id === id);
  if (index === -1) return false;
  db.reviews.splice(index, 1);
  return true;
}
