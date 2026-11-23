import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { optionalText, requireFields, toInt, toNumber } from '../utils/validate.js';
import * as suppliers from '../repositories/suppliers.repo.js';
import * as products from '../repositories/products.repo.js';

const router = Router();

function parseSupplier(body) {
  requireFields(body, ['company_name', 'country']);
  return {
    company_name: String(body.company_name).trim(),
    country: String(body.country).trim(),
    city: optionalText(body.city),
    contact_email: optionalText(body.contact_email),
    verified_status: body.verified_status === true,
    year_established: body.year_established ? toNumber(body.year_established, 'year_established', { min: 1800, integer: true }) : null,
  };
}

router.get('/suppliers', async (req, res) => {
  res.json(await suppliers.list());
});

// Supplier plus its products.
router.get('/suppliers/:id', async (req, res) => {
  const id = toInt(req.params.id);
  const supplier = await suppliers.getById(id);
  if (!supplier) throw new HttpError(404, 'Supplier not found');
  res.json({ ...supplier, products: await products.list({ supplierId: id }) });
});

router.post('/suppliers', requireAuth, requireAdmin, async (req, res) => {
  res.status(201).json(await suppliers.create(parseSupplier(req.body)));
});

router.put('/suppliers/:id', requireAuth, requireAdmin, async (req, res) => {
  const updated = await suppliers.update(toInt(req.params.id), parseSupplier(req.body));
  if (!updated) throw new HttpError(404, 'Supplier not found');
  res.json(updated);
});

router.delete('/suppliers/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!(await suppliers.remove(toInt(req.params.id)))) throw new HttpError(404, 'Supplier not found');
  res.status(204).end();
});

export default router;
