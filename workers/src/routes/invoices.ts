import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const invoicesRoutes = new Hono<AppEnv>();

// ============================================================
// Helpers
// ============================================================

async function generateNumber(db: D1Database, type: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === 'FACTURE' ? 'FAC' : type === 'DEVIS' ? 'DV' : 'BL';
  const row = await db.prepare(`
    SELECT COALESCE(MAX(CAST(SUBSTR(number, LENGTH(number)-3, 4) AS INTEGER)), 0) AS max_seq
    FROM invoices WHERE type = ? AND strftime('%Y', date) = ?
  `).bind(type, String(year)).first<{ max_seq: number }>();
  const next = (row?.max_seq ?? 0) + 1;
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

function recalcTotals(lines: Record<string, unknown>[], taxRate: number, globalDiscount: number, stampDuty: number) {
  const rawHT = lines.reduce((sum, l) => {
    const sub = Number(l.quantity) * Number(l.unitPrice);
    const disc = sub * (Number(l.discountPercent ?? 0) / 100);
    return sum + (sub - disc);
  }, 0);
  const discountAmt = rawHT * (globalDiscount / 100);
  const netHT = rawHT - discountAmt;
  const totalTVA = netHT * (taxRate / 100);
  const totalTTC = netHT + totalTVA + stampDuty;
  return {
    totalHT: round2(rawHT),
    totalTVA: round2(totalTVA),
    totalTTC: round2(totalTTC),
  };
}

function round2(v: number) { return Math.round(v * 100) / 100; }

async function loadInvoice(db: D1Database, id: number | string) {
  const inv = await db.prepare(`
    SELECT i.*,
           c.id AS cid, c.code AS ccode, c.name AS cname, c.address AS caddress,
           c.phone AS cphone, c.nif AS cnif, c.type AS ctype,
           s.id AS sid, s.name AS sname, s.address AS saddress, s.nif AS snif
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    WHERE i.id = ?
  `).bind(id).first<Record<string, unknown>>();
  if (!inv) return null;

  const { results: lines } = await db.prepare(`
    SELECT il.*, p.id AS pid, p.name AS pname, p.reference AS pref
    FROM invoice_lines il
    LEFT JOIN products p ON p.id = il.product_id
    WHERE il.invoice_id = ? ORDER BY il.id
  `).bind(id).all();

  return mapInvoice(inv, lines as Record<string, unknown>[]);
}

function mapInvoice(inv: Record<string, unknown>, lines: Record<string, unknown>[]) {
  return {
    id: inv.id,
    number: inv.number,
    type: inv.type,
    status: inv.status,
    date: inv.date,
    dueDate: inv.due_date ?? null,
    notes: inv.notes ?? null,
    taxRate: inv.tax_rate,
    globalDiscount: inv.global_discount,
    stampDuty: inv.stamp_duty,
    totalHT: inv.total_ht,
    totalTVA: inv.total_tva,
    totalTTC: inv.total_ttc,
    driverName: inv.driver_name ?? null,
    truckPlate: inv.truck_plate ?? null,
    passengerName: inv.passenger_name ?? null,
    passengerAddress: inv.passenger_address ?? null,
    passengerNif: inv.passenger_nif ?? null,
    createdAt: inv.created_at,
    // Client : depuis la fiche customer ou depuis les champs passager
    customerId: inv.cid ?? null,
    customerName: inv.cname ?? inv.passenger_name ?? null,
    customerAddress: inv.caddress ?? inv.passenger_address ?? null,
    customerNif: inv.cnif ?? inv.passenger_nif ?? null,
    // Fournisseur
    supplierId: inv.sid ?? null,
    supplierName: inv.sname ?? null,
    supplierAddress: inv.saddress ?? null,
    lines: lines.map(l => ({
      id: l.id,
      productId: l.pid ?? null,
      productName: l.pname ?? null,
      description: l.description,
      dimension: l.dimension ?? null,
      quantity: l.quantity,
      unitPrice: l.unit_price,
      discountPercent: l.discount_percent,
      totalHT: l.total_ht,
    })),
  };
}

async function applyStockForLines(
  db: D1Database,
  lines: Record<string, unknown>[],
  delta: number    // +1 = ajouter au stock, -1 = retirer
) {
  for (const l of lines) {
    if (!l.product_id) continue;
    const qty = Math.round(Number(l.quantity)) * delta;
    await db.prepare(
      'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?'
    ).bind(qty, l.product_id).run();
  }
}

// ============================================================
// Routes
// ============================================================

invoicesRoutes.get('/', async (c) => {
  const type = c.req.query('type');
  const params: unknown[] = [];
  let sql = `
    SELECT i.*, c.name AS customer_name
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
  `;
  if (type) { sql += ' WHERE i.type = ?'; params.push(type); }
  sql += ' ORDER BY i.created_at DESC';
  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json(results.map((r: Record<string, unknown>) => ({
    id: r.id, number: r.number, type: r.type, status: r.status, date: r.date,
    dueDate: r.due_date ?? null, totalHT: r.total_ht, totalTVA: r.total_tva,
    totalTTC: r.total_ttc, taxRate: r.tax_rate, createdAt: r.created_at,
    customerName: r.customer_name ?? r.passenger_name ?? null,
  })));
});

invoicesRoutes.get('/:id/pdf', (c) => {
  return c.json({ message: 'PDF genere cote client (html2canvas/jspdf)' }, 501);
});

invoicesRoutes.get('/:id', async (c) => {
  const inv = await loadInvoice(c.env.DB, c.req.param('id'));
  if (!inv) return c.json({ message: 'Document non trouve' }, 404);
  return c.json(inv);
});

invoicesRoutes.post('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const lines = (b.lines as Record<string, unknown>[]) ?? [];
  const taxRate = Number(b.taxRate ?? 0);
  const globalDiscount = Number(b.globalDiscount ?? 0);
  const stampDuty = Number(b.stampDuty ?? 0);
  const totals = recalcTotals(lines, taxRate, globalDiscount, stampDuty);
  const user = c.get('jwtPayload');

  const number = await generateNumber(c.env.DB, b.type as string);

  const r = await c.env.DB.prepare(`
    INSERT INTO invoices
      (number, type, status, date, due_date, customer_id, supplier_id,
       passenger_name, passenger_address, passenger_nif,
       driver_name, truck_plate, notes,
       tax_rate, global_discount, stamp_duty, total_ht, total_tva, total_ttc, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id
  `).bind(
    number, b.type, 'DRAFT',
    b.date ?? new Date().toISOString().slice(0, 10),
    b.dueDate ?? null, b.customerId ?? null, b.supplierId ?? null,
    b.passengerName ?? null, b.passengerAddress ?? null, b.passengerNif ?? null,
    b.driverName ?? null, b.truckPlate ?? null, b.notes ?? null,
    taxRate, globalDiscount, stampDuty,
    totals.totalHT, totals.totalTVA, totals.totalTTC,
    user?.sub ?? null
  ).first<{ id: number }>();

  for (const l of lines) {
    const sub = Number(l.quantity) * Number(l.unitPrice);
    const disc = sub * (Number(l.discountPercent ?? 0) / 100);
    await c.env.DB.prepare(`
      INSERT INTO invoice_lines
        (invoice_id, product_id, description, dimension, quantity, unit_price, discount_percent, total_ht)
      VALUES (?,?,?,?,?,?,?,?)
    `).bind(r!.id, l.productId ?? null, l.description, l.dimension ?? null,
             l.quantity, l.unitPrice, l.discountPercent ?? 0, round2(sub - disc)).run();
  }

  // DEVIS = bon de sortie → ajoute au stock a la creation
  if (b.type === 'DEVIS') {
    await applyStockForLines(c.env.DB, lines, +1);
  }

  return c.json(await loadInvoice(c.env.DB, r!.id), 201);
});

invoicesRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const b = await c.req.json<Record<string, unknown>>();
  const newLines = (b.lines as Record<string, unknown>[]) ?? [];
  const taxRate = Number(b.taxRate ?? 0);
  const globalDiscount = Number(b.globalDiscount ?? 0);
  const stampDuty = Number(b.stampDuty ?? 0);
  const totals = recalcTotals(newLines, taxRate, globalDiscount, stampDuty);

  const existing = await c.env.DB.prepare('SELECT type, status FROM invoices WHERE id = ?')
    .bind(id).first<{ type: string; status: string }>();
  if (!existing) return c.json({ message: 'Document non trouve' }, 404);

  const isDevis = existing.type === 'DEVIS';
  const isSalesDoc = existing.type === 'FACTURE' || existing.type === 'BON_LIVRAISON';
  const stockImpacted = isDevis || (isSalesDoc && existing.status !== 'DRAFT');

  if (stockImpacted) {
    // Reverser l'ancien impact
    const { results: oldLines } = await c.env.DB.prepare(
      'SELECT product_id, quantity FROM invoice_lines WHERE invoice_id = ?'
    ).bind(id).all<Record<string, unknown>>();
    if (isDevis) await applyStockForLines(c.env.DB, oldLines, -1);
    else await applyStockForLines(c.env.DB, oldLines, +1);

    // Appliquer le nouvel impact
    if (isDevis) await applyStockForLines(c.env.DB, newLines, +1);
    else await applyStockForLines(c.env.DB, newLines, -1);
  }

  await c.env.DB.prepare(`
    UPDATE invoices SET
      date=?, due_date=?, customer_id=?, supplier_id=?,
      passenger_name=?, passenger_address=?, passenger_nif=?,
      driver_name=?, truck_plate=?, notes=?,
      tax_rate=?, global_discount=?, stamp_duty=?, total_ht=?, total_tva=?, total_ttc=?
    WHERE id=?
  `).bind(
    b.date, b.dueDate ?? null, b.customerId ?? null, b.supplierId ?? null,
    b.passengerName ?? null, b.passengerAddress ?? null, b.passengerNif ?? null,
    b.driverName ?? null, b.truckPlate ?? null, b.notes ?? null,
    taxRate, globalDiscount, stampDuty,
    totals.totalHT, totals.totalTVA, totals.totalTTC, id
  ).run();

  await c.env.DB.prepare('DELETE FROM invoice_lines WHERE invoice_id = ?').bind(id).run();
  for (const l of newLines) {
    const sub = Number(l.quantity) * Number(l.unitPrice);
    const disc = sub * (Number(l.discountPercent ?? 0) / 100);
    await c.env.DB.prepare(`
      INSERT INTO invoice_lines
        (invoice_id, product_id, description, dimension, quantity, unit_price, discount_percent, total_ht)
      VALUES (?,?,?,?,?,?,?,?)
    `).bind(id, l.productId ?? null, l.description, l.dimension ?? null,
             l.quantity, l.unitPrice, l.discountPercent ?? 0, round2(sub - disc)).run();
  }

  return c.json(await loadInvoice(c.env.DB, id));
});

