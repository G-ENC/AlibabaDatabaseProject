# Web App Plan — Alibaba-style B2B Marketplace

Scope of this document: everything **except** the database. The app is built first
against in-memory data; the PostgreSQL database is plugged in later by rewriting
one layer (the repositories, see §6). Nothing else should need to change.

Guiding rule: **simple, working, understandable.** No TypeScript, no ORM, no state
management library, no UI framework. Every team member should be able to read any file.

---

## 1. Requirements this app must satisfy (from the guideline)

| # | Requirement | Where it is covered |
|---|---|---|
| R1 | Login with username + password | §5 Auth |
| R2 | Passwords stored hashed | §5 Auth (bcryptjs) |
| R3 | At least 2 roles with different permissions | §3 Roles (admin, user) |
| R4 | Insert, Update, Delete operations | §7 API (every resource has them) |
| R5 | `docker compose up` starts DB + app after clone | §9 Docker |
| R6 | README with URL + test user/password per role | §11 README |
| R7 | Public GitHub repo named `<project>-group-<N>` | §12 Checklist |
| R8 | Deployed on a Linux VM, reachable by public IP | §10 Deployment |

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 LTS | Current LTS |
| Backend | Express 5 | Forwards errors from async handlers automatically (Express 4 would need a try/catch in every route) |
| Auth | `bcryptjs`, `jsonwebtoken`, `cookie-parser` | `bcryptjs` is pure JS, no native build problems in Docker |
| DB driver (later) | `pg` (node-postgres), raw SQL | Course is about SQL; no ORM hides it |
| Frontend | React 18 + Vite + React Router 7 | Standard, fast dev server |
| Styling | Plain CSS (one `index.css`) + optional [Pico.css](https://picocss.com) | Looks decent with zero effort |
| Serving | nginx (serves React build, proxies `/api` to Express) | One origin → no CORS, cookies just work |
| Container | Docker + Docker Compose | Required |

Language: plain JavaScript (ES modules, `"type": "module"` in `package.json`).

---

## 3. Roles and permissions

Roles come from `users.is_admin` (BOOLEAN). Two roles: **admin** and **user** (buyer).
Suppliers are companies managed by admins; they do not log in.

| Action | Guest | User | Admin |
|---|:-:|:-:|:-:|
| Browse/search products, view suppliers & categories | ✓ | ✓ | ✓ |
| Read reviews | ✓ | ✓ | ✓ |
| Register / log in | ✓ | – | – |
| Place an order (creates order + items + payment) | ✗ | ✓ | ✗ |
| View own orders, cancel own order while not shipped | ✗ | ✓ | ✗ |
| Write / edit / delete **own** review | ✗ | ✓ | ✗ |
| Delete **any** review | ✗ | ✗ | ✓ |
| CRUD suppliers, categories, products | ✗ | ✗ | ✓ |
| View all orders, change order status, create/update shipment | ✗ | ✗ | ✓ |
| List users, promote/demote admin, delete user | ✗ | ✗ | ✓ |
| Reports page (the 3 report queries) | ✗ | ✗ | ✓ |

**Rule:** the frontend hides buttons the user may not use, but the **backend always
re-checks** (role + ownership). Hiding a button is not security.

---

## 4. Business rules

1. **Cart** lives only in the browser (React state + `localStorage`). No cart table.
2. **Checkout** sends cart items + shipping address + payment method in one request.
   The server:
   - checks each product exists, `quantity >= min_order_qty`, `quantity <= stock_quantity`;
   - copies the product's current `unit_price` into each order item;
   - decreases `stock_quantity`;
   - creates the order with status `paid` and one payment row (`amount` = sum of items);
   - all of this is one transaction once the DB is connected.
3. **Order status flow:** `paid → shipped → delivered`, or `paid → cancelled`. No other changes are allowed (409).
   - User may cancel only while status is `paid`. Cancelling restores stock.
   - Admin creating a shipment (`POST /orders/:id/shipment`) is the only way to reach `shipped`.
   - Admin marks `delivered` with `PATCH /orders/:id/status` (also sets shipment `delivery_status = 'delivered'`).
4. **Order total** is never stored; it is computed from order items.
5. **Reviews:** one per user per product, rating 1–5. (Optional stricter rule: only
   users with a delivered order containing that product may review.)
6. **Deleting a product** that appears in any order is refused with `409 Conflict`
   ("product has orders"). Products without orders can be deleted.
7. **Registration** always creates a normal user. Admins exist from seed data or are
   promoted by another admin. An admin cannot demote or delete themselves.

---

## 5. Authentication design

- **Register** `POST /api/auth/register` → validate, `bcrypt.hash(password, 10)`, store
  user, log in immediately.
- **Login** `POST /api/auth/login` → find by username, `bcrypt.compare`. On success sign a
  JWT `{ userId }` with `JWT_SECRET`, expiry `1d`. The role is **not** stored in the token: `requireAuth` re-loads the
  user on every request, so a demoted or deleted user loses access immediately.
- Token is sent as a cookie:
  `res.cookie('token', jwt, { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE, maxAge: 86400000 })`
  - `httpOnly` → JavaScript cannot read it (protects against XSS token theft).
  - `COOKIE_SECURE=false` while the site is plain `http://<ip>`; set `true` only after
    HTTPS works. **If `secure` is true on plain HTTP, the browser drops the cookie and
    login silently "does nothing".**
- **Logout** `POST /api/auth/logout` → `res.clearCookie('token')`.
- **Who am I** `GET /api/auth/me` → returns `{ user_id, username, email, is_admin }` or 401.
  The frontend calls this on page load to restore the session.
- Login errors always say "Invalid username or password" (never reveal which part was wrong).
- Password rule: min 6 characters. Username: 3–30 chars, letters/digits/underscore.
- Never send `password_hash` to the client. Repositories return users without it,
  except the one function used by login.

Middleware (`server/src/middleware/auth.js`):

```js
export function requireAuth(req, res, next)   // reads cookie, verifies JWT, sets req.user or 401
export function requireAdmin(req, res, next)   // requireAuth + req.user.isAdmin, else 403
```

---

## 6. Backend structure and the "DB later" seam

```
server/
  Dockerfile
  package.json
  src/
    index.js               # create app, middleware, mount routes, error handler, listen
    config.js              # reads env vars with defaults
    middleware/
      auth.js              # requireAuth, requireAdmin
      errors.js            # notFound + central error handler
    routes/
      auth.routes.js
      categories.routes.js
      suppliers.routes.js
      products.routes.js
      reviews.routes.js
      orders.routes.js
      users.routes.js
      reports.routes.js
    repositories/          # ← THE ONLY LAYER THAT TOUCHES DATA
      users.repo.js
      categories.repo.js
      suppliers.repo.js
      products.repo.js
      reviews.repo.js
      orders.repo.js       # orders + order_item + payment + shipment
      reports.repo.js
    data/
      mockData.js          # in-memory arrays used until the DB exists
    utils/
      validate.js          # tiny helpers: requireFields, toInt, isEmail...
      httpError.js         # class HttpError(status, message)
```

**The seam:** routes call repository functions only. Repository functions are
`async` and return plain objects whose field names are **exactly the DB column names**
(`snake_case`, e.g. `unit_price`, `min_order_qty`). Today they read/write arrays in
`mockData.js`; later each body is replaced by one SQL query via `pg`. Route code,
frontend, and API stay unchanged.

Example:

```js
// products.repo.js — today
export async function getById(id) {
  return db.products.find(p => p.product_id === id) ?? null;
}
// products.repo.js — later
export async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM product WHERE product_id = $1', [id]);
  return rows[0] ?? null;
}
```

Repository function list (the contract):

| Repo | Functions |
|---|---|
| users | `findByUsernameWithHash(username)`, `findById(id)`, `create({username,email,password_hash})`, `list()`, `setAdmin(id, bool)`, `remove(id)` |
| categories | `list()`, `getById(id)`, `create(data)`, `update(id,data)`, `remove(id)` |
| suppliers | `list()`, `getById(id)`, `create(data)`, `update(id,data)`, `remove(id)` |
| products | `list({search, categoryId, supplierId})`, `getById(id)` (incl. supplier name, category name, avg rating), `create`, `update`, `remove`, `hasOrders(id)` |
| reviews | `listByProduct(productId)`, `getById(id)`, `findByUserAndProduct(u,p)`, `create`, `update`, `remove` |
| orders | `createOrder({userId, items, shipping, method})`, `listByUser(userId)`, `listAll({status})`, `getById(id)` (incl. items, payment, shipment, total), `setStatus(id,status)` (used for cancel and deliver), `createShipment(orderId,data)` |
| reports | `orderDetails()` (join), `supplierRevenue()` (group by), `productsAboveCategoryAvg()` (subquery) |

---

## 7. REST API

Base path `/api`. JSON in, JSON out.
Success: the resource or array. Error: `{ "error": "message" }` with status
`400` bad input · `401` not logged in · `403` not allowed · `404` not found · `409` conflict.

### Auth
| Method | Path | Access | Body / Notes |
|---|---|---|---|
| POST | `/auth/register` | guest | `{username, email, password}` |
| POST | `/auth/login` | guest | `{username, password}` |
| POST | `/auth/logout` | any | |
| GET | `/auth/me` | logged in | |

### Catalog
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/categories` | public | |
| POST | `/categories` | admin | `{name, description, parent_id?}` |
| PUT | `/categories/:id` | admin | |
| DELETE | `/categories/:id` | admin | 409 if it has products or children |
| GET | `/suppliers` | public | |
| GET | `/suppliers/:id` | public | includes its products |
| POST / PUT / DELETE | `/suppliers[/:id]` | admin | delete → 409 if it has products |
| GET | `/products?search=&category=&supplier=` | public | |
| GET | `/products/:id` | public | includes supplier, category, avg rating |
| POST / PUT / DELETE | `/products[/:id]` | admin | delete → 409 if ordered |

### Reviews
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/products/:id/reviews` | public | |
| POST | `/products/:id/reviews` | user | `{rating, comment}`; 409 if already reviewed |
| PUT | `/reviews/:id` | owner | |
| DELETE | `/reviews/:id` | owner or admin | |

### Orders
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/orders` | user | `{items:[{product_id, quantity}], shipping_street, shipping_city, shipping_country, method}` |
| GET | `/orders/mine` | user | |
| GET | `/orders/:id` | owner or admin | items, payment, shipment, total |
| PATCH | `/orders/:id/cancel` | owner | only when `paid` |
| GET | `/orders?status=` | admin | |
| PATCH | `/orders/:id/status` | admin | `{status}`; only `paid→cancelled` and `shipped→delivered` |
| POST | `/orders/:id/shipment` | admin | `{carrier, tracking_number}` → status `shipped` |

### Users & Reports
| Method | Path | Access |
|---|---|---|
| GET | `/users` | admin |
| PATCH | `/users/:id` | admin (`{is_admin}`) |
| DELETE | `/users/:id` | admin |
| GET | `/reports/order-details` | admin |
| GET | `/reports/supplier-revenue` | admin |
| GET | `/reports/products-above-average` | admin |
| GET | `/health` | public (returns `{ok:true}`) |

---

## 8. Frontend structure and pages

```
client/
  Dockerfile               # stage 1: npm run build; stage 2: nginx serves dist/
  nginx.conf               # serves SPA, proxies /api → api:4000
  vite.config.js           # dev proxy: /api → http://localhost:4000
  index.html
  src/
    main.jsx
    App.jsx                # routes
    api.js                 # fetch wrapper (credentials: 'include', throws on error)
    auth/AuthContext.jsx   # user state, login(), logout(), calls /auth/me on load
    auth/RequireAuth.jsx   # redirect to /login if not logged in
    auth/RequireAdmin.jsx  # show 403 page if not admin
    cart/CartContext.jsx   # cart in state + localStorage
    components/            # Navbar, ProductCard, ReviewList, ReviewForm, Table, ConfirmButton...
    pages/                 # one file per page below
    pages/admin/
    index.css
```

### Pages

| Route | Page | Access | Main actions |
|---|---|---|---|
| `/` | Product catalog | public | search box, category filter, product cards |
| `/products/:id` | Product detail | public | info, supplier, reviews, qty input (≥ MOQ), *Add to cart*, write/edit/delete own review |
| `/suppliers/:id` | Supplier page | public | company info + its products |
| `/login`, `/register` | Auth forms | guest | |
| `/cart` | Cart | user | change qty, remove, total, *Checkout* |
| `/checkout` | Checkout | user | shipping address, payment method → `POST /orders` |
| `/orders` | My orders | user | list with status + total |
| `/orders/:id` | Order detail | user (own) / admin | items, payment, shipment, *Cancel* |
| `/admin` | Admin home + Reports | admin | 3 report tables |
| `/admin/products` | Products | admin | table + create/edit form + delete |
| `/admin/categories` | Categories | admin | same pattern |
| `/admin/suppliers` | Suppliers | admin | same pattern |
| `/admin/orders` | All orders | admin | filter by status, change status, add shipment |
| `/admin/users` | Users | admin | promote/demote, delete |

Navbar: logo · Catalog · (user) Cart (count) · My Orders · (admin) Admin · username · Logout.

UI conventions: every delete asks `confirm()`; every form shows the server's
`error` message; loading shows "Loading…"; empty lists show "Nothing here yet".

---

## 9. Configuration and Docker

### Environment variables (all have defaults so `docker compose up` works with no `.env`)

| Var | Default | Used by |
|---|---|---|
| `PORT` | `4000` | api |
| `JWT_SECRET` | `dev-secret-change-me` | api |
| `COOKIE_SECURE` | `false` | api |
| `DATABASE_URL` | `postgres://app:app@db:5432/marketplace` | api (later) |
| `POSTGRES_USER / PASSWORD / DB` | `app / app / marketplace` | db (later) |

`.env.example` is committed; `.env` is in `.gitignore`.

### Compose services

```
web  (nginx, port 80:80)  ──/api──▶  api (express, 4000, internal only)  ──▶  db (postgres, internal only, added later)
```

- `web` is the only service with a published port.
- `api` gets `depends_on: db: condition: service_healthy` once `db` exists.
- `db` will mount `./db/init` into `/docker-entrypoint-initdb.d` (schema + seed run on first start).

### Development without Docker

```
cd server && npm install && npm run dev     # node --watch src/index.js on :4000
cd client && npm install && npm run dev     # Vite on :5173, proxies /api to :4000
```

---

## 10. Deployment plan

1. Create an Ubuntu 24.04 VM (Azure for Students or Oracle Cloud Free Tier).
2. SSH in, install Docker Engine + compose plugin (official convenience script).
3. `git clone <repo>` → `cd <repo>` → create `.env` with a real `JWT_SECRET` → `docker compose up -d --build`.
4. Open TCP 80 in the cloud firewall (Azure: Network Security Group; Oracle: VCN security list).
   **Oracle images also block port 80 inside the VM** — add an iptables rule for port 80 and save it.
5. Check `http://<public-ip>` in a browser.
6. Bonus: buy a cheap domain (≤ 50 TL), add an A record → VM IP. Optional HTTPS by
   switching `web` to Caddy; then set `COOKIE_SECURE=true`.
7. Do **not** publish the Postgres port on the server.

---

## 11. README.md contents

- Project name, group number, members
- Live URL (`http://<ip>` or domain)
- Test accounts: `admin / <password>` (admin), `user / <password>` (user)
- Run locally: `git clone …` then `docker compose up`, open `http://localhost`
- Reset data: `docker compose down -v`
- Short feature list and tech stack

---

## 12. Team split (4 people) and order of work

| Person | Owns |
|---|---|
| A | Server skeleton, config, error handling, auth (register/login/me/logout), middleware, users routes, Docker + compose |
| B | Catalog API: categories, suppliers, products, reviews (routes + mock repos) |
| C | Frontend shell: routing, AuthContext, api.js, Navbar, catalog, product detail, cart, checkout, my orders |
| D | Orders API + reports API, admin pages, deployment |

Order:
1. **Day 1:** A creates repo skeleton (server + client + compose) and `mockData.js`
   with field names matching the schema. Everyone pulls it.
2. **Days 2–4:** parallel work on routes and pages against mock data.
3. **Day 5:** DB person writes schema + seed; repositories rewritten to SQL.
4. **Day 6:** full `docker compose up` test from a fresh clone; deploy to VM.
5. **Day 7:** screenshots for report, README test accounts, final check.

Git: work on feature branches, open pull requests into `main`, keep `main` runnable.

---

## 13. Final checklist

- [ ] Fresh clone + `docker compose up` → app on `http://localhost` with sample data
- [ ] Login works for both test accounts in README
- [ ] Passwords in DB are bcrypt hashes (`$2a$…` / `$2b$…`)
- [ ] User cannot reach admin API (test with a user cookie → 403)
- [ ] Insert, update, delete each demonstrated in the UI
- [ ] Reports page shows join, group-by/order-by, and subquery results
- [ ] Repo public, named `<project>-group-<N>`, all members collaborators
- [ ] App reachable at the VM's public IP
