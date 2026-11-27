// All settings come from environment variables; defaults let the app run with no setup.
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  // Must stay false while the site is served over plain http, or the browser drops the cookie.
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Docker Compose sets this to the db container. The default fits `npm run dev` on your own
  // machine while `docker compose up db` is running (port 5432 is published to localhost only).
  databaseUrl: process.env.DATABASE_URL || 'postgres://app:app@localhost:5432/marketplace',
};
