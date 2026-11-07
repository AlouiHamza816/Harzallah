import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const customersRoutes = new Hono<AppEnv>();

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id, code: r.code, name: r.name, address: r.address ?? null,
    phone: r.phone ?? null, email: r.email ?? null, nif: r.nif ?? null, type: r.type,
  };
}

customersRoutes.get('/', async (c) => {
  const q = c.req.query('q');
  const params: unknown[] = [];
  let sql = 'SELECT * FROM customers';
  if (q) {
    sql += ' WHERE name LIKE ? OR code LIKE ? OR phone LIKE ?';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY name';
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.map(r => mapRow(r as Record<string, unknown>)));
});

customersRoutes.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?')
    .bind(c.req.param('id')).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'Client non trouve' }, 404);
  return c.json(mapRow(row));
});

customersRoutes.post('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const row = await c.env.DB.prepare(`
    INSERT INTO customers (code, name, address, phone, email, nif, type)
    VALUES (?,?,?,?,?,?,?) RETURNING *
  `).bind(b.code, b.name, b.address ?? null, b.phone ?? null,
           b.email ?? null, b.nif ?? null, b.type ?? 'COMPANY')
   .first<Record<string, unknown>>();
  return c.json(mapRow(row!), 201);
});

customersRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>();
  const row = await c.env.DB.prepare(`
    UPDATE customers SET code=?, name=?, address=?, phone=?, email=?, nif=?, type=?
    WHERE id=? RETURNING *
  `).bind(b.code, b.name, b.address ?? null, b.phone ?? null,
           b.email ?? null, b.nif ?? null, b.type ?? 'COMPANY', id)
   .first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'Client non trouve' }, 404);
  return c.json(mapRow(row));
});

customersRoutes.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(c.req.param('id')).run();
  return c.body(null, 204);
});
