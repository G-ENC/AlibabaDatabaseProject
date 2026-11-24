// All settings come from environment variables; defaults let the app run with no setup.
export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  // Must stay false while the site is served over plain http, or the browser drops the cookie.
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Used when the database is connected later.
  databaseUrl: process.env.DATABASE_URL || 'postgres://app:app@db:5432/marketplace',
};
