import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const companySettingsRoutes = new Hono<AppEnv>();

function mapSettings(row: Record<string, unknown>) {
  return {
    id: row.id,
    companyName: row.company_name,
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    nif: row.nif ?? null,
    rib: row.rib ?? null,
    logo: row.logo ?? null,
    currency: row.currency ?? 'XAF',
    taxRate: row.tax_rate ?? 0,
  };
}

companySettingsRoutes.get('/', async (c) => {
  let row = await c.env.DB.prepare('SELECT * FROM company_settings LIMIT 1').first<Record<string, unknown>>();
  if (!row) {
    await c.env.DB.prepare(
      "INSERT INTO company_settings (company_name) VALUES ('Mon Entreprise')"
    ).run();
    row = await c.env.DB.prepare('SELECT * FROM company_settings LIMIT 1').first<Record<string, unknown>>();
  }
  return c.json(mapSettings(row!));
});

companySettingsRoutes.put('/', async (c) => {
  const b = await c.req.json<Record<string, unknown>>();

  const existing = await c.env.DB.prepare('SELECT id FROM company_settings LIMIT 1').first<{ id: number }>();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE company_settings SET
        company_name=?, address=?, phone=?, email=?, nif=?, rib=?, logo=?, currency=?, tax_rate=?
      WHERE id=?
    `).bind(
      b.companyName, b.address ?? null, b.phone ?? null, b.email ?? null,
      b.nif ?? null, b.rib ?? null, b.logo ?? null,
      b.currency ?? 'XAF', b.taxRate ?? 19.25, existing.id
    ).run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO company_settings (company_name, address, phone, email, nif, rib, logo, currency, tax_rate)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).bind(
      b.companyName, b.address ?? null, b.phone ?? null, b.email ?? null,
      b.nif ?? null, b.rib ?? null, b.logo ?? null,
      b.currency ?? 'XAF', b.taxRate ?? 19.25
    ).run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM company_settings LIMIT 1').first<Record<string, unknown>>();
  return c.json(mapSettings(row!));
});
