# database-project-group-17

TradeHub: an Alibaba-style B2B wholesale marketplace. Suppliers list products with a minimum order quantity,
buyers place bulk orders, and admins manage the catalogue, orders and users.

Course: CMPE341 Database Design & Management. Group members: _add names here_.

## Run it

```bash
git clone <this repository>
cd database-project-group-17
docker compose up --build
```

Open **http://localhost** (on the deployed server: `http://<server-ip>`).

> Status: the web app currently runs on in-memory sample data (resets on restart).
> The PostgreSQL database replaces it later by rewriting `server/src/repositories/`.

## Test accounts

| Role  | Username | Password   | Can do |
|-------|----------|------------|--------|
| Admin | `admin`  | `admin123` | everything: manage products, categories, suppliers, orders, users; view reports |
| User  | `alice`  | `user123`  | browse, order, cancel own paid orders, write own reviews |
| User  | `bob`    | `user123`  | same as alice |

Anyone can also register a new account (always a normal user).

## Run without Docker (development)

```bash
cd server && npm install && npm run dev     # API on http://localhost:4000
cd client && npm install && npm run dev     # app on http://localhost:5173
```

## Stop / reset

```bash
docker compose down
```

## Project layout

- `server/`: Express API. `routes/` handle HTTP, `repositories/` are the only files that touch data.
- `client/`: React app (Vite). Served by nginx, which forwards `/api` to the server.
- `docs/WEBAPP_PLAN.md`: full design of the web app.
