import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const publicRoutes = new Hono<AppEnv>();

// ============================================================
// Helpers (no-auth versions of invoice helpers)
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
           c.id AS cid, c.name AS cname, c.address AS caddress, c.nif AS cnif,
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
    customerId: inv.cid ?? null,
    customerName: inv.cname ?? inv.passenger_name ?? null,
    customerAddress: inv.caddress ?? inv.passenger_address ?? null,
    customerNif: inv.cnif ?? inv.passenger_nif ?? null,
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

async function applyStockForLines(db: D1Database, lines: Record<string, unknown>[], delta: number) {
  for (const l of lines) {
    if (!l.product_id) continue;
    const qty = Math.round(Number(l.quantity)) * delta;
    await db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?')
      .bind(qty, l.product_id).run();
  }
}

// ============================================================
// Company settings
// ============================================================

publicRoutes.get('/settings', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM company_settings LIMIT 1').first<Record<string, unknown>>();
  if (!row) return c.json({ companyName: 'Mon Entreprise', currency: 'DZD', taxRate: 0 });
  return c.json({
    id: row.id,
    companyName: row.company_name,
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    nif: row.nif ?? null,
    rib: row.rib ?? null,
    logo: row.logo ?? null,
    currency: row.currency ?? 'DZD',
    taxRate: row.tax_rate ?? 0,
  });
});

// ============================================================
// Customers
// ============================================================

publicRoutes.get('/customers', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, code, name, address, phone, email, nif, type FROM customers ORDER BY name'
  ).all();
  return c.json(results.map((r: Record<string, unknown>) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    address: r.address ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    nif: r.nif ?? null,
    type: r.type,
  })));
});

// ============================================================
// Suppliers
// ============================================================

publicRoutes.get('/suppliers', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, address, phone, email, nif FROM suppliers ORDER BY name'
  ).all();
  return c.json(results.map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    address: r.address ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    nif: r.nif ?? null,
  })));
});

// ============================================================
// Products
// ============================================================

publicRoutes.get('/products', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT p.id, p.reference, p.name, p.description,
           p.selling_price, p.purchase_price, p.stock_quantity,
           p.alert_threshold, p.unit, p.category_id,
           c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.active = 1
    ORDER BY p.name
  `).all();
  return c.json(results.map((r: Record<string, unknown>) => ({
    id: r.id,
    reference: r.reference,
    name: r.name,
    description: r.description ?? null,
    sellingPrice: r.selling_price,
    purchasePrice: r.purchase_price,
    stockQuantity: r.stock_quantity,
    alertThreshold: r.alert_threshold,
    unit: r.unit ?? null,
    categoryId: r.category_id ?? null,
    categoryName: r.category_name ?? null,
    lowStock: Number(r.stock_quantity) <= Number(r.alert_threshold),
  })));
});

// ============================================================
// Bundles
// ============================================================

publicRoutes.get('/bundles', async (c) => {
  const { results: bundles } = await c.env.DB.prepare(
    'SELECT * FROM product_bundles WHERE active = 1 ORDER BY name'
  ).all();

  const out = [];
  for (const b of bundles as Record<string, unknown>[]) {
    const { results: items } = await c.env.DB.prepare(`
      SELECT bi.*, p.name AS product_name, p.reference AS product_ref,
             p.selling_price AS product_price, p.purchase_price AS product_purchase_price
      FROM bundle_items bi
      LEFT JOIN products p ON p.id = bi.product_id
      WHERE bi.bundle_id = ?
    `).bind(b.id).all();
    out.push({
      id: b.id,
      name: b.name,
      description: b.description ?? null,
      sellingPrice: b.selling_price,
      items: items.map((i: Record<string, unknown>) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name ?? null,
        productRef: i.product_ref ?? null,
        quantity: i.quantity,
        unitPrice: i.product_price ?? null,
      })),
    });
  }
  return c.json(out);
});

// ============================================================
// Invoices (public — no auth)
// ============================================================

publicRoutes.get('/invoices', async (c) => {
  const type = c.req.query('type');
  const params: unknown[] = [];
  let sql = `
    SELECT i.id, i.number, i.type, i.status, i.date, i.due_date,
           i.total_ht, i.total_tva, i.total_ttc, i.tax_rate, i.created_at,
           c.name AS customer_name
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
    customerName: r.customer_name ?? null,
  })));
});

publicRoutes.get('/invoices/:id/pdf', async (c) => {
  const inv = await loadInvoice(c.env.DB, c.req.param('id'));
  if (!inv) return c.json({ message: 'Facture non trouvee' }, 404);
  return c.json(inv);
});

publicRoutes.get('/invoices/:id', async (c) => {
  const inv = await loadInvoice(c.env.DB, c.req.param('id'));
  if (!inv) return c.json({ message: 'Document non trouve' }, 404);
  return c.json(inv);
});

publicRoutes.post('/invoices', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();
  const lines = (b.lines as Record<string, unknown>[]) ?? [];
  const taxRate = Number(b.taxRate ?? 0);
  const globalDiscount = Number(b.globalDiscount ?? 0);
  const stampDuty = Number(b.stampDuty ?? 0);
  const totals = recalcTotals(lines, taxRate, globalDiscount, stampDuty);

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
    totals.totalHT, totals.totalTVA, totals.totalTTC, null
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

  if (b.type === 'DEVIS') {
    await applyStockForLines(c.env.DB, lines, +1);
  }

  return c.json(await loadInvoice(c.env.DB, r!.id), 201);
});

publicRoutes.put('/invoices/:id', async (c) => {
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
    const { results: oldLines } = await c.env.DB.prepare(
      'SELECT product_id, quantity FROM invoice_lines WHERE invoice_id = ?'
    ).bind(id).all<Record<string, unknown>>();
    if (isDevis) await applyStockForLines(c.env.DB, oldLines, -1);
    else await applyStockForLines(c.env.DB, oldLines, +1);

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

publicRoutes.patch('/invoices/:id/status', async (c) => {
  const id = c.req.param('id');
  const newStatus = c.req.query('status');
  if (!newStatus) return c.json({ message: 'status requis' }, 400);

  const inv = await c.env.DB.prepare('SELECT type, status FROM invoices WHERE id = ?')
    .bind(id).first<{ type: string; status: string }>();
  if (!inv) return c.json({ message: 'Document non trouve' }, 404);

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
