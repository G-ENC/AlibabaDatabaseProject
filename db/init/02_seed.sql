-- TradeHub sample data. Runs after 01_schema.sql on the first start of the db container.
-- Rows are inserted without ids, in a fixed order, so SERIAL gives 1, 2, 3 ...
-- and rows added later from the web app continue from there.

-- pgcrypto gives crypt() + gen_salt('bf'): bcrypt hashes the Node app (bcryptjs) can verify.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users 1..4   (test logins: admin/admin123, alice/user123, bob/user123, carol/user123)
INSERT INTO users (username, password_hash, email, is_admin, created_at) VALUES
  ('admin', crypt('admin123', gen_salt('bf', 10)), 'admin@tradehub.example', TRUE,  '2026-01-10 09:00'),
  ('alice', crypt('user123',  gen_salt('bf', 10)), 'alice@example.com',      FALSE, '2026-02-01 10:00'),
  ('bob',   crypt('user123',  gen_salt('bf', 10)), 'bob@example.com',        FALSE, '2026-02-15 11:30'),
  ('carol', crypt('user123',  gen_salt('bf', 10)), 'carol@example.com',      FALSE, '2026-03-20 15:45');

-- supplier 1..4
INSERT INTO supplier (company_name, country, city, contact_email, verified_status, year_established) VALUES
  ('Shenzhen Tech Co',         'China',  'Shenzhen',  'sales@sztech.example',      TRUE,  2008),
  ('Guangzhou Textiles Ltd',   'China',  'Guangzhou', 'info@gztextiles.example',   TRUE,  2001),
  ('Istanbul Furniture Works', 'Turkey', 'Istanbul',  'export@istfurn.example',    TRUE,  2015),
  ('Mumbai Spice Exports',     'India',  'Mumbai',    'hello@mumbaispice.example', FALSE, 2019);

-- category 1..5   (Smartphones is a sub-category of Electronics)
INSERT INTO category (name, description, parent_id) VALUES
  ('Electronics',   'Consumer electronics and accessories', NULL),
  ('Smartphones',   'Mobile phones',                        1),
  ('Textiles',      'Fabrics and clothing',                 NULL),
  ('Furniture',     'Home and office furniture',            NULL),
  ('Food & Spices', 'Packaged food and spices',             NULL);

-- product 1..8
INSERT INTO product (name, description, unit_price, stock_quantity, min_order_qty, created_at, supplier_id, category_id) VALUES
  ('Wireless Earbuds Pro',       'Bluetooth 5.3 earbuds with charging case.', 12.50,  5000, 100, '2026-03-01 08:00', 1, 1),
  ('Android Smartphone X5',      '6.5" display, 128 GB storage.',             85.00,   800,  10, '2026-03-02 08:00', 1, 2),
  ('USB-C Fast Charger 65W',     'GaN charger for laptops and phones.',        6.20, 12000, 200, '2026-03-03 08:00', 1, 1),
  ('Organic Cotton Fabric Roll', '100 m roll, 150 cm width.',                  3.40, 20000, 500, '2026-03-05 08:00', 2, 3),
  ('Denim Jeans Wholesale',      'Assorted sizes, classic blue.',              9.90,  3000,  50, '2026-03-06 08:00', 2, 3),
  ('Oak Office Desk',            'Solid oak, 160x80 cm.',                    140.00,   200,   5, '2026-03-10 08:00', 3, 4),
  ('Ergonomic Office Chair',     'Mesh back, adjustable arms.',               75.00,   350,  10, '2026-03-11 08:00', 3, 4),
  ('Cardamom 1 kg Bag',          'Green cardamom, export grade.',             22.00,  1500,  20, '2026-03-15 08:00', 4, 5);

-- orders 1..5   (one of each status)
INSERT INTO orders (order_date, status, shipping_street, shipping_city, shipping_country, user_id) VALUES
  ('2026-10-01', 'DELIVERED', '12 Market Street', 'Nicosia', 'Cyprus', 2),
  ('2026-11-05', 'SHIPPED',   '12 Market Street', 'Nicosia', 'Cyprus', 2),
  ('2026-11-15', 'PAID',      '5 Harbour Road',   'Izmir',   'Turkey', 3),
  ('2026-11-20', 'CANCELLED', '8 Ataturk Avenue', 'Ankara',  'Turkey', 4),
  ('2026-11-25', 'PENDING',   '5 Harbour Road',   'Izmir',   'Turkey', 3);

-- order_item   (unit_price is copied from the product at order time)
INSERT INTO order_item (order_id, product_id, quantity, unit_price) VALUES
  (1, 1,  200,  12.50),   -- order 1 total 4360.00
  (1, 3,  300,   6.20),
  (2, 6,   10, 140.00),   -- order 2 total 2150.00
  (2, 7,   10,  75.00),
  (3, 4, 1000,   3.40),   -- order 3 total 4390.00
  (3, 5,  100,   9.90),
  (4, 7,   20,  75.00),   -- order 4 total 1500.00 (cancelled)
  (5, 8,   50,  22.00),   -- order 5 total 1950.00
  (5, 2,   10,  85.00);

-- payment   (30% DEPOSIT at checkout, the rest as BALANCE before shipping)
INSERT INTO payment (amount, payment_date, method, payment_type, order_id) VALUES
  (1308.00, '2026-10-01', 'card',          'DEPOSIT', 1),
  (3052.00, '2026-10-01', 'card',          'BALANCE', 1),
  ( 645.00, '2026-11-05', 'bank_transfer', 'DEPOSIT', 2),
  (1505.00, '2026-11-05', 'bank_transfer', 'BALANCE', 2),
  (1317.00, '2026-11-15', 'card',          'DEPOSIT', 3),
  (3073.00, '2026-11-16', 'card',          'BALANCE', 3),
  ( 450.00, '2026-11-20', 'card',          'DEPOSIT', 4),
  ( 585.00, '2026-11-25', 'bank_transfer', 'DEPOSIT', 5);

-- shipment   (only orders that left the warehouse)
INSERT INTO shipment (carrier, tracking_number, ship_date, delivery_status, order_id) VALUES
  ('DHL', 'DHL1000123', '2026-10-02', 'DELIVERED',  1),
  ('UPS', 'UPS2000456', '2026-11-06', 'IN_TRANSIT', 2);

-- review   (one per user per product)
INSERT INTO review (rating, comment, review_date, user_id, product_id) VALUES
  (5, 'Great sound for the price.',      '2026-10-10', 2, 1),
  (4, 'Charges fast, a bit warm.',       '2026-10-11', 2, 3),
  (4, 'Good fabric quality.',            '2026-11-20', 3, 4),
  (5, 'Sturdy desk, easy to assemble.',  '2026-11-21', 2, 6),
  (3, 'Sizes run a little small.',       '2026-11-22', 3, 5);
