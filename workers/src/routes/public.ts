import { Hono } from 'hono';
import type { AppEnv } from '../types';

export const publicRoutes = new Hono<AppEnv>();

// Route publique pour PDF — renvoie les donnees JSON de la facture
// Le frontend Angular genere le PDF cote client via html2canvas/jspdf
publicRoutes.get('/invoices/:id/pdf', async (c) => {
  const id = c.req.param('id');
  const inv = await c.env.DB.prepare(`
    SELECT i.*, c.name AS customer_name, c.address AS customer_address,
           c.phone AS customer_phone, c.nif AS customer_nif
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.id = ?
  `).bind(id).first();

  if (!inv) return c.json({ message: 'Facture non trouvee' }, 404);

  const { results: lines } = await c.env.DB.prepare(`
    SELECT il.*, p.name AS product_name, p.reference AS product_ref
    FROM invoice_lines il
    LEFT JOIN products p ON p.id = il.product_id
    WHERE il.invoice_id = ?
    ORDER BY il.id
  `).bind(id).all();

  return c.json({ invoice: inv, lines });
});
