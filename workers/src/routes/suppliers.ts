import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const suppliersRoutes = new Hono<AppEnv>();

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id, code: r.code, name: r.name, address: r.address ?? null,
    phone: r.phone ?? null, email: r.email ?? null, nif: r.nif ?? null,
    contactPerson: r.contact_person ?? null,
  };
}

suppliersRoutes.get('/', async (c) => {
  const q = c.req.query('q');
  const params: unknown[] = [];
  let sql = 'SELECT * FROM suppliers';
  if (q) {
    sql += ' WHERE name LIKE ? OR code LIKE ?';
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY name';
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.map(r => mapRow(r as Record<string, unknown>)));
});

suppliersRoutes.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM suppliers WHERE id = ?')
    .bind(c.req.param('id')).first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'Fournisseur non trouve' }, 404);
  return c.json(mapRow(row));
});

suppliersRoutes.post('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const row = await c.env.DB.prepare(`
    INSERT INTO suppliers (code, name, address, phone, email, nif, contact_person)
    VALUES (?,?,?,?,?,?,?) RETURNING *
  `).bind(b.code, b.name, b.address ?? null, b.phone ?? null,
           b.email ?? null, b.nif ?? null, b.contactPerson ?? null)
   .first<Record<string, unknown>>();
  return c.json(mapRow(row!), 201);
});

suppliersRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>();
  const row = await c.env.DB.prepare(`
    UPDATE suppliers SET code=?, name=?, address=?, phone=?, email=?, nif=?, contact_person=?
    WHERE id=? RETURNING *
  `).bind(b.code, b.name, b.address ?? null, b.phone ?? null,
           b.email ?? null, b.nif ?? null, b.contactPerson ?? null, id)
   .first<Record<string, unknown>>();
  if (!row) return c.json({ message: 'Fournisseur non trouve' }, 404);
  return c.json(mapRow(row));
});

suppliersRoutes.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM suppliers WHERE id = ?').bind(c.req.param('id')).run();
  return c.body(null, 204);
});
