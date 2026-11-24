import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { requireFields, toInt, toNumber } from '../utils/validate.js';
import * as orders from '../repositories/orders.repo.js';

const router = Router();
const METHODS = ['card', 'bank_transfer'];
const STATUSES = ['paid', 'shipped', 'delivered', 'cancelled'];

// Loads an order; only its owner or an admin may see it.
async function loadVisibleOrder(req) {
  const order = await orders.getById(toInt(req.params.id));
  if (!order) throw new HttpError(404, 'Order not found');
  if (order.user_id !== req.user.user_id && !req.user.is_admin) throw new HttpError(403, 'This is not your order');
  return order;
}

// Place an order (normal users only).
router.post('/orders', requireAuth, async (req, res) => {
  if (req.user.is_admin) throw new HttpError(403, 'Admins cannot place orders');
  const body = req.body ?? {};
  requireFields(body, ['shipping_street', 'shipping_city', 'shipping_country', 'method']);
  if (!METHODS.includes(body.method)) throw new HttpError(400, `method must be one of: ${METHODS.join(', ')}`);
  if (!Array.isArray(body.items) || body.items.length === 0) throw new HttpError(400, 'Order must contain at least one item');

  const items = body.items.map((item) => ({
    product_id: toInt(item?.product_id, 'product_id'),
    quantity: toNumber(item?.quantity, 'quantity', { min: 1, integer: true }),
  }));

  const order = await orders.createOrder({
    userId: req.user.user_id,
    items,
    shipping: {
      street: String(body.shipping_street).trim(),
      city: String(body.shipping_city).trim(),
      country: String(body.shipping_country).trim(),
    },
    method: body.method,
  });
  res.status(201).json(order);
});

// Must come before '/orders/:id' so "mine" is not read as an id.
router.get('/orders/mine', requireAuth, async (req, res) => {
  res.json(await orders.listByUser(req.user.user_id));
});

router.get('/orders', requireAuth, requireAdmin, async (req, res) => {
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) throw new HttpError(400, `status must be one of: ${STATUSES.join(', ')}`);
  res.json(await orders.listAll({ status }));
});

router.get('/orders/:id', requireAuth, async (req, res) => {
  res.json(await loadVisibleOrder(req));
});

// The owner cancels their own order while it is still "paid".
router.patch('/orders/:id/cancel', requireAuth, async (req, res) => {
  const order = await loadVisibleOrder(req);
  if (order.user_id !== req.user.user_id) throw new HttpError(403, 'Only the buyer can cancel here');
  res.json(await orders.setStatus(order.order_id, 'cancelled'));
});

// Admin: paid -> cancelled, shipped -> delivered.
router.patch('/orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const status = req.body?.status;
  if (!STATUSES.includes(status)) throw new HttpError(400, `status must be one of: ${STATUSES.join(', ')}`);
  const updated = await orders.setStatus(toInt(req.params.id), status);
  if (!updated) throw new HttpError(404, 'Order not found');
  res.json(updated);
});

// Admin: create the shipment (order becomes "shipped").
router.post('/orders/:id/shipment', requireAuth, requireAdmin, async (req, res) => {
  requireFields(req.body, ['carrier', 'tracking_number']);
  const updated = await orders.createShipment(toInt(req.params.id), {
    carrier: String(req.body.carrier).trim(),
    tracking_number: String(req.body.tracking_number).trim(),
  });
  if (!updated) throw new HttpError(404, 'Order not found');
  res.status(201).json(updated);
});

export default router;
