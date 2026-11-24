import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { HttpError } from '../utils/httpError.js';
import { optionalText, requireFields, toInt, toNumber } from '../utils/validate.js';
import * as products from '../repositories/products.repo.js';
import * as suppliers from '../repositories/suppliers.repo.js';
import * as categories from '../repositories/categories.repo.js';

const router = Router();

async function parseProduct(body) {
  requireFields(body, ['name', 'unit_price', 'stock_quantity', 'min_order_qty', 'supplier_id', 'category_id']);
  const data = {
    name: String(body.name).trim(),
    description: optionalText(body.description),
    unit_price: toNumber(body.unit_price, 'unit_price', { min: 0.01 }),
    stock_quantity: toNumber(body.stock_quantity, 'stock_quantity', { min: 0, integer: true }),
    min_order_qty: toNumber(body.min_order_qty, 'min_order_qty', { min: 1, integer: true }),
    supplier_id: toInt(body.supplier_id, 'supplier_id'),
    category_id: toInt(body.category_id, 'category_id'),
  };
  if (!(await suppliers.getById(data.supplier_id))) throw new HttpError(400, 'Supplier does not exist');
  if (!(await categories.getById(data.category_id))) throw new HttpError(400, 'Category does not exist');
  return data;
}

router.get('/products', async (req, res) => {
  const { search, category, supplier } = req.query;
  res.json(
    await products.list({
      search: typeof search === 'string' ? search.trim() : undefined,
      categoryId: category ? toInt(category, 'category') : undefined,
      supplierId: supplier ? toInt(supplier, 'supplier') : undefined,
    })
  );
});

router.get('/products/:id', async (req, res) => {
  const product = await products.getById(toInt(req.params.id));
  if (!product) throw new HttpError(404, 'Product not found');
  res.json(product);
});

router.post('/products', requireAuth, requireAdmin, async (req, res) => {
  res.status(201).json(await products.create(await parseProduct(req.body)));
});

router.put('/products/:id', requireAuth, requireAdmin, async (req, res) => {
  const updated = await products.update(toInt(req.params.id), await parseProduct(req.body));
  if (!updated) throw new HttpError(404, 'Product not found');
  res.json(updated);
});

router.delete('/products/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!(await products.remove(toInt(req.params.id)))) throw new HttpError(404, 'Product not found');
  res.status(204).end();
});

export default router;
