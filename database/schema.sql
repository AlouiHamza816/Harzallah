-- Schema Cloudflare D1 (SQLite)
-- Migration depuis PostgreSQL (didier_stock_v2)

PRAGMA foreign_keys = ON;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT    UNIQUE NOT NULL,
  password    TEXT    NOT NULL,
  full_name   TEXT    NOT NULL,
  role        TEXT    NOT NULL DEFAULT 'USER' CHECK(role IN ('ADMIN','USER')),
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT UNIQUE NOT NULL,
  description TEXT
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference        TEXT    UNIQUE NOT NULL,
  name             TEXT    NOT NULL,
  description      TEXT,
  category_id      INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  purchase_price   REAL    NOT NULL DEFAULT 0,
  selling_price    REAL    NOT NULL DEFAULT 0,
  stock_quantity   INTEGER NOT NULL DEFAULT 0,
  alert_threshold  INTEGER NOT NULL DEFAULT 5,
  unit             TEXT    NOT NULL DEFAULT 'pcs',
  active           INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- PRODUCT BUNDLES
-- ============================================================
CREATE TABLE IF NOT EXISTS product_bundles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  reference     TEXT    UNIQUE NOT NULL,
  name          TEXT    NOT NULL,
  description   TEXT,
  selling_price REAL    NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS bundle_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  bundle_id  INTEGER NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  code    TEXT    UNIQUE NOT NULL,
  name    TEXT    NOT NULL,
  address TEXT,
  phone   TEXT,
  email   TEXT,
  nif     TEXT,
  type    TEXT    NOT NULL DEFAULT 'COMPANY' CHECK(type IN ('COMPANY','INDIVIDUAL'))
);

-- ============================================================
-- SUPPLIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  address        TEXT,
  phone          TEXT,
  email          TEXT,
  nif            TEXT,
  contact_person TEXT
);

-- ============================================================
-- INVOICES (FACTURE / DEVIS / BON_LIVRAISON)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  number            TEXT    UNIQUE NOT NULL,
  type              TEXT    NOT NULL CHECK(type IN ('FACTURE','DEVIS','BON_LIVRAISON')),
  status            TEXT    NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SENT','PAID','CANCELLED')),
  date              TEXT    NOT NULL,
  due_date          TEXT,
  customer_id       INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id       INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  passenger_name    TEXT,
  passenger_address TEXT,
  passenger_nif     TEXT,
  driver_name       TEXT,
  truck_plate       TEXT,
  notes             TEXT,
  tax_rate          REAL    NOT NULL DEFAULT 0,
  global_discount   REAL    NOT NULL DEFAULT 0,
  stamp_duty        REAL    NOT NULL DEFAULT 0,
  total_ht          REAL    NOT NULL DEFAULT 0,
  total_tva         REAL    NOT NULL DEFAULT 0,
  total_ttc         REAL    NOT NULL DEFAULT 0,
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id       INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id       INTEGER REFERENCES products(id) ON DELETE SET NULL,
  description      TEXT    NOT NULL,
  dimension        TEXT,
  quantity         REAL    NOT NULL DEFAULT 1,
  unit_price       REAL    NOT NULL DEFAULT 0,
  discount_percent REAL    NOT NULL DEFAULT 0,
  total_ht         REAL    NOT NULL DEFAULT 0
);

-- ============================================================
-- PURCHASE ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  number      TEXT    UNIQUE NOT NULL,
  date        TEXT    NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status      TEXT    NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','SENT','RECEIVED','CANCELLED')),
  notes       TEXT,
  tax_rate    REAL    NOT NULL DEFAULT 0,
  total_ht    REAL    NOT NULL DEFAULT 0,
  total_ttc   REAL    NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  description TEXT    NOT NULL,
  quantity    REAL    NOT NULL DEFAULT 1,
  unit_price  REAL    NOT NULL DEFAULT 0,
  total_ht    REAL    NOT NULL DEFAULT 0
);

-- ============================================================
-- STOCK MOVEMENTS
-- Types: ENTREE (ajoute au stock), SORTIE (retire du stock),
--        AJUSTEMENT (fixe le stock a la valeur quantity)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT    NOT NULL DEFAULT (datetime('now')),
  type       TEXT    NOT NULL CHECK(type IN ('ENTREE','SORTIE','AJUSTEMENT')),
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INTEGER NOT NULL,
  reference  TEXT,
  notes      TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- COMPANY SETTINGS (singleton)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL DEFAULT 'Mon Entreprise',
  address      TEXT,
  phone        TEXT,
  email        TEXT,
  nif          TEXT,
  rib          TEXT,
  logo         TEXT,
  currency     TEXT NOT NULL DEFAULT 'XAF' CHECK(currency IN ('TND','XAF','EUR','USD')),
  tax_rate     REAL NOT NULL DEFAULT 19.25
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active      ON products(active);
CREATE INDEX IF NOT EXISTS idx_invoices_type        ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer    ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date        ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_inv    ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier          ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pol_order            ON purchase_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_sm_product           ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_sm_date              ON stock_movements(date);
