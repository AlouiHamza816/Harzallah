import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import type { AppEnv } from '../types';
import { signJwt } from '../auth/jwt';

export const authRoutes = new Hono<AppEnv>();

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ message: 'Email et mot de passe requis' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND active = 1'
  ).bind(email).first<{
    id: number; email: string; password: string;
    full_name: string; role: string;
  }>();

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ message: 'Identifiants invalides' }, 401);
  }

  const token = await signJwt(
    { sub: String(user.id), email: user.email, role: user.role, fullName: user.full_name },
    c.env.JWT_SECRET
  );

  // Format attendu par le frontend Angular (LoginResponse interface)
  return c.json({
    token,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
  });
});
