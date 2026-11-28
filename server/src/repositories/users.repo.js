import { many, one, run } from '../db.js';
import { HttpError } from '../utils/httpError.js';

// Every column except password_hash.
const PUBLIC_COLUMNS = 'user_id, username, email, is_admin, created_at';

// The only function that returns password_hash (needed by login).
export async function findByUsernameWithHash(username) {
  return one('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
}

export async function findById(id) {
  return one(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE user_id = $1`, [id]);
}

export async function create({ username, email, password_hash }) {
  // Checked here (case-insensitive) to give a clear message; the UNIQUE constraints are the backstop.
  if (await one('SELECT 1 FROM users WHERE LOWER(username) = LOWER($1)', [username])) {
    throw new HttpError(409, 'Username is already taken');
  }
  if (await one('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)', [email])) {
    throw new HttpError(409, 'Email is already registered');
  }
  return one(
    `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING ${PUBLIC_COLUMNS}`,
    [username, email, password_hash]
  );
}

export async function list() {
  return many(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY user_id`);
}

export async function setAdmin(id, isAdmin) {
  return one(`UPDATE users SET is_admin = $2 WHERE user_id = $1 RETURNING ${PUBLIC_COLUMNS}`, [id, isAdmin]);
}

export async function remove(id) {
  // orders.user_id is ON DELETE RESTRICT; check first for a readable message.
  if (await one('SELECT 1 FROM orders WHERE user_id = $1 LIMIT 1', [id])) {
    throw new HttpError(409, 'User has orders; delete those orders first');
  }
  // The user's reviews are removed by ON DELETE CASCADE.
  return (await run('DELETE FROM users WHERE user_id = $1', [id])) > 0;
}
