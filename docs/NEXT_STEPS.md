# Next Steps Plan — Database, Deployment, Report

Based on `tablesAndMore` (final SQL schema) and `tables.png` (relational schema diagram).
Today: 27.11.2026. **Report due 29.11.2026** (team leader submits on Moodle). Presentations 1–16.12.2026.

The time is short, so the order below puts what the grade needs first.

---

## 0. Where we are

| Item | Status |
|---|---|
| Web app (React + Express, auth, roles, CRUD, 3 reports) | Done, runs on in-memory mock data |
| Docker Compose (web + api) | Done, `db` service commented out |
| Final SQL schema | Written (`tablesAndMore`), not yet in the repo layout |
| PostgreSQL connected | Not started |
| Seed data, query results | Not started |
| VM deployment | Not started |
| ER diagram (Chapter 3) | Not started (`tables.png` is the *relational* schema = Chapter 4) |
| Report | Not started |

---

## 1. Differences between the schema and the current app

The app was built against the earlier draft. These must be changed in the app so it fits the final schema.

| # | Schema says | App does now | Change |
|---|---|---|---|
| 1 | `orders.status` IN `'PENDING','PAID','SHIPPED','DELIVERED','CANCELLED'` (uppercase, default `PENDING`) | lowercase `paid/shipped/delivered/cancelled`, no `pending` | Use uppercase everywhere (server + client badges, filter dropdown, buttons). Add `PENDING`. |
| 2 | `payment.payment_type` IN `'DEPOSIT','BALANCE'` | writes `'full'` | New payment flow (see 1.1). `'full'` would break the CHECK. |
| 3 | `shipment.delivery_status` IN `'PREPARING','IN_TRANSIT','DELIVERED'` | lowercase `in_transit/delivered` | Uppercase. |
| 4 | `order_date`, `payment_date`, `review_date` are `DATE` | ISO timestamps | Fine in SQL. Make `pg` return DATE as plain `'YYYY-MM-DD'` string (see 2.4). |
| 5 | `NUMERIC(12,2)` for prices/amounts | JS numbers | `pg` returns NUMERIC as a string; add a type parser (see 2.4). |
| 6 | `orders.user_id ... ON DELETE RESTRICT` | mock delete removes user | Deleting a user with orders now fails with FK error `23503`; error handler already maps it to 409. Show a clear message: "User has orders and cannot be deleted". |
| 7 | `product.supplier_id / category_id ... ON DELETE RESTRICT` | repo checks by hand | Keep the checks or let the DB refuse (409). Either way the UI message stays. |
| 8 | `category.parent_id ... ON DELETE SET NULL` | — | Deleting a parent category makes its children top-level. Nothing to code. |
| 9 | `review UNIQUE (user_id, product_id)`, cascades on user/product delete | repo checks by hand | DB also enforces it (`23505` → 409). |
| 10 | `VIEW order_total` | total computed in JS | Use the view in the order queries (good to show in the report). |

### 1.1 New order + payment flow (uses PENDING, DEPOSIT, BALANCE)

B2B marketplaces usually take a deposit first and the balance before shipping. This uses every value the schema allows:

```
Checkout ──► order PENDING  + payment DEPOSIT (30% of total)   stock is reserved (reduced)
   buyer "Pay balance" ──► payment BALANCE (rest of total) ──► order PAID
   admin "Create shipment" ──► shipment IN_TRANSIT, ship_date = today ──► order SHIPPED
   admin "Mark delivered"  ──► shipment DELIVERED ──► order DELIVERED

Cancel: PENDING or PAID ──► CANCELLED (buyer or admin), stock is restored
```

Allowed transitions: `PENDING → PAID | CANCELLED`, `PAID → CANCELLED`, `SHIPPED → DELIVERED`.
`PAID → SHIPPED` happens only by creating a shipment (as now).
`PREPARING` stays as the column default; we create shipments directly as `IN_TRANSIT` to stay simple.

New endpoint: `POST /api/orders/:id/pay-balance` (owner only, order must be `PENDING`).
Order detail page: show the payments list (type, amount, date) and "Paid so far / Remaining".

---

## 2. Database step (do first — about half a day)

### 2.1 Files

```
db/init/01_schema.sql   ← copy of tablesAndMore (tables, view, indexes)
db/init/02_seed.sql     ← sample data
docs/queries.sql        ← the 3 report queries, for the report (Chapter 5)
```

Postgres runs files in `/docker-entrypoint-initdb.d` in name order, **only when the data volume is empty**.
To re-run them: `docker compose down -v` then `docker compose up --build`.

### 2.2 Seed data (≥ 3 rows per table, more is better for the queries)

Reuse the mock data (same names, so screenshots stay the same), adapted:

