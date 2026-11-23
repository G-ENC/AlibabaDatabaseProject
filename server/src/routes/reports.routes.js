import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import * as reports from '../repositories/reports.repo.js';

const router = Router();
router.use('/reports', requireAuth, requireAdmin);

router.get('/reports/order-details', async (req, res) => res.json(await reports.orderDetails()));
router.get('/reports/supplier-revenue', async (req, res) => res.json(await reports.supplierRevenue()));
router.get('/reports/products-above-average', async (req, res) => res.json(await reports.productsAboveCategoryAvg()));

export default router;
