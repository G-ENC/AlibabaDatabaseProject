import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { requireFields } from '../utils/validate.js';
import * as users from '../repositories/users.repo.js';

const router = Router();

// The JWT only holds the user id; role is read from the user on every request.
function startSession(res, user) {
  const token = jwt.sign({ userId: user.user_id }, config.jwtSecret, { expiresIn: '1d' });
  res.cookie('token', token, {
    httpOnly: true, // JavaScript in the page cannot read it
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

router.post('/auth/register', async (req, res) => {
  requireFields(req.body, ['username', 'email', 'password']);
  const username = String(req.body.username).trim();
  const email = String(req.body.email).trim();
  const password = String(req.body.password);

  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
    throw new HttpError(400, 'Username must be 3-30 characters: letters, digits or underscore');
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Email is not valid');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

  const user = await users.create({ username, email, password_hash: await bcrypt.hash(password, 10) });
  startSession(res, user);
  res.status(201).json(user);
});

router.post('/auth/login', async (req, res) => {
  requireFields(req.body, ['username', 'password']);
  const user = await users.findByUsernameWithHash(String(req.body.username).trim());
  // Same message for unknown user and wrong password, so it does not reveal which one was wrong.
  const ok = user && (await bcrypt.compare(String(req.body.password), user.password_hash));
  if (!ok) throw new HttpError(401, 'Invalid username or password');
  startSession(res, user);
  res.json(await users.findById(user.user_id));
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.status(204).end();
});

// The frontend calls this on page load to find out who is logged in.
router.get('/auth/me', requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
