import { many, one, run, withTransaction } from '../db.js';
import { HttpError } from '../utils/httpError.js';
import { round2 } from '../utils/validate.js';

// Share of the total paid at checkout; the rest is the BALANCE, paid before shipping.
export const DEPOSIT_RATE = 0.3;

// Order life cycle:
//   checkout          -> PENDING   (DEPOSIT payment)
//   payBalance        -> PAID      (BALANCE payment)
//   createShipment    -> SHIPPED   (shipment PREPARING/new -> IN_TRANSIT)
//   setStatus         -> DELIVERED (from SHIPPED) or CANCELLED (from PENDING / PAID)
const TRANSITIONS = {
  PENDING: ['CANCELLED'],
  PAID: ['CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Order with buyer name, item count and total. The total comes from the order_total VIEW (never stored).
const SELECT = `
  SELECT o.*,
         u.username,
         (SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.order_id) AS item_count,
         COALESCE(t.total_amount, 0) AS total
  FROM orders o
  JOIN users u            ON u.user_id  = o.user_id
  LEFT JOIN order_total t ON t.order_id = o.order_id`;

const NEWEST_FIRST = 'ORDER BY o.order_date DESC, o.order_id DESC';

export async function listByUser(userId) {
  return many(`${SELECT} WHERE o.user_id = $1 ${NEWEST_FIRST}`, [userId]);
}

export async function listAll({ status } = {}) {
  return status ? many(`${SELECT} WHERE o.status = $1 ${NEWEST_FIRST}`, [status]) : many(`${SELECT} ${NEWEST_FIRST}`);
}

// Full form: order + items + payments + shipment.
export async function getById(id) {
  const order = await one(`${SELECT} WHERE o.order_id = $1`, [id]);
  if (!order) return null;

  const items = await many(
    `SELECT oi.*, p.name AS product_name, oi.quantity * oi.price_at_order AS line_total
     FROM order_item oi
     JOIN product p ON p.product_id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY p.name`,
    [id]
  );
  const payments = await many('SELECT * FROM payment WHERE order_id = $1 ORDER BY payment_id', [id]);
  const shipment = await one('SELECT * FROM shipment WHERE order_id = $1', [id]);
  const paid = round2(payments.reduce((sum, p) => sum + p.amount, 0));

  return { ...order, items, payments, paid, remaining: round2(order.total - paid), shipment };
}

// Locks the order row until the transaction ends, so two requests cannot change it at once.
async function lockOrder(client, id) {
  return one('SELECT order_id, status FROM orders WHERE order_id = $1 FOR UPDATE', [id], client);
}

// Checkout, as ONE transaction: check minimum order quantity and stock, create the order and its
// items (price_at_order copied from unit_price), reduce stock, record the DEPOSIT. Any error rolls all of it back.
export async function createOrder({ userId, items, shipping, method }) {
  const wanted = new Map(); // product_id -> quantity (duplicates merged)
  for (const item of items) {
    wanted.set(item.product_id, (wanted.get(item.product_id) ?? 0) + item.quantity);
  }

  const orderId = await withTransaction(async (client) => {
    // FOR UPDATE locks these products so two buyers cannot take the same stock.
    const products = await many(
      'SELECT * FROM product WHERE product_id = ANY($1) ORDER BY product_id FOR UPDATE',
      [[...wanted.keys()]],
      client
    );

    for (const [productId, quantity] of wanted) {
      const product = products.find((p) => p.product_id === productId);
      if (!product) throw new HttpError(404, `Product ${productId} not found`);
      if (quantity < product.min_order_qty) {
        throw new HttpError(400, `${product.name}: minimum order is ${product.min_order_qty}`);
      }
      if (quantity > product.stock_quantity) {
        throw new HttpError(400, `${product.name}: only ${product.stock_quantity} in stock`);
      }
    }

    const { order_id } = await one(
      `INSERT INTO orders (shipping_street, shipping_city, shipping_country, user_id)
       VALUES ($1, $2, $3, $4) RETURNING order_id`, // status defaults to PENDING, order_date to today
      [shipping.street, shipping.city, shipping.country, userId],
      client
    );

    let total = 0;
    for (const product of products) {
      const quantity = wanted.get(product.product_id);
      await run(
        'INSERT INTO order_item (order_id, product_id, quantity, price_at_order) VALUES ($1, $2, $3, $4)',
        [order_id, product.product_id, quantity, product.unit_price],
        client
      );
      await run('UPDATE product SET stock_quantity = stock_quantity - $2 WHERE product_id = $1', [product.product_id, quantity], client);
      total += quantity * product.unit_price;
    }

    await run(
      "INSERT INTO payment (amount, method, payment_type, order_id) VALUES ($1, $2, 'DEPOSIT', $3)",
      [round2(total * DEPOSIT_RATE), method, order_id],
      client
    );
    return order_id;
  });

  return getById(orderId);
}

// Buyer pays the rest: records the BALANCE payment and moves PENDING -> PAID.
export async function payBalance(id, method) {
  const found = await withTransaction(async (client) => {
    const order = await lockOrder(client, id);
    if (!order) return false;
    if (order.status !== 'PENDING') throw new HttpError(409, `Only pending orders need a balance payment (this one is ${order.status})`);

    const { total } = await one('SELECT total_amount AS total FROM order_total WHERE order_id = $1', [id], client);
    const { paid, deposit_method } = await one(
      `SELECT COALESCE(SUM(amount), 0) AS paid,
              (SELECT method FROM payment WHERE order_id = $1 ORDER BY payment_id LIMIT 1) AS deposit_method
       FROM payment WHERE order_id = $1`,
      [id],
      client
    );
    const remaining = round2(total - paid);
    if (remaining > 0) {
      await run(
        "INSERT INTO payment (amount, method, payment_type, order_id) VALUES ($1, $2, 'BALANCE', $3)",
        [remaining, method ?? deposit_method, id],
        client
      );
    }
    await run("UPDATE orders SET status = 'PAID' WHERE order_id = $1", [id], client);
    return true;
  });
  return found ? getById(id) : null;
}

// Cancel (stock goes back) or mark delivered (shipment too).
export async function setStatus(id, newStatus) {
  const found = await withTransaction(async (client) => {
    const order = await lockOrder(client, id);
    if (!order) return false;
    if (!TRANSITIONS[order.status].includes(newStatus)) {
      throw new HttpError(409, `Cannot change an order from ${order.status} to ${newStatus}`);
    }
    if (newStatus === 'CANCELLED') {
      await run(
        `UPDATE product p SET stock_quantity = p.stock_quantity + oi.quantity
         FROM order_item oi
         WHERE oi.order_id = $1 AND p.product_id = oi.product_id`,
        [id],
        client
      );
    }
    if (newStatus === 'DELIVERED') {
      await run("UPDATE shipment SET delivery_status = 'DELIVERED' WHERE order_id = $1", [id], client);
    }
    await run('UPDATE orders SET status = $2 WHERE order_id = $1', [id, newStatus], client);
    return true;
  });
  return found ? getById(id) : null;
}

// Admin: deletes the order. Its items, payments and shipment go with it (ON DELETE CASCADE).
// Stock goes back for orders still in the warehouse (PENDING / PAID); a CANCELLED order already got it back.
export async function remove(id) {
  return withTransaction(async (client) => {
    const order = await lockOrder(client, id);
    if (!order) return false;
    if (order.status === 'PENDING' || order.status === 'PAID') {
      await run(
        `UPDATE product p SET stock_quantity = p.stock_quantity + oi.quantity
         FROM order_item oi
         WHERE oi.order_id = $1 AND p.product_id = oi.product_id`,
        [id],
        client
      );
    }
    await run('DELETE FROM orders WHERE order_id = $1', [id], client);
    return true;
  });
}

// Ships the order: the shipment becomes IN_TRANSIT (shipped today) and the order moves PAID -> SHIPPED.
// A PREPARING shipment that already exists is updated; otherwise a new one is created.
export async function createShipment(id, { carrier, tracking_number }) {
  const found = await withTransaction(async (client) => {
    const order = await lockOrder(client, id);
    if (!order) return false;
    if (order.status !== 'PAID') throw new HttpError(409, `Only paid orders can be shipped (this one is ${order.status})`);
    const existing = await one('SELECT delivery_status FROM shipment WHERE order_id = $1', [id], client);
    if (existing && existing.delivery_status !== 'PREPARING') {
      throw new HttpError(409, 'Order already has a shipment');
    }
    if (await one('SELECT 1 FROM shipment WHERE tracking_number = $1 AND order_id <> $2', [tracking_number, id], client)) {
      throw new HttpError(409, 'Tracking number is already used by another shipment');
    }
    if (existing) {
      await run(
        `UPDATE shipment SET carrier = $1, tracking_number = $2, ship_date = CURRENT_DATE, delivery_status = 'IN_TRANSIT'
         WHERE order_id = $3`,
        [carrier, tracking_number, id],
        client
      );
    } else {
      await run(
        `INSERT INTO shipment (carrier, tracking_number, ship_date, delivery_status, order_id)
         VALUES ($1, $2, CURRENT_DATE, 'IN_TRANSIT', $3)`,
        [carrier, tracking_number, id],
        client
      );
    }
    await run("UPDATE orders SET status = 'SHIPPED' WHERE order_id = $1", [id], client);
    return true;
  });
  return found ? getById(id) : null;
}