- `CREATE EXTENSION IF NOT EXISTS pgcrypto;` at the top. Passwords hashed in SQL:
  `crypt('admin123', gen_salt('bf', 10))` — produces bcrypt hashes that `bcryptjs` can verify.
- Insert rows **without** explicit ids, in a fixed order, so SERIAL gives 1, 2, 3 … and new rows from the app don't collide.
- users: admin, alice, bob (+1 more user is fine).
- supplier 4, category 5 (one child: Smartphones → Electronics), product 8.
- orders: 4 orders so every status appears: DELIVERED, SHIPPED, PAID, PENDING (optionally one CANCELLED).
- order_item: 2 lines per order where possible.
- payment: DEPOSIT + BALANCE for paid/shipped/delivered orders, only DEPOSIT for the pending one.
  Amounts must add up to the order total (30% / 70%).
- shipment: for the SHIPPED (IN_TRANSIT) and DELIVERED (DELIVERED) orders.
- review: 4–5 rows, each (user, product) pair once.

### 2.3 docker-compose.yml

- Enable `db`: `postgres:17-alpine`, env `POSTGRES_USER/PASSWORD/DB`, volume `pgdata`, mount `./db/init:/docker-entrypoint-initdb.d:ro`.
- Healthcheck `pg_isready`; `api` uses `depends_on: db: condition: service_healthy`.
- `api` gets `DATABASE_URL=postgres://tradehub:tradehub@db:5432/tradehub`.
- **Do not publish port 5432** (only `web` on 80). Keeps the DB private on the VM.

### 2.4 Server: connect with `pg`

- `npm i pg` in `server/`.
- `server/src/db.js`: one `Pool` from `DATABASE_URL`, plus type parsers:
  - `1700` NUMERIC → `parseFloat`
  - `20` BIGINT (COUNT/SUM results) → `parseInt`
  - `1082` DATE → return the string as-is (avoids timezone shifts)
- A small `withTransaction(fn)` helper (BEGIN / COMMIT / ROLLBACK) for checkout.

### 2.5 Rewrite the repositories (routes and frontend stay the same)

| Repo | Notes |
|---|---|
| users | `SELECT ... WHERE username = $1`; never return `password_hash` to the client |
| categories, suppliers | Plain CRUD; deletes rely on RESTRICT → 409 |
| products | List with JOIN supplier + category; filters (search `ILIKE`, category, supplier) |
| reviews | Average rating via `AVG(rating)` |
| orders | `createOrder` in a **transaction**: lock products `SELECT ... FOR UPDATE`, check MOQ + stock, insert order, items (copy `unit_price`), reduce stock, insert DEPOSIT payment. `payBalance`, `setStatus`, `createShipment` also transactional. Totals from `order_total` view. |
| reports | The 3 queries as real SQL (below) |

Always use `$1, $2` parameters, never string concatenation (SQL injection).
Delete `server/src/data/mockData.js` once all repos are SQL.

### 2.6 The 3 required queries (Chapter 5)

1. **JOIN** — order lines with buyer, supplier, product:
   `orders ⋈ users ⋈ order_item ⋈ product ⋈ supplier`
2. **GROUP BY + ORDER BY** — revenue per supplier, cancelled excluded, highest first:
   `SUM(oi.quantity * oi.unit_price) ... GROUP BY s.supplier_id, s.company_name ORDER BY revenue DESC`
3. **Subquery** — products priced above their category's average:
   `WHERE p.unit_price > (SELECT AVG(unit_price) FROM product WHERE category_id = p.category_id)`

Put them in `docs/queries.sql`, run them in `psql`, and screenshot the results:
`docker compose exec db psql -U tradehub -d tradehub -f /path` (or paste them).

### 2.7 Test checklist before moving on

- [ ] `docker compose down -v && docker compose up --build` starts all 3 containers with data
- [ ] Login works for admin / alice / bob
- [ ] Checkout creates PENDING order + DEPOSIT payment; stock goes down
- [ ] Pay balance → PAID; ship → SHIPPED; deliver → DELIVERED
- [ ] Cancel restores stock
- [ ] Insert / update / delete for products, categories, suppliers, reviews
- [ ] Deleting a supplier with products shows a 409 message, not a crash
- [ ] Admin reports page shows the 3 query results
- [ ] Data survives `docker compose down` + `up` (no `-v`)

---

## 3. Deployment (Chapter 7 — about 2–3 hours)

