import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { toInt } from '../utils/validate.js';
import * as users from '../repositories/users.repo.js';

const router = Router();
router.use('/users', requireAuth, requireAdmin);

router.get('/users', async (req, res) => {
  res.json(await users.list());
});

// Promote / demote. Body: { is_admin: true|false }
router.patch('/users/:id', async (req, res) => {
  const id = toInt(req.params.id);
  if (typeof req.body?.is_admin !== 'boolean') throw new HttpError(400, 'is_admin must be true or false');
  if (id === req.user.user_id) throw new HttpError(400, 'You cannot change your own role');
  const user = await users.setAdmin(id, req.body.is_admin);
  if (!user) throw new HttpError(404, 'User not found');
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  const id = toInt(req.params.id);
  if (id === req.user.user_id) throw new HttpError(400, 'You cannot delete yourself');
  if (!(await users.remove(id))) throw new HttpError(404, 'User not found');
  res.status(204).end();
});

export default router;
