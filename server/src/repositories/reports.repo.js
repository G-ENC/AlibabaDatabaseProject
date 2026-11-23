// The three report queries required by the course. Here they are computed in JavaScript;
// with the database each becomes one SQL statement (comment above each shows the idea).
import { db } from '../data/mockData.js';
import { round2 } from '../utils/validate.js';

const productOf = (id) => db.products.find((p) => p.product_id === id);
const supplierOf = (productId) => db.suppliers.find((s) => s.supplier_id === productOf(productId)?.supplier_id);

// 1) JOIN: order lines with buyer, product and supplier.
//    SELECT ... FROM orders o JOIN users u ... JOIN order_item oi ... JOIN product p ... JOIN supplier s ...
export async function orderDetails() {
  return db.order_items
    .map((item) => {
      const order = db.orders.find((o) => o.order_id === item.order_id);
      return {
        order_id: order.order_id,
        order_date: order.order_date.slice(0, 10),
        status: order.status,
        buyer: db.users.find((u) => u.user_id === order.user_id)?.username,
        supplier: supplierOf(item.product_id)?.company_name,
        product: productOf(item.product_id)?.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: round2(item.quantity * item.unit_price),
      };
    })
    .sort((a, b) => a.order_id - b.order_id);
}

// 2) GROUP BY + ORDER BY: revenue per supplier (cancelled orders excluded), highest first.
//    SELECT s.company_name, SUM(oi.quantity*oi.unit_price) AS revenue ... GROUP BY s.supplier_id ORDER BY revenue DESC
export async function supplierRevenue() {
  const bySupplier = new Map();
  for (const item of db.order_items) {
    const order = db.orders.find((o) => o.order_id === item.order_id);
    if (order.status === 'cancelled') continue;
    const supplier = supplierOf(item.product_id);
    const row = bySupplier.get(supplier.supplier_id) ?? { supplier: supplier.company_name, country: supplier.country, orders: new Set(), units_sold: 0, revenue: 0 };
    row.orders.add(order.order_id);
    row.units_sold += item.quantity;
    row.revenue += item.quantity * item.unit_price;
    bySupplier.set(supplier.supplier_id, row);
  }
  return [...bySupplier.values()]
    .map((r) => ({ supplier: r.supplier, country: r.country, orders: r.orders.size, units_sold: r.units_sold, revenue: round2(r.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

// 3) SUBQUERY: products priced above the average price of their own category.
//    SELECT ... FROM product p WHERE p.unit_price > (SELECT AVG(unit_price) FROM product WHERE category_id = p.category_id)
export async function productsAboveCategoryAvg() {
  const average = (categoryId) => {
    const prices = db.products.filter((p) => p.category_id === categoryId).map((p) => p.unit_price);
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  };
  return db.products
    .filter((p) => p.unit_price > average(p.category_id))
    .map((p) => ({
      product: p.name,
      category: db.categories.find((c) => c.category_id === p.category_id)?.name,
      unit_price: p.unit_price,
      category_avg_price: round2(average(p.category_id)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
