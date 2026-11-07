# harzallah-migration — Cloudflare (Option B)

Migration complète de **Didier Stock** vers Cloudflare (100% gratuit) :

| Original              | Cloudflare              |
|-----------------------|-------------------------|
| Angular 17 (Docker)   | Cloudflare **Pages**    |
| Spring Boot (Java 17) | Cloudflare **Workers** (Hono.js + TypeScript) |
| PostgreSQL             | Cloudflare **D1** (SQLite) |

## Structure

```
harzallah-migration/
├── database/
│   ├── schema.sql          # Schema D1 (SQLite)
│   └── seed.sql            # Données initiales + admin
├── workers/
│   ├── wrangler.toml       # Config Cloudflare Workers
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts        # Entry point Hono
│       ├── types.ts        # Types partagés
│       ├── auth/
│       │   └── jwt.ts      # JWT (Web Crypto API natif)
│       └── routes/
│           ├── auth.ts
│           ├── categories.ts
│           ├── products.ts
│           ├── bundles.ts
│           ├── customers.ts
│           ├── suppliers.ts
│           ├── invoices.ts
│           ├── purchase-orders.ts
│           ├── stock-movements.ts
│           ├── dashboard.ts
│           ├── company-settings.ts
│           ├── users.ts
│           └── public.ts
├── frontend-patch/
│   ├── INSTRUCTIONS.md     # Quoi modifier dans le frontend Angular
│   ├── _redirects          # SPA routing + proxy /api → Worker
│   └── environment.prod.ts # URL Worker
└── .github/
    └── workflows/
        ├── deploy-frontend.yml   # CF Pages CI/CD
        └── deploy-worker.yml     # CF Workers CI/CD
```

## Guide de déploiement

### Etape 1 — Créer la base D1

```bash
# Installer Wrangler
npm install -g wrangler

# Se connecter
wrangler login

# Créer la base D1
wrangler d1 create didier-stock-db
# → Copier le database_id affiché et le coller dans workers/wrangler.toml

# Appliquer le schema
cd workers
npm install
npm run db:migrate:remote

# Générer le hash bcrypt du mot de passe admin puis seeder
node -e "const b = require('bcryptjs'); console.log(b.hashSync('Admin@123', 10))"
# Copier le hash dans database/seed.sql (remplacer HASH_PLACEHOLDER)
npm run db:seed:remote
```

### Etape 2 — Configurer et déployer le Worker

```bash
cd workers

# Definir le secret JWT (jamais dans wrangler.toml)
wrangler secret put JWT_SECRET
# → Entrer une chaine secrete longue (ex: openssl rand -hex 32)

# Déployer
npm run deploy
# → Copier l'URL affichée : https://didier-stock-api.SUBDOMAIN.workers.dev
```

### Etape 3 — Configurer le frontend Angular

1. Remplacer `didier-stock-frontend/src/environments/environment.prod.ts` par `frontend-patch/environment.prod.ts`
2. Remplacer l'URL Worker dans `environment.prod.ts`
3. Copier `frontend-patch/_redirects` dans `didier-stock-frontend/src/`
4. Dans `angular.json`, ajouter `"src/_redirects"` aux assets :
   ```json
   "assets": ["src/favicon.ico", "src/assets", "src/_redirects"]
   ```

### Etape 4 — Déployer le frontend sur Cloudflare Pages

Dans le dashboard Cloudflare Pages > Create a project > Connect to Git :
- Build command : `npm run build:prod`
- Build output directory : `dist/didier-stock-frontend/browser`
- Root directory : `didier-stock-frontend`

Ou via CI/CD (voir `.github/workflows/deploy-frontend.yml`).

### Etape 5 — Configurer les secrets GitHub Actions

Dans Settings > Secrets and variables > Actions de ton repo :

| Secret | Valeur |
|--------|--------|
| `CF_API_TOKEN` | Token Cloudflare (Edit Workers + Pages) |
| `CF_ACCOUNT_ID` | Ton Account ID Cloudflare |
| `CF_PAGES_PROJECT_NAME` | Nom du projet Pages créé |

## Credentials par défaut

- Email : `admin@didier.com`
- Mot de passe : `Admin@123`

## Notes importantes

- Les PDFs sont générés côté client (html2canvas/jspdf) — le Worker retourne 501 pour `/api/invoices/:id/pdf` (non utilisé).
- Les mots de passe existants (bcrypt PostgreSQL) sont compatibles avec `bcryptjs` dans le Worker.
- D1 est SQLite : pas de `SERIAL`, les ENUM deviennent des CHECK constraints.
