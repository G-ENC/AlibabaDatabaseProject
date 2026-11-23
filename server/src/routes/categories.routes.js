import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { optionalText, requireFields, toInt } from '../utils/validate.js';
import * as categories from '../repositories/categories.repo.js';

const router = Router();

// Checks the body and returns clean values for the repository.
async function parseCategory(body, ownId) {
  requireFields(body, ['name']);
  const parent_id = body.parent_id ? toInt(body.parent_id, 'parent_id') : null;
  if (parent_id !== null) {
    if (parent_id === ownId) throw new HttpError(400, 'A category cannot be its own parent');
    if (!(await categories.getById(parent_id))) throw new HttpError(400, 'Parent category does not exist');
  }
  return { name: String(body.name).trim(), description: optionalText(body.description), parent_id };
}

router.get('/categories', async (req, res) => {
  res.json(await categories.list());
});

router.post('/categories', requireAuth, requireAdmin, async (req, res) => {
  res.status(201).json(await categories.create(await parseCategory(req.body)));
});

router.put('/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id);
  const updated = await categories.update(id, await parseCategory(req.body, id));
  if (!updated) throw new HttpError(404, 'Category not found');
  res.json(updated);
});

router.delete('/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!(await categories.remove(toInt(req.params.id)))) throw new HttpError(404, 'Category not found');
  res.status(204).end();
});

export default router;
