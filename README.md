# database-project-group-17

Alibaba Marketplace: a B2B wholesale marketplace modelled on Alibaba.com. Suppliers list products with a minimum order quantity,
buyers place bulk orders, and admins manage the catalogue, orders and users.

Course: CMPE341 Database Design & Management. Group members: _add names here_.

## Run it

```bash
git clone <this repository>
cd database-project-group-17
docker compose up --build
```

Open **http://localhost** (on the deployed server: `http://<server-ip>`).

This starts three containers: `db` (PostgreSQL 17, created with tables and sample data on first start),
`api` (Express) and `web` (React app served by nginx).

## Test accounts

| Role  | Username | Password   | Can do |
|-------|----------|------------|--------|
| Admin | `admin`  | `admin123` | everything: manage products, categories, suppliers, orders, users; view reports |
| User  | `alice`  | `user123`  | browse, order (30% deposit, then pay balance), cancel own orders before shipping, write own reviews |
| User  | `bob`    | `user123`  | same as alice |
| User  | `carol`  | `user123`  | same as alice |

Anyone can also register a new account (always a normal user).

## Run without Docker (development)

```bash
docker compose up -d db                     # database only, on localhost:5432
cd server && npm install && npm run dev     # API on http://localhost:4000
cd client && npm install && npm run dev     # app on http://localhost:5173
```

## Stop / reset

```bash
docker compose down        # stop; data is kept in the pgdata volume
docker compose down -v     # stop and delete the data; next start loads the sample data again
```

Open a SQL shell, or run the report queries:

```bash
docker compose exec db psql -U app -d marketplace
docker compose exec -T db psql -U app -d marketplace < docs/queries.sql
```

## Project layout

- `db/init/`: `01_schema.sql` (tables, view, indexes) and `02_seed.sql` (sample data).
- `server/`: Express API. `routes/` handle HTTP, `repositories/` are the only files that touch data.
- `client/`: React app (Vite). Served by nginx, which forwards `/api` to the server.
- `docs/WEBAPP_PLAN.md`: full design of the web app. `docs/queries.sql`: the 3 report queries.
- `docs/relational_schema.png`: relational schema diagram.
