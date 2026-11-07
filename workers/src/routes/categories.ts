import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const categoriesRoutes = new Hono<AppEnv>();

categoriesRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM categories ORDER BY name'
  ).all();
  return c.json(results);
});

categoriesRoutes.post('/', async (c) => {
  const { name, description } = await c.req.json<{ name: string; description?: string }>();
  if (!name) return c.json({ message: 'Nom requis' }, 400);

  const row = await c.env.DB.prepare(
    'INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *'
  ).bind(name, description ?? null).first();

  return c.json(row, 201);
});

categoriesRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const { name, description } = await c.req.json<{ name: string; description?: string }>();

  const row = await c.env.DB.prepare(
    'UPDATE categories SET name = ?, description = ? WHERE id = ? RETURNING *'
  ).bind(name, description ?? null, id).first();

  if (!row) return c.json({ message: 'Categorie non trouvee' }, 404);
  return c.json(row);
});

categoriesRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});
