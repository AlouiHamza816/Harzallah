import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const stockMovementsRoutes = new Hono<AppEnv>();

stockMovementsRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT sm.*,
           p.id AS p_id, p.reference AS p_ref, p.name AS p_name, p.unit AS p_unit
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    ORDER BY sm.date DESC
  `).all();

  return c.json(results.map((r: Record<string, unknown>) => ({
    id: r.id,
    date: r.date,
    type: r.type,
    quantity: r.quantity,
    reference: r.reference ?? null,
    notes: r.notes ?? null,
    productId: r.p_id,
    productName: r.p_name,
  })));
});

stockMovementsRoutes.post('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const user = c.get('jwtPayload');
  const qty = Number(b.quantity);
  const type = b.type as string;

  if (!b.productId || !type || !qty) {
    return c.json({ message: 'productId, type et quantity requis' }, 400);
  }

  // Verifier stock suffisant pour SORTIE
  if (type === 'SORTIE') {
    const p = await c.env.DB.prepare('SELECT stock_quantity, name FROM products WHERE id = ?')
      .bind(b.productId).first<{ stock_quantity: number; name: string }>();
    if (!p) return c.json({ message: 'Produit non trouve' }, 404);
    if (p.stock_quantity < qty) {
      return c.json({ message: `Stock insuffisant pour ${p.name} (stock: ${p.stock_quantity})` }, 400);
    }
  }

  // Enregistrer le mouvement
  const r = await c.env.DB.prepare(`
    INSERT INTO stock_movements (date, type, product_id, quantity, reference, notes, created_by)
    VALUES (datetime('now'),?,?,?,?,?,?) RETURNING id
  `).bind(type, b.productId, qty, b.reference ?? null, b.notes ?? null, user?.sub ?? null)
   .first<{ id: number }>();

  // Mise a jour du stock :
  // ENTREE  → stock += qty
  // SORTIE  → stock -= qty
  // AJUSTEMENT → stock = qty (fixe directement)
  if (type === 'AJUSTEMENT') {
    await c.env.DB.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?')
      .bind(qty, b.productId).run();
  } else {
    const delta = type === 'ENTREE' ? qty : -qty;
    await c.env.DB.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
      .bind(delta, b.productId).run();
  }

  const row = await c.env.DB.prepare(`
    SELECT sm.*, p.id AS p_id, p.name AS p_name, p.reference AS p_ref, p.unit AS p_unit
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    WHERE sm.id = ?
  `).bind(r!.id).first<Record<string, unknown>>();

  return c.json({
    id: row!.id, date: row!.date, type: row!.type, quantity: row!.quantity,
    reference: row!.reference ?? null, notes: row!.notes ?? null,
    productId: row!.p_id, productName: row!.p_name,
  }, 201);
});
