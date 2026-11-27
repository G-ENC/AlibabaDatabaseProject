-- The three report queries required for Chapter 5 (also used by the admin Reports page).
-- Run them against the running database:
--   docker compose exec -T db psql -U app -d marketplace < docs/queries.sql

-- 1) JOIN: every order line with buyer, product and supplier (5 tables).
SELECT o.order_id,
       o.order_date,
       o.status,
       u.username                  AS buyer,
       s.company_name              AS supplier,
       p.name                      AS product,
       oi.quantity,
       oi.unit_price,
       oi.quantity * oi.unit_price AS line_total
FROM orders o
JOIN users u       ON u.user_id     = o.user_id
JOIN order_item oi ON oi.order_id   = o.order_id
JOIN product p     ON p.product_id  = oi.product_id
JOIN supplier s    ON s.supplier_id = p.supplier_id
ORDER BY o.order_id, p.name;

-- 2) GROUP BY + ORDER BY: revenue per supplier, cancelled orders excluded, highest first.
SELECT s.company_name                   AS supplier,
       s.country,
       COUNT(DISTINCT o.order_id)       AS orders,
       SUM(oi.quantity)                 AS units_sold,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM supplier s
JOIN product p     ON p.supplier_id = s.supplier_id
JOIN order_item oi ON oi.product_id = p.product_id
JOIN orders o      ON o.order_id    = oi.order_id
WHERE o.status <> 'CANCELLED'
GROUP BY s.supplier_id, s.company_name, s.country
ORDER BY revenue DESC;

-- 3) SUBQUERY (correlated): products priced above the average price of their own category.
SELECT p.name       AS product,
       c.name       AS category,
       p.unit_price,
       ROUND((SELECT AVG(p2.unit_price) FROM product p2 WHERE p2.category_id = p.category_id), 2) AS category_avg_price
FROM product p
JOIN category c ON c.category_id = p.category_id
WHERE p.unit_price > (SELECT AVG(p2.unit_price)
                      FROM product p2
                      WHERE p2.category_id = p.category_id)
ORDER BY c.name, p.unit_price DESC;

-- Bonus: the order_total VIEW from the schema.
SELECT * FROM order_total ORDER BY order_id;
