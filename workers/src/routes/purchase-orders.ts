import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const purchaseOrdersRoutes = new Hono<AppEnv>();

async function loadOrder(db: D1Database, id: number | string) {
  const order = await db.prepare(`
    SELECT po.*, s.id AS sid, s.code AS scode, s.name AS sname,
           s.phone AS sphone, s.email AS semail, s.nif AS snif
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = ?
  `).bind(id).first<Record<string, unknown>>();
  if (!order) return null;

  const { results: lines } = await db.prepare(`
    SELECT pol.*, p.id AS pid, p.reference AS pref, p.name AS pname, p.unit AS punit
    FROM purchase_order_lines pol
    LEFT JOIN products p ON p.id = pol.product_id
    WHERE pol.order_id = ? ORDER BY pol.id
  `).bind(id).all();

  return {
    id: order.id,
    number: order.number,
    date: order.date,
    status: order.status,
    notes: order.notes ?? null,
    taxRate: order.tax_rate,
    totalHT: order.total_ht,
    totalTTC: order.total_ttc,
    createdAt: order.created_at,
    supplierId: order.sid,
    supplierName: order.sname,
    supplierNif: order.snif ?? null,
    supplier: { id: order.sid, code: order.scode, name: order.sname, phone: order.sphone, email: order.semail, nif: order.snif },
    lines: (lines as Record<string, unknown>[]).map(l => ({
      id: l.id,
      productId: l.pid ?? null,
      productName: l.pname ?? null,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unit_price,
      totalHT: l.total_ht,
    })),
  };
}

function recalc(lines: Record<string, unknown>[], taxRate: number) {
  const totalHT = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0);
  return {
    totalHT: Math.round(totalHT * 100) / 100,
    totalTTC: Math.round(totalHT * (1 + taxRate / 100) * 100) / 100,
  };
}

purchaseOrdersRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT po.*, s.name AS supplier_name
    FROM purchase_orders po
    JOIN suppliers s ON s.id = po.supplier_id
    ORDER BY po.created_at DESC
  `).all();
  return c.json(results.map((r: Record<string, unknown>) => ({
    id: r.id, number: r.number, date: r.date, status: r.status,
    taxRate: r.tax_rate, totalHT: r.total_ht, totalTTC: r.total_ttc,
    createdAt: r.created_at, supplierId: r.supplier_id, supplierName: r.supplier_name,
  })));
});

purchaseOrdersRoutes.get('/:id', async (c) => {
  const order = await loadOrder(c.env.DB, c.req.param('id'));
  if (!order) return c.json({ message: 'Commande non trouvee' }, 404);
  return c.json(order);
});

purchaseOrdersRoutes.post('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const lines = (b.lines as Record<string, unknown>[]) ?? [];
  const taxRate = Number(b.taxRate ?? 0);
  const totals = recalc(lines, taxRate);

  const r = await c.env.DB.prepare(`
    INSERT INTO purchase_orders (number, date, supplier_id, status, notes, tax_rate, total_ht, total_ttc)
    VALUES (?,?,?,?,?,?,?,?) RETURNING id
  `).bind(b.number, b.date, b.supplierId, b.status ?? 'DRAFT', b.notes ?? null, taxRate, totals.totalHT, totals.totalTTC)
   .first<{ id: number }>();

  for (const l of lines) {
    const lHT = Math.round(Number(l.quantity) * Number(l.unitPrice) * 100) / 100;
    await c.env.DB.prepare(`
      INSERT INTO purchase_order_lines (order_id, product_id, description, quantity, unit_price, total_ht)
      VALUES (?,?,?,?,?,?)
    `).bind(r!.id, l.productId ?? null, l.description, l.quantity, l.unitPrice, lHT).run();
  }

  return c.json(await loadOrder(c.env.DB, r!.id), 201);
});

purchaseOrdersRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>();
  const lines = (b.lines as Record<string, unknown>[]) ?? [];
  const taxRate = Number(b.taxRate ?? 0);
  const totals = recalc(lines, taxRate);

  await c.env.DB.prepare(`
    UPDATE purchase_orders
    SET number=?, date=?, supplier_id=?, status=?, notes=?, tax_rate=?, total_ht=?, total_ttc=?
    WHERE id=?
  `).bind(b.number, b.date, b.supplierId, b.status ?? 'DRAFT', b.notes ?? null, taxRate, totals.totalHT, totals.totalTTC, id).run();

  await c.env.DB.prepare('DELETE FROM purchase_order_lines WHERE order_id = ?').bind(id).run();
  for (const l of lines) {
    const lHT = Math.round(Number(l.quantity) * Number(l.unitPrice) * 100) / 100;
    await c.env.DB.prepare(`
      INSERT INTO purchase_order_lines (order_id, product_id, description, quantity, unit_price, total_ht)
      VALUES (?,?,?,?,?,?)
    `).bind(id, l.productId ?? null, l.description, l.quantity, l.unitPrice, lHT).run();
  }

  const order = await loadOrder(c.env.DB, id);
  if (!order) return c.json({ message: 'Commande non trouvee' }, 404);
  return c.json(order);
});

purchaseOrdersRoutes.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const status = c.req.query('status');
  if (!status) return c.json({ message: 'status requis' }, 400);

  await c.env.DB.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').bind(status, id).run();

  // Statut RECEIVED → reception automatique en stock (ENTREE)
  if (status === 'RECEIVED') {
    const { results: lines } = await c.env.DB.prepare(
      'SELECT product_id, quantity FROM purchase_order_lines WHERE order_id = ? AND product_id IS NOT NULL'
    ).bind(id).all<Record<string, unknown>>();

    const po = await c.env.DB.prepare('SELECT number FROM purchase_orders WHERE id = ?')
      .bind(id).first<{ number: string }>();

    for (const l of lines) {
      const qty = Math.round(Number(l.quantity));
      await c.env.DB.prepare(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?'
      ).bind(qty, l.product_id).run();

      await c.env.DB.prepare(`
        INSERT INTO stock_movements (date, type, product_id, quantity, reference, notes)
        VALUES (datetime('now'), 'ENTREE', ?, ?, ?, 'Reception commande fournisseur')
      `).bind(l.product_id, qty, po?.number ?? null).run();
    }
  }

  return c.json(await loadOrder(c.env.DB, id));
});

purchaseOrdersRoutes.delete('/:id', async (c) => {
  await c.env.DB.prepare('DELETE FROM purchase_orders WHERE id = ?').bind(c.req.param('id')).run();
  return c.body(null, 204);
});
