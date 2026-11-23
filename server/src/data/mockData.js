// In-memory stand-in for the database. Table and column names match the planned schema,
// so the repositories can later be rewritten to SQL without touching routes or frontend.
// Data resets every time the server restarts.
import bcrypt from 'bcryptjs';

const hash = (password) => bcrypt.hashSync(password, 10);

export const db = {
  users: [
    { user_id: 1, username: 'admin', password_hash: hash('admin123'), email: 'admin@example.com', is_admin: true, created_at: '2026-01-10T09:00:00Z' },
    { user_id: 2, username: 'alice', password_hash: hash('user123'), email: 'alice@example.com', is_admin: false, created_at: '2026-02-01T10:00:00Z' },
    { user_id: 3, username: 'bob', password_hash: hash('user123'), email: 'bob@example.com', is_admin: false, created_at: '2026-02-15T11:30:00Z' },
  ],

  suppliers: [
    { supplier_id: 1, company_name: 'Shenzhen Tech Co', country: 'China', city: 'Shenzhen', contact_email: 'sales@sztech.example', verified_status: true, year_established: 2008 },
    { supplier_id: 2, company_name: 'Guangzhou Textiles Ltd', country: 'China', city: 'Guangzhou', contact_email: 'info@gztextiles.example', verified_status: true, year_established: 2001 },
    { supplier_id: 3, company_name: 'Istanbul Furniture Works', country: 'Turkey', city: 'Istanbul', contact_email: 'export@istfurn.example', verified_status: true, year_established: 2015 },
    { supplier_id: 4, company_name: 'Mumbai Spice Exports', country: 'India', city: 'Mumbai', contact_email: 'hello@mumbaispice.example', verified_status: false, year_established: 2019 },
  ],

  categories: [
    { category_id: 1, name: 'Electronics', description: 'Consumer electronics and accessories', parent_id: null },
    { category_id: 2, name: 'Smartphones', description: 'Mobile phones', parent_id: 1 },
    { category_id: 3, name: 'Textiles', description: 'Fabrics and clothing', parent_id: null },
    { category_id: 4, name: 'Furniture', description: 'Home and office furniture', parent_id: null },
    { category_id: 5, name: 'Food & Spices', description: 'Packaged food and spices', parent_id: null },
  ],

  products: [
    { product_id: 1, name: 'Wireless Earbuds Pro', description: 'Bluetooth 5.3 earbuds with charging case.', unit_price: 12.5, stock_quantity: 5000, min_order_qty: 100, created_at: '2026-03-01T08:00:00Z', supplier_id: 1, category_id: 1 },
    { product_id: 2, name: 'Android Smartphone X5', description: '6.5" display, 128 GB storage.', unit_price: 85, stock_quantity: 800, min_order_qty: 10, created_at: '2026-03-02T08:00:00Z', supplier_id: 1, category_id: 2 },
    { product_id: 3, name: 'USB-C Fast Charger 65W', description: 'GaN charger for laptops and phones.', unit_price: 6.2, stock_quantity: 12000, min_order_qty: 200, created_at: '2026-03-03T08:00:00Z', supplier_id: 1, category_id: 1 },
    { product_id: 4, name: 'Organic Cotton Fabric Roll', description: '100 m roll, 150 cm width.', unit_price: 3.4, stock_quantity: 20000, min_order_qty: 500, created_at: '2026-03-05T08:00:00Z', supplier_id: 2, category_id: 3 },
    { product_id: 5, name: 'Denim Jeans Wholesale', description: 'Assorted sizes, classic blue.', unit_price: 9.9, stock_quantity: 3000, min_order_qty: 50, created_at: '2026-03-06T08:00:00Z', supplier_id: 2, category_id: 3 },
    { product_id: 6, name: 'Oak Office Desk', description: 'Solid oak, 160x80 cm.', unit_price: 140, stock_quantity: 200, min_order_qty: 5, created_at: '2026-03-10T08:00:00Z', supplier_id: 3, category_id: 4 },
    { product_id: 7, name: 'Ergonomic Office Chair', description: 'Mesh back, adjustable arms.', unit_price: 75, stock_quantity: 350, min_order_qty: 10, created_at: '2026-03-11T08:00:00Z', supplier_id: 3, category_id: 4 },
    { product_id: 8, name: 'Cardamom 1 kg Bag', description: 'Green cardamom, export grade.', unit_price: 22, stock_quantity: 1500, min_order_qty: 20, created_at: '2026-03-15T08:00:00Z', supplier_id: 4, category_id: 5 },
  ],

  orders: [
    { order_id: 1, order_date: '2026-10-01T09:00:00Z', status: 'delivered', shipping_street: '12 Market Street', shipping_city: 'Nicosia', shipping_country: 'Cyprus', user_id: 2 },
    { order_id: 2, order_date: '2026-11-05T14:00:00Z', status: 'shipped', shipping_street: '12 Market Street', shipping_city: 'Nicosia', shipping_country: 'Cyprus', user_id: 2 },
    { order_id: 3, order_date: '2026-11-15T16:30:00Z', status: 'paid', shipping_street: '5 Harbour Road', shipping_city: 'Izmir', shipping_country: 'Turkey', user_id: 3 },
  ],

  order_items: [
    { order_id: 1, product_id: 1, quantity: 200, unit_price: 12.5 },
    { order_id: 1, product_id: 3, quantity: 300, unit_price: 6.2 },
    { order_id: 2, product_id: 6, quantity: 10, unit_price: 140 },
    { order_id: 3, product_id: 4, quantity: 1000, unit_price: 3.4 },
    { order_id: 3, product_id: 5, quantity: 100, unit_price: 9.9 },
  ],

  payments: [
    { payment_id: 1, amount: 4360, payment_date: '2026-10-01T09:05:00Z', method: 'card', payment_type: 'full', order_id: 1 },
    { payment_id: 2, amount: 1400, payment_date: '2026-11-05T14:05:00Z', method: 'bank_transfer', payment_type: 'full', order_id: 2 },
    { payment_id: 3, amount: 4390, payment_date: '2026-11-15T16:35:00Z', method: 'card', payment_type: 'full', order_id: 3 },
  ],

  shipments: [
    { shipment_id: 1, carrier: 'DHL', tracking_number: 'DHL1000123', ship_date: '2026-10-02T08:00:00Z', delivery_status: 'delivered', order_id: 1 },
    { shipment_id: 2, carrier: 'UPS', tracking_number: 'UPS2000456', ship_date: '2026-11-06T08:00:00Z', delivery_status: 'in_transit', order_id: 2 },
  ],

  reviews: [
    { review_id: 1, rating: 5, comment: 'Great sound for the price.', review_date: '2026-10-10T12:00:00Z', user_id: 2, product_id: 1 },
    { review_id: 2, rating: 4, comment: 'Charges fast, a bit warm.', review_date: '2026-10-11T12:00:00Z', user_id: 2, product_id: 3 },
    { review_id: 3, rating: 4, comment: 'Good fabric quality.', review_date: '2026-11-20T12:00:00Z', user_id: 3, product_id: 4 },
    { review_id: 4, rating: 5, comment: 'Sturdy desk, easy to assemble.', review_date: '2026-11-21T12:00:00Z', user_id: 2, product_id: 6 },
  ],
};

// Next free primary key for a table (stands in for SERIAL / identity columns).
export function nextId(table, key) {
  return Math.max(0, ...db[table].map((row) => row[key])) + 1;
}
