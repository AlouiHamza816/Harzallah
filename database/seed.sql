-- Seed initial data for Cloudflare D1
-- ============================================================
-- IMPORTANT : avant d'executer ce fichier, generer le hash bcrypt :
--   node -e "const b = require('bcryptjs'); console.log(b.hashSync('Admin@123', 10))"
-- Puis remplacer HASH_PLACEHOLDER ci-dessous par le hash obtenu.
-- ============================================================

-- Admin user
INSERT OR IGNORE INTO users (email, password, full_name, role, active)
VALUES (
  'admin@didier.com',
  '$2a$10$KXK1XcKUcay/Lv0GDOJQBOashnahXELKxnivfVZPM/2X0i2VN7.QK',
  'Administrateur',
  'ADMIN',
  1
);

-- Company settings (singleton)
INSERT OR IGNORE INTO company_settings (company_name, currency, tax_rate)
VALUES ('Didier Stock & Facturation', 'XAF', 19.25);

-- Categories de base
INSERT OR IGNORE INTO categories (name, description) VALUES ('Informatique', 'Materiel et peripheriques informatiques');
INSERT OR IGNORE INTO categories (name, description) VALUES ('Fournitures', 'Fournitures de bureau');
INSERT OR IGNORE INTO categories (name, description) VALUES ('Mobilier', 'Mobilier de bureau');
