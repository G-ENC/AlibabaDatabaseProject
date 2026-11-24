import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';
import * as users from '../repositories/users.repo.js';

// Reads the JWT cookie and sets req.user (without password_hash). 401 if missing/invalid.
// The user is re-loaded each request, so a demoted or deleted user loses access immediately.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) throw new HttpError(401, 'Please log in');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Session expired, please log in again');
  }
  const user = await users.findById(payload.userId);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  req.user = user;
  next();
}

// Must be used after requireAuth.
export function requireAdmin(req, res, next) {
  if (!req.user.is_admin) throw new HttpError(403, 'Admin access required');
  next();
}
