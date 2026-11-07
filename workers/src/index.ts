import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types';
import { verifyJwt } from './auth/jwt';
import { authRoutes } from './routes/auth';
import { categoriesRoutes } from './routes/categories';
import { productsRoutes } from './routes/products';
import { bundlesRoutes } from './routes/bundles';
import { customersRoutes } from './routes/customers';
import { suppliersRoutes } from './routes/suppliers';
import { invoicesRoutes } from './routes/invoices';
import { purchaseOrdersRoutes } from './routes/purchase-orders';
import { stockMovementsRoutes } from './routes/stock-movements';
import { dashboardRoutes } from './routes/dashboard';
import { companySettingsRoutes } from './routes/company-settings';
import { usersRoutes } from './routes/users';
import { publicRoutes } from './routes/public';

const app = new Hono<AppEnv>();

// ============================================================
// CORS
// ============================================================
app.use('*', async (c, next) => {
  const origins = (c.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o: string) => o.trim());

  return cors({
    origin: origins.length === 1 && origins[0] === '*' ? '*' : origins,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })(c, next);
});

// ============================================================
// AUTH MIDDLEWARE (toutes les routes /api/* sauf exceptions)
// ============================================================
app.use('/api/*', async (c, next) => {
  const { pathname } = new URL(c.req.url);
  const method = c.req.method;

  const isPublic =
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/public/') ||
    (pathname === '/api/company-settings' && method === 'GET');

  if (isPublic) return next();

  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ message: 'Non autorise' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ message: 'Token invalide ou expire' }, 401);
  }

  c.set('jwtPayload', payload);
  return next();
});

// ============================================================
// ROUTES
// ============================================================
app.route('/api/auth', authRoutes);
app.route('/api/categories', categoriesRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/bundles', bundlesRoutes);
app.route('/api/customers', customersRoutes);
app.route('/api/suppliers', suppliersRoutes);
app.route('/api/invoices', invoicesRoutes);
app.route('/api/purchase-orders', purchaseOrdersRoutes);
app.route('/api/stock-movements', stockMovementsRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/company-settings', companySettingsRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/public', publicRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }));

export default app;
