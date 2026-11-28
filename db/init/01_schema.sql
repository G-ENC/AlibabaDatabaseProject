-- Alibaba Marketplace schema: tables, view and indexes.
-- Runs automatically on the first start of the db container (empty volume only).
-- To run it again: docker compose down -v && docker compose up --build

CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    email           VARCHAR(100)  NOT NULL UNIQUE,
    is_admin        BOOLEAN  NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE supplier (
    supplier_id         SERIAL PRIMARY KEY,
    company_name        VARCHAR(100)  NOT NULL,
    country             VARCHAR(50) NOT NULL,
    city                VARCHAR(50),
    contact_email       VARCHAR(100),
    verified_status     BOOLEAN NOT NULL DEFAULT FALSE,
    year_established    INT   CHECK (year_established > 1800)
);
CREATE TABLE category (
    category_id     SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    parent_id       INT REFERENCES category(category_id) ON DELETE SET NULL
);
CREATE TABLE product (
    product_id      SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    unit_price      NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    stock_quantity  INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    min_order_qty   INT  NOT NULL DEFAULT 1 CHECK (min_order_qty >= 1),
    created_at      TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    supplier_id     INT NOT NULL REFERENCES supplier(supplier_id) ON DELETE RESTRICT,
    category_id     INT  NOT NULL REFERENCES category(category_id) ON DELETE RESTRICT
);
CREATE TABLE orders (
    order_id            SERIAL PRIMARY KEY,
    order_date          DATE  NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','SHIPPED','DELIVERED','CANCELLED')),
    shipping_street     VARCHAR(150) NOT NULL,
    shipping_city       VARCHAR(50)  NOT NULL,
    shipping_country    VARCHAR(50) NOT NULL,
    user_id             INT   NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT
);
CREATE TABLE order_item (
    order_id        INT NOT NULL REFERENCES orders(order_id)   ON DELETE CASCADE,
    product_id      INT  NOT NULL REFERENCES product(product_id) ON DELETE RESTRICT,
    quantity        INT   NOT NULL CHECK (quantity > 0),
    price_at_order  NUMERIC(12,2) NOT NULL CHECK (price_at_order >= 0),
    PRIMARY KEY (order_id, product_id)
);
CREATE TABLE payment (
    payment_id      SERIAL PRIMARY KEY,
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date    DATE  NOT NULL DEFAULT CURRENT_DATE,
    method          VARCHAR(30) NOT NULL,
    payment_type    VARCHAR(10) NOT NULL CHECK (payment_type IN ('DEPOSIT','BALANCE')),
    order_id        INT  NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE
);
CREATE TABLE shipment (
    shipment_id         SERIAL  PRIMARY KEY,
    carrier             VARCHAR(50) NOT NULL,
    tracking_number     VARCHAR(50) UNIQUE,
    ship_date           DATE,
    delivery_status     VARCHAR(20) NOT NULL DEFAULT 'PREPARING' CHECK (delivery_status IN ('PREPARING','IN_TRANSIT','DELIVERED')),
    order_id            INT  NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE
);
CREATE TABLE review (
    review_id       SERIAL PRIMARY KEY,
    rating          INT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    review_date     DATE  NOT NULL DEFAULT CURRENT_DATE,
    user_id         INT  NOT NULL REFERENCES users(user_id)     ON DELETE CASCADE,
    product_id      INT  NOT NULL REFERENCES product(product_id) ON DELETE CASCADE, UNIQUE (user_id, product_id)
);


CREATE VIEW order_total AS
SELECT order_id, SUM(quantity * price_at_order) AS total_amount
FROM order_item
GROUP BY order_id;

CREATE INDEX idx_cat_parent      ON category(parent_id);
CREATE INDEX idx_prod_supplier   ON product(supplier_id);
CREATE INDEX idx_prod_category   ON product(category_id);
CREATE INDEX idx_ord_user        ON orders(user_id);
CREATE INDEX idx_ord_status      ON orders(status);
CREATE INDEX idx_item_product    ON order_item(product_id);
CREATE INDEX idx_pay_order       ON payment(order_id);
CREATE INDEX idx_rev_product     ON review(product_id);
