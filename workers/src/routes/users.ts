import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { AppEnv } from '../types';

export const usersRoutes = new Hono<AppEnv>();

// Toutes ces routes necessitent le role ADMIN
usersRoutes.use('*', async (c, next) => {
  const user = c.get('jwtPayload');
  if (!user || user.role !== 'ADMIN') {
    return c.json({ message: 'Acces refuse — ADMIN requis' }, 403);
  }
  return next();
});

usersRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, email, full_name, role, active, created_at FROM users ORDER BY full_name'
  ).all();
  return c.json(results.map((u: Record<string, unknown>) => ({
    id: u.id, email: u.email, fullName: u.full_name,
    role: u.role, active: u.active === 1, createdAt: u.created_at
  })));
});

usersRoutes.post('/', async (c) => {
  const b = await c.req.json<{ email: string; password: string; fullName: string; role?: string }>();
  if (!b.email || !b.password || !b.fullName) {
    return c.json({ message: 'email, password et fullName requis' }, 400);
  }

  const hashed = await bcrypt.hash(b.password, 10);
  const r = await c.env.DB.prepare(`
    INSERT INTO users (email, password, full_name, role, active)
    VALUES (?,?,?,?,1) RETURNING id, email, full_name, role, active, created_at
  `).bind(b.email, hashed, b.fullName, b.role ?? 'USER').first<Record<string, unknown>>();

  return c.json({
    id: r!.id, email: r!.email, fullName: r!.full_name,
    role: r!.role, active: r!.active === 1, createdAt: r!.created_at
  }, 201);
});

usersRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<{ email?: string; password?: string; fullName?: string; role?: string; active?: boolean }>();

  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!existing) return c.json({ message: 'Utilisateur non trouve' }, 404);

  const password = b.password ? await bcrypt.hash(b.password, 10) : existing.password as string;

  await c.env.DB.prepare(`
    UPDATE users SET email=?, password=?, full_name=?, role=?, active=? WHERE id=?
  `).bind(
    b.email ?? existing.email, password,
    b.fullName ?? existing.full_name, b.role ?? existing.role,
    b.active !== undefined ? (b.active ? 1 : 0) : existing.active, id
  ).run();

  const u = await c.env.DB.prepare(
    'SELECT id, email, full_name, role, active, created_at FROM users WHERE id = ?'
  ).bind(id).first<Record<string, unknown>>();

  return c.json({ id: u!.id, email: u!.email, fullName: u!.full_name, role: u!.role, active: u!.active === 1 });
});

usersRoutes.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(c.req.param('id')).run();
  return c.body(null, 204);
});
