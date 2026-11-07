import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const bundlesRoutes = new Hono<AppEnv>();

async function loadBundle(db: D1Database, id: number | string) {
  const bundle = await db.prepare('SELECT * FROM product_bundles WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!bundle) return null;

  const { results: items } = await db.prepare(`
    SELECT bi.id, bi.quantity,
           p.id AS product_id, p.reference, p.name, p.selling_price, p.unit
    FROM bundle_items bi
    JOIN products p ON p.id = bi.product_id
    WHERE bi.bundle_id = ?
  `).bind(id).all();

  return {
    id: bundle.id,
    reference: bundle.reference,
    name: bundle.name,
    description: bundle.description,
    sellingPrice: bundle.selling_price,
    active: bundle.active === 1,
    items: items.map((i: Record<string, unknown>) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.name ?? null,
      productUnit: i.unit ?? null,
      quantity: i.quantity,
    }))
  };
}

bundlesRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM product_bundles ORDER BY name'
  ).all();

  const bundles = await Promise.all(
    results.map((b: Record<string, unknown>) => loadBundle(c.env.DB, b.id as number))
  );
  return c.json(bundles);
});

bundlesRoutes.get('/:id', async (c) => {
  const bundle = await loadBundle(c.env.DB, c.req.param('id'));
  if (!bundle) return c.json({ message: 'Bundle non trouve' }, 404);
  return c.json(bundle);
});

bundlesRoutes.post('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const items = (b.items as Record<string, unknown>[]) ?? [];

  const r = await c.env.DB.prepare(`
    INSERT INTO product_bundles (reference, name, description, selling_price, active)
    VALUES (?,?,?,?,?) RETURNING id
  `).bind(b.reference, b.name, b.description ?? null, b.sellingPrice ?? 0, b.active !== false ? 1 : 0)
   .first<{ id: number }>();

  for (const item of items) {
    await c.env.DB.prepare(
      'INSERT INTO bundle_items (bundle_id, product_id, quantity) VALUES (?,?,?)'
    ).bind(r!.id, item.productId, item.quantity).run();
  }

  return c.json(await loadBundle(c.env.DB, r!.id), 201);
});

bundlesRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>();
  const items = (b.items as Record<string, unknown>[]) ?? [];

  await c.env.DB.prepare(`
    UPDATE product_bundles SET reference=?, name=?, description=?, selling_price=?, active=?
    WHERE id=?
  `).bind(b.reference, b.name, b.description ?? null, b.sellingPrice ?? 0, b.active !== false ? 1 : 0, id).run();

  await c.env.DB.prepare('DELETE FROM bundle_items WHERE bundle_id = ?').bind(id).run();
  for (const item of items) {
    await c.env.DB.prepare(
      'INSERT INTO bundle_items (bundle_id, product_id, quantity) VALUES (?,?,?)'
    ).bind(id, item.productId, item.quantity).run();
  }

  const bundle = await loadBundle(c.env.DB, id);
  if (!bundle) return c.json({ message: 'Bundle non trouve' }, 404);
  return c.json(bundle);
});

bundlesRoutes.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM product_bundles WHERE id = ?').bind(c.req.param('id')).run();
  return c.body(null, 204);
});
