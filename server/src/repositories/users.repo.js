import { db, nextId } from '../data/mockData.js';
import { HttpError } from '../utils/httpError.js';

const withoutHash = ({ password_hash, ...user }) => user;

// The only function that returns password_hash (needed by login).
export async function findByUsernameWithHash(username) {
  return db.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
}

export async function findById(id) {
  const user = db.users.find((u) => u.user_id === id);
  return user ? withoutHash(user) : null;
}

export async function create({ username, email, password_hash }) {
  if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new HttpError(409, 'Username is already taken');
  }
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new HttpError(409, 'Email is already registered');
  }
  const user = { user_id: nextId('users', 'user_id'), username, password_hash, email, is_admin: false, created_at: new Date().toISOString() };
  db.users.push(user);
  return withoutHash(user);
}

export async function list() {
  return db.users.map(withoutHash);
}

export async function setAdmin(id, isAdmin) {
  const user = db.users.find((u) => u.user_id === id);
  if (!user) return null;
  user.is_admin = isAdmin;
  return withoutHash(user);
}

export async function remove(id) {
  const index = db.users.findIndex((u) => u.user_id === id);
  if (index === -1) return false;
  if (db.orders.some((o) => o.user_id === id)) {
    throw new HttpError(409, 'User has orders and cannot be deleted');
  }
  db.reviews = db.reviews.filter((r) => r.user_id !== id); // reviews are deleted with the user
  db.users.splice(index, 1);
  return true;
}
