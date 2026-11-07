import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const productsRoutes = new Hono<AppEnv>();

// Retourne le format plat attendu par Angular (ProductDto)
function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    reference: row.reference,
    name: row.name,
    description: row.description ?? null,
    categoryId: row.category_id ?? null,
    categoryName: row.cat_name ?? null,
    purchasePrice: row.purchase_price,
    sellingPrice: row.selling_price,
    stockQuantity: row.stock_quantity,
    alertThreshold: row.alert_threshold,
    unit: row.unit,
    active: row.active === 1,
    lowStock: Number(row.stock_quantity) <= Number(row.alert_threshold),
  };
}

const BASE = `
  SELECT p.*, c.name AS cat_name
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
`;

productsRoutes.get('/', async (c) => {
  const q = c.req.query('q');
  const params: unknown[] = [];
  let sql = BASE;
  if (q) {
    sql += ' WHERE (p.name LIKE ? OR p.reference LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY p.name';
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.map(r => mapRow(r as Record<string, unknown>)));
});

productsRoutes.get('/low-stock', async (c) => {
  const { results } = await c.env.DB.prepare(
    BASE + ' WHERE p.stock_quantity <= p.alert_threshold AND p.active = 1 ORDER BY p.name'
  ).all();
  return c.json(results.map(r => mapRow(r as Record<string, unknown>)));
});

productsRoutes.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(BASE + ' WHERE p.id = ?')
    .bind(c.req.param('id')).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'Produit non trouve' }, 404);
  return c.json(mapRow(row));
});

productsRoutes.post('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const r = await c.env.DB.prepare(`
    INSERT INTO products
      (reference, name, description, category_id, purchase_price, selling_price,
       stock_quantity, alert_threshold, unit, active)
    VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id
  `).bind(
    b.reference, b.name, b.description ?? null, b.categoryId ?? null,
    b.purchasePrice ?? 0, b.sellingPrice ?? 0, b.stockQuantity ?? 0,
    b.alertThreshold ?? 5, b.unit ?? 'pcs', b.active !== false ? 1 : 0
  ).first<{ id: number }>();

  const row = await c.env.DB.prepare(BASE + ' WHERE p.id = ?')
    .bind(r!.id).first<Record<string, unknown>>();
  return c.json(mapRow(row!), 201);
});

productsRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>();
  await c.env.DB.prepare(`
    UPDATE products SET reference=?, name=?, description=?, category_id=?,
      purchase_price=?, selling_price=?, stock_quantity=?,
      alert_threshold=?, unit=?, active=?
    WHERE id=?
  `).bind(
    b.reference, b.name, b.description ?? null, b.categoryId ?? null,
    b.purchasePrice ?? 0, b.sellingPrice ?? 0, b.stockQuantity ?? 0,
    b.alertThreshold ?? 5, b.unit ?? 'pcs', b.active !== false ? 1 : 0, id
  ).run();

  const row = await c.env.DB.prepare(BASE + ' WHERE p.id = ?')
    .bind(id).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'Produit non trouve' }, 404);
  return c.json(mapRow(row));
});

productsRoutes.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(c.req.param('id')).run();
  return c.body(null, 204);
});