invoicesRoutes.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  const newStatus = c.req.query('status');
  if (!newStatus) return c.json({ message: 'status requis' }, 400);

  const inv = await c.env.DB.prepare('SELECT type, status FROM invoices WHERE id = ?')
    .bind(id).first<{ type: string; status: string }>();
  if (!inv) return c.json({ message: 'Document non trouve' }, 404);

  // FACTURE/BON_LIVRAISON : DRAFT → SENT retire le stock
  if ((inv.type === 'FACTURE' || inv.type === 'BON_LIVRAISON')
      && newStatus === 'SENT' && inv.status === 'DRAFT') {
    const { results: lines } = await c.env.DB.prepare(
      'SELECT product_id, quantity FROM invoice_lines WHERE invoice_id = ?'
    ).bind(id).all<Record<string, unknown>>();
    await applyStockForLines(c.env.DB, lines, -1);
  }

  await c.env.DB.prepare('UPDATE invoices SET status = ? WHERE id = ?').bind(newStatus, id).run();
  return c.json(await loadInvoice(c.env.DB, id));
});

invoicesRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const inv = await c.env.DB.prepare('SELECT type, status FROM invoices WHERE id = ?')
    .bind(id).first<{ type: string; status: string }>();
  if (!inv) return c.body(null, 204);

  const isDevis = inv.type === 'DEVIS';
  const isSalesDoc = inv.type === 'FACTURE' || inv.type === 'BON_LIVRAISON';

  if (isDevis || (isSalesDoc && inv.status !== 'DRAFT')) {
    const { results: lines } = await c.env.DB.prepare(
      'SELECT product_id, quantity FROM invoice_lines WHERE invoice_id = ?'
    ).bind(id).all<Record<string, unknown>>();
    // DEVIS: on enleve ce qui avait ete ajoute
    // FACTURE/BON_LIVRAISON: on restitue ce qui avait ete retire
    await applyStockForLines(c.env.DB, lines, isDevis ? -1 : +1);
  }

  await c.env.DB.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});