1. Create a Linux VM (Azure for Students or Oracle Free Tier). Ubuntu 24.04, smallest size is enough.
2. Open inbound port **80** (and 22 for SSH) in the provider's firewall / network security group.
3. SSH in: `ssh azureuser@<public-ip>`.
4. Install Docker Engine + Compose plugin (official convenience script or apt repo).
5. `git clone https://github.com/<org>/database-project-group-17.git && cd database-project-group-17`
6. Create `.env` with a real `JWT_SECRET` (long random string) and a non-default DB password.
7. `docker compose up -d --build`
8. Open `http://<public-ip>` in a browser. Test login.
9. Screenshots for the report: VM page in the portal, SSH session, `docker compose ps`, the app in the browser at the IP.

Bonus (domain, ≤ 50 TL): buy a cheap domain, add an **A record** pointing to the VM IP, wait for DNS, screenshot the app at the domain.

---

## 4. Report (Word, English, Times New Roman 12, 1.5 spacing, justified, 2.5 cm margins)

| Chapter | Pts | Content | Source |
|---|---|---|---|
| Cover | — | Title "TradeHub — B2B Wholesale Marketplace", group 17, member names + IDs | — |
| 1 Introduction | 10 | The real-life problem: wholesale buying between businesses and suppliers (like Alibaba) | `docs/WEBAPP_PLAN.md` intro |
| 2 Requirements | 10 | User expectations; **data to store** vs **operations on data**; screenshots of the app | `WEBAPP_PLAN.md` requirements + roles matrix |
| 3 ER/EER | 15 | **New ER diagram** (Chen or crow's foot): 9 entities, relationships, cardinalities, attributes | Draw in draw.io / dbdiagram |
| 4 Logical design | 15 | `tables.png` + list of PKs and FKs per table | `tables.png`, `tablesAndMore` |
| 5 Physical design | 20 | CREATE TABLE statements with constraints; INSERT data (or table of rows); 3 queries + result screenshots | `01_schema.sql`, `02_seed.sql`, `queries.sql` |
| 6 Web app | 15 | Repo link, `docker compose up`, auth (bcrypt + JWT), 2 roles, insert/update/delete screenshots | README, app screenshots |
| 7 Deployment | 15 | VM provider, steps, firewall, screenshots at public IP | Section 3 above |
| References | — | PostgreSQL docs, Express, React, Docker, cloud provider docs | — |

### 4.1 ER diagram content (Chapter 3)

Entities: USERS, SUPPLIER, CATEGORY, PRODUCT, ORDERS, ORDER_ITEM, PAYMENT, SHIPMENT, REVIEW.

| Relationship | Cardinality | Notes |
|---|---|---|
| SUPPLIER supplies PRODUCT | 1 : N | product total participation |
| CATEGORY classifies PRODUCT | 1 : N | product total participation |
| CATEGORY has subcategory CATEGORY | 1 : N recursive | `parent_id` |
| USERS places ORDERS | 1 : N | order total participation |
| ORDERS contains PRODUCT | M : N via ORDER_ITEM (quantity, unit_price) | ORDER_ITEM is a weak/associative entity, PK (order_id, product_id) |
| ORDERS has PAYMENT | 1 : N | DEPOSIT + BALANCE |
| ORDERS has SHIPMENT | 1 : 0..1 | `order_id UNIQUE` |
| USERS reviews PRODUCT | M : N via REVIEW (rating, comment, date) | one review per user per product |

Derived attribute: order total (the `order_total` view) — draw with a dashed oval.

---

## 5. Smaller items

- README: group member names; mention `docker compose down -v` to reset data.
- Add all team members as GitHub collaborators; put the repo link in the shared Excel.
- Delete the merged branch `feat/webapp-skeleton` (local + GitHub) to keep the repo clean.
- Move `tablesAndMore` → `db/init/01_schema.sql` and `tables.png` → `docs/relational_schema.png`.
- Update `docs/WEBAPP_PLAN.md` status rules to the new uppercase flow.

---

## 6. Schedule and team split (4 people)

| When | Person A (backend) | Person B (backend/DB) | Person C (deploy) | Person D (report) |
|---|---|---|---|---|
| 27.11 | `db.js`, compose `db` service, repos users/categories/suppliers/products | seed SQL, orders repo + new payment flow, queries.sql | Create VM, install Docker, open port 80 | Ch. 1–2, cover, draw ER diagram |
| 28.11 | Client status/payment changes, full test checklist | Query result screenshots, review fixes | Deploy final `main`, screenshots, domain bonus | Ch. 3–4, collect screenshots, start Ch. 5–7 |
| 29.11 | Bug fixes only | Bug fixes only | Final redeploy check | Finish Ch. 5–7, references, formatting, **leader submits** |

If the group is 3 people, merge C into A.

**Cut line if time runs out:** keep the deposit flow simple (or seed it only), skip the domain bonus.
Never skip: DB with seed data in Docker, the 3 queries with results, deployment screenshots.
