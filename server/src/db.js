// PostgreSQL connection pool plus small helpers used by every repository.
import pg from 'pg';
import { config } from './config.js';

// By default pg returns some types as strings. Convert them to what the app expects:
pg.types.setTypeParser(1700, parseFloat); // NUMERIC (prices, amounts) -> number
pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT (COUNT, SUM of INT) -> number
pg.types.setTypeParser(1082, (v) => v); // DATE -> 'YYYY-MM-DD' string (no timezone shift)

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

// All rows of a query.
export async function many(sql, params = [], client = pool) {
  const { rows } = await client.query(sql, params);
  return rows;
}

// First row of a query, or null.
export async function one(sql, params = [], client = pool) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

// Number of rows changed (for UPDATE / DELETE).
export async function run(sql, params = [], client = pool) {
  const { rowCount } = await client.query(sql, params);
  return rowCount;
}

// Runs fn(client) inside BEGIN ... COMMIT. Any error rolls everything back.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
