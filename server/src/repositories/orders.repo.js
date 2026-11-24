import { db, nextId } from '../data/mockData.js';
import { HttpError } from '../utils/httpError.js';
import { round2 } from '../utils/validate.js';

// Status changes allowed through setStatus. "shipped" is reached only by creating a shipment.
const TRANSITIONS = {
  paid: ['cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const itemsOf = (orderId) => db.order_items.filter((i) => i.order_id === orderId);
const totalOf = (orderId) => round2(itemsOf(orderId).reduce((sum, i) => sum + i.quantity * i.unit_price, 0));

// Short form used in lists (the total is computed, never stored).
function summary(order) {
  return {
    order_id: order.order_id,
    order_date: order.order_date,
    status: order.status,
    user_id: order.user_id,
    username: db.users.find((u) => u.user_id === order.user_id)?.username ?? null,
    item_count: itemsOf(order.order_id).length,
    total: totalOf(order.order_id),
  };
}

// Full form: order + items + payment + shipment.
function full(order) {
  const items = itemsOf(order.order_id).map((i) => ({
    ...i,
    product_name: db.products.find((p) => p.product_id === i.product_id)?.name ?? null,
    line_total: round2(i.quantity * i.unit_price),
  }));
  return {
    ...summary(order),
    shipping_street: order.shipping_street,
    shipping_city: order.shipping_city,
    shipping_country: order.shipping_country,
    items,
    payment: db.payments.find((p) => p.order_id === order.order_id) ?? null,
    shipment: db.shipments.find((s) => s.order_id === order.order_id) ?? null,
  };
}

// Checks stock and minimum order quantity, then creates order + items + payment and reduces stock.
// With the database this whole function becomes ONE transaction.
export async function createOrder({ userId, items, shipping, method }) {
  const wanted = new Map(); // product_id -> quantity (duplicates merged)
  for (const item of items) {
    wanted.set(item.product_id, (wanted.get(item.product_id) ?? 0) + item.quantity);
  }

  // Validate everything first, change nothing until all checks pass.
  const lines = [];
  for (const [productId, quantity] of wanted) {
    const product = db.products.find((p) => p.product_id === productId);
    if (!product) throw new HttpError(404, `Product ${productId} not found`);
    if (quantity < product.min_order_qty) {
      throw new HttpError(400, `${product.name}: minimum order is ${product.min_order_qty}`);
    }
    if (quantity > product.stock_quantity) {
      throw new HttpError(400, `${product.name}: only ${product.stock_quantity} in stock`);
    }
    lines.push({ product, quantity });
  }

  const order = {
    order_id: nextId('orders', 'order_id'),
    order_date: new Date().toISOString(),
    status: 'paid',
    shipping_street: shipping.street,
    shipping_city: shipping.city,
    shipping_country: shipping.country,
    user_id: userId,
  };
  db.orders.push(order);

  for (const { product, quantity } of lines) {
    // unit_price is copied so later price changes do not alter old orders.
    db.order_items.push({ order_id: order.order_id, product_id: product.product_id, quantity, unit_price: product.unit_price });
    product.stock_quantity -= quantity;
  }

  db.payments.push({
    payment_id: nextId('payments', 'payment_id'),
    amount: totalOf(order.order_id),
    payment_date: order.order_date,
    method,
    payment_type: 'full',
    order_id: order.order_id,
  });

  return full(order);
}

export async function listByUser(userId) {
  return db.orders
    .filter((o) => o.user_id === userId)
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
    .map(summary);
}

export async function listAll({ status } = {}) {
  return db.orders
    .filter((o) => !status || o.status === status)
    .sort((a, b) => b.order_date.localeCompare(a.order_date))
    .map(summary);
}

export async function getById(id) {
  const order = db.orders.find((o) => o.order_id === id);
  return order ? full(order) : null;
}

export async function setStatus(id, newStatus) {
  const order = db.orders.find((o) => o.order_id === id);
  if (!order) return null;
  if (!(TRANSITIONS[order.status] ?? []).includes(newStatus)) {
    throw new HttpError(409, `Cannot change an order from "${order.status}" to "${newStatus}"`);
  }
  if (newStatus === 'cancelled') {
    for (const item of itemsOf(id)) {
      db.products.find((p) => p.product_id === item.product_id).stock_quantity += item.quantity; // put stock back
    }
  }
  if (newStatus === 'delivered') {
    const shipment = db.shipments.find((s) => s.order_id === id);
    if (shipment) shipment.delivery_status = 'delivered';
  }
  order.status = newStatus;
  return full(order);
}

// Creates the shipment and moves the order from "paid" to "shipped".
export async function createShipment(orderId, { carrier, tracking_number }) {
  const order = db.orders.find((o) => o.order_id === orderId);
  if (!order) return null;
  if (order.status !== 'paid') throw new HttpError(409, `Only paid orders can be shipped (this one is "${order.status}")`);
  if (db.shipments.some((s) => s.order_id === orderId)) throw new HttpError(409, 'Order already has a shipment');
  db.shipments.push({
    shipment_id: nextId('shipments', 'shipment_id'),
    carrier,
    tracking_number,
    ship_date: new Date().toISOString(),
    delivery_status: 'in_transit',
    order_id: orderId,
  });
  order.status = 'shipped';
  return full(order);
}
