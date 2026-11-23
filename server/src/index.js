import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import suppliersRoutes from './routes/suppliers.routes.js';
import productsRoutes from './routes/products.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import reportsRoutes from './routes/reports.routes.js';

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Each router defines its full paths (e.g. '/products/:id'), all mounted under /api.
for (const routes of [authRoutes, usersRoutes, categoriesRoutes, suppliersRoutes, productsRoutes, reviewsRoutes, ordersRoutes, reportsRoutes]) {
  app.use('/api', routes);
}

app.use('/api', notFound);
app.use(errorHandler);

app.listen(config.port, () => console.log(`API listening on port ${config.port}`));
