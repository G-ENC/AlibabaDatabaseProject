-- Alibaba Marketplace sample data. Runs after 01_schema.sql on the first start of the db container.
-- Same rows as the team's pgAdmin database (Alibaba_DB/data.sql), adapted for the web app:
--   * passwords are known test passwords, so you can log in on the site;
--   * rows are inserted without ids, in a fixed order, so SERIAL gives 1, 2, 3 ...
--     and rows added later from the web app continue from there (no duplicate keys);
--   * orders 3 and 4 are PAID, so they also get their BALANCE payment
--     (in the app a PAID order is fully paid: 30% DEPOSIT + 70% BALANCE).

-- pgcrypto gives crypt() + gen_salt('bf'): bcrypt hashes the Node app (bcryptjs) can verify.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- category 1..4   (Mobile Accessories is a sub-category of Electronics)
INSERT INTO category (name, description, parent_id) VALUES
  ('Electronics',        'Consumer electronics',     NULL),
  ('Apparel',            'Clothing and textiles',    NULL),
  ('Mobile Accessories', 'Cases, earbuds, chargers', 1),
  ('Home & Furniture',   'Furniture and home goods', NULL);

-- users 1..4   (test logins: admin_ayse/admin123, buyer_john/user123, buyer_maria/user123, buyer_chen/user123)
INSERT INTO users (username, password_hash, email, is_admin, created_at) VALUES
  ('admin_ayse',  crypt('admin123', gen_salt('bf', 10)), 'ayse@alibaba-demo.com', TRUE,  '2026-09-01 10:00'),
  ('buyer_john',  crypt('user123',  gen_salt('bf', 10)), 'john@mail.com',         FALSE, '2026-09-10 11:30'),
  ('buyer_maria', crypt('user123',  gen_salt('bf', 10)), 'maria@mail.com',        FALSE, '2026-09-15 09:15'),
  ('buyer_chen',  crypt('user123',  gen_salt('bf', 10)), 'chen@mail.com',         FALSE, '2026-09-20 14:45');

-- supplier 1..4
INSERT INTO supplier (company_name, country, city, contact_email, verified_status, year_established) VALUES
  ('Shenzhen Tech Co.',         'China',  'Shenzhen',  'sales@sztech.cn',         TRUE,  2008),
  ('Istanbul Textile Ltd.',     'Turkey', 'Istanbul',  'info@ist-textile.com.tr', TRUE,  1995),
  ('Mumbai Spices Pvt.',        'India',  'Mumbai',    'contact@mumbaispices.in', FALSE, 2015),
  ('Guangzhou Furniture Group', 'China',  'Guangzhou', 'export@gzfurniture.cn',   TRUE,  2001);

-- product 1..4
INSERT INTO product (name, description, unit_price, stock_quantity, min_order_qty, created_at, supplier_id, category_id) VALUES
  ('Wireless Earbuds X1',  'Bluetooth 5.3 earbuds with charging case',        12.50,  5000,  100, '2026-09-05 09:00', 1, 3),
  ('Cotton T-Shirt Pack',  'Pack of 5 plain cotton t-shirts, assorted',        3.20, 20000,  500, '2026-09-06 09:00', 2, 2),
  ('Smartphone Case Pro',  'Shockproof silicone case, universal fit',          0.85, 50000, 1000, '2026-09-07 09:00', 1, 3),
  ('Office Chair Ergo',    'Ergonomic mesh office chair with lumbar support', 45.00,   800,   20, '2026-09-08 09:00', 4, 4);

-- orders 1..4
INSERT INTO orders (order_date, status, shipping_street, shipping_city, shipping_country, user_id) VALUES
  ('2026-10-05', 'DELIVERED', '12 Hauptstrasse', 'Berlin',   'Germany', 2),
  ('2026-10-12', 'SHIPPED',   '45 Calle Mayor',  'Madrid',   'Spain',   3),
  ('2026-10-20', 'PAID',      '8 Baker Street',  'London',   'UK',      2),
  ('2026-11-02', 'PAID',      '77 Nanjing Road', 'Shanghai', 'China',   4);

-- order_item   (price_at_order is copied from product.unit_price at order time)
INSERT INTO order_item (order_id, product_id, quantity, price_at_order) VALUES
  (1, 1,  200, 12.50),   -- order 1 total 2500.00
  (2, 2, 1000,  3.20),   -- order 2 total 3200.00
  (3, 4,   50, 45.00),   -- order 3 total 2250.00
  (4, 3, 5000,  0.85);   -- order 4 total 4250.00

-- payment
INSERT INTO payment (amount, payment_date, method, payment_type, order_id) VALUES
  (2500.00, '2026-10-05', 'Bank Transfer',    'BALANCE', 1),
  (3200.00, '2026-10-12', 'Letter of Credit', 'BALANCE', 2),
  ( 675.00, '2026-10-20', 'Credit Card',      'DEPOSIT', 3),
  (1275.00, '2026-11-02', 'PayPal',           'DEPOSIT', 4),
  (1575.00, '2026-10-21', 'Credit Card',      'BALANCE', 3),   -- added: order 3 is PAID
  (2975.00, '2026-11-03', 'PayPal',           'BALANCE', 4);   -- added: order 4 is PAID

-- review
INSERT INTO review (rating, comment, review_date, user_id, product_id) VALUES
  (5, 'Great sound quality, fast delivery.',   '2026-10-25', 2, 1),
  (4, 'Reliable supplier, good value.',        '2026-10-27', 3, 1),
  (3, 'Battery life is average.',              '2026-10-30', 4, 1),
  (4, 'Soft fabric, slightly late shipping.',  '2026-11-03', 2, 2);

-- shipment   (PREPARING = packed, not left the warehouse yet; shipping the order in the app sets it IN_TRANSIT)
INSERT INTO shipment (carrier, tracking_number, ship_date, delivery_status, order_id) VALUES
  ('DHL',    'DHL1000001', '2026-10-08', 'DELIVERED',  1),
  ('FedEx',  'FDX2000002', '2026-10-15', 'IN_TRANSIT', 2),
  ('UPS',    'UPS3000003', NULL,         'PREPARING',  3),
  ('Maersk', 'MSK4000004', NULL,         'PREPARING',  4);
