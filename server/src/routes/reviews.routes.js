import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { optionalText, toInt, toNumber } from '../utils/validate.js';
import * as reviews from '../repositories/reviews.repo.js';
import * as products from '../repositories/products.repo.js';

const router = Router();

function parseReview(body) {
  const rating = toNumber(body?.rating, 'rating', { min: 1, integer: true });
  if (rating > 5) throw new HttpError(400, 'rating must be between 1 and 5');
  return { rating, comment: optionalText(body?.comment) };
}

router.get('/products/:id/reviews', async (req, res) => {
  const productId = toInt(req.params.id);
  if (!(await products.getById(productId))) throw new HttpError(404, 'Product not found');
  res.json(await reviews.listByProduct(productId));
});

// Only normal users write reviews (admins can only delete them).
router.post('/products/:id/reviews', requireAuth, async (req, res) => {
  if (req.user.is_admin) throw new HttpError(403, 'Admins cannot write reviews');
  const productId = toInt(req.params.id);
  if (!(await products.getById(productId))) throw new HttpError(404, 'Product not found');
  const review = await reviews.create({ user_id: req.user.user_id, product_id: productId, ...parseReview(req.body) });
  res.status(201).json(review);
});

router.put('/reviews/:id', requireAuth, async (req, res) => {
  const id = toInt(req.params.id);
  const existing = await reviews.getById(id);
  if (!existing) throw new HttpError(404, 'Review not found');
  if (existing.user_id !== req.user.user_id) throw new HttpError(403, 'You can only edit your own review');
  res.json(await reviews.update(id, parseReview(req.body)));
});

// Owner or admin.
router.delete('/reviews/:id', requireAuth, async (req, res) => {
  const id = toInt(req.params.id);
  const existing = await reviews.getById(id);
  if (!existing) throw new HttpError(404, 'Review not found');
  if (existing.user_id !== req.user.user_id && !req.user.is_admin) {
    throw new HttpError(403, 'You can only delete your own review');
  }
  await reviews.remove(id);
  res.status(204).end();
});

export default router;
