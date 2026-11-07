import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const dashboardRoutes = new Hono<AppEnv>();

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=dim, 1=lun...
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// Ventes = BON_LIVRAISON, Achats = DEVIS (logique metier specifique)
async function sumInvoicesByType(db: D1Database, type: string, from: string, to: string): Promise<number> {
  const r = await db.prepare(`
    SELECT COALESCE(SUM(total_ttc), 0) AS val
    FROM invoices
    WHERE type = ? AND status != 'CANCELLED' AND date >= ? AND date <= ?
  `).bind(type, from, to).first<{ val: number }>();
  return r?.val ?? 0;
}

dashboardRoutes.get('/', async (c) => {
  const db = c.env.DB;
  const today = getToday();
  const monthStart = getMonthStart();
  const weekStart = getWeekStart();

  const [
    totalProducts, totalCustomers, totalSuppliers,
    monthlyVentes, monthlyAchats,
    weeklyVentes, weeklyAchats,
    dailyVentes, dailyAchats,
    lowStockRow, lowStockAlerts,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS val FROM products WHERE active = 1').first<{ val: number }>(),
    db.prepare('SELECT COUNT(*) AS val FROM customers').first<{ val: number }>(),
    db.prepare('SELECT COUNT(*) AS val FROM suppliers').first<{ val: number }>(),

    sumInvoicesByType(db, 'BON_LIVRAISON', monthStart, today),
    sumInvoicesByType(db, 'DEVIS', monthStart, today),

    sumInvoicesByType(db, 'BON_LIVRAISON', weekStart, today),
    sumInvoicesByType(db, 'DEVIS', weekStart, today),

    sumInvoicesByType(db, 'BON_LIVRAISON', today, today),
    sumInvoicesByType(db, 'DEVIS', today, today),

    db.prepare('SELECT COUNT(*) AS val FROM products WHERE stock_quantity <= alert_threshold AND active = 1')
      .first<{ val: number }>(),

    db.prepare(`
      SELECT id, reference, name, description, category_id AS categoryId, NULL AS categoryName,
             purchase_price AS purchasePrice, selling_price AS sellingPrice,
             stock_quantity AS stockQuantity, alert_threshold AS alertThreshold,
             unit, active, 1 AS lowStock
      FROM products
      WHERE stock_quantity <= alert_threshold AND active = 1
      ORDER BY stock_quantity ASC
      LIMIT 10
    `).all(),
  ]);

  return c.json({
    totalProducts: totalProducts?.val ?? 0,
    totalCustomers: totalCustomers?.val ?? 0,
    totalSuppliers: totalSuppliers?.val ?? 0,
    lowStockProducts: lowStockRow?.val ?? 0,
    monthlyVentes,
    monthlyAchats,
    monthlyMarge: monthlyVentes - monthlyAchats,
    weeklyVentes,
    weeklyAchats,
    weeklyMarge: weeklyVentes - weeklyAchats,
    dailyMarge: dailyVentes - dailyAchats,
    lowStockAlerts: lowStockAlerts.results.map((r: Record<string, unknown>) => ({
      ...r,
      active: r.active === 1,
      lowStock: true,
    })),
  });
});

dashboardRoutes.get('/period', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');
  if (!from || !to) return c.json({ message: 'from et to requis' }, 400);

  const [ventes, achats] = await Promise.all([
    sumInvoicesByType(c.env.DB, 'BON_LIVRAISON', from, to),
    sumInvoicesByType(c.env.DB, 'DEVIS', from, to),
  ]);
  return c.json({ ventes, achats, marge: ventes - achats });
});
