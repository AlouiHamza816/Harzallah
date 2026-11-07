# Instructions — Patch frontend Angular pour Cloudflare Pages

## 1. Copier _redirects dans les assets Angular

Copier `_redirects` dans `didier-stock-frontend/src/`.

Puis dans `didier-stock-frontend/angular.json`, modifier le tableau `assets` :

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/_redirects"
]
```

## 2. Remplacer l'URL Worker dans _redirects

Dans `didier-stock-frontend/src/_redirects`, remplacer `WORKER_URL` par la vraie URL :

```
/api/* https://didier-stock-api.TON-SUBDOMAIN.workers.dev/api/:splat 200
/* /index.html 200
```

## 3. environment.prod.ts

Le fichier `environment.prod.ts` reste inchange (`apiUrl: '/api'`).
Le proxy _redirects de Cloudflare Pages redirige /api/* vers le Worker.
Aucun changement Angular supplementaire n'est necessaire.

## 4. Cloudflare Pages — Configuration du build

Dans le dashboard Cloudflare Pages > ton projet > Settings > Builds and deployments :

| Parametre             | Valeur                                      |
|-----------------------|---------------------------------------------|
| Build command         | `npm run build:prod`                        |
| Build output dir      | `dist/didier-stock-frontend/browser`        |
| Root directory        | `didier-stock-frontend`                     |
| Node.js version       | 18 ou 20                                    |

## 5. Variables d'environnement Pages (optionnel)

Si tu utilises un domaine custom, adapter CORS_ORIGINS dans `workers/wrangler.toml`.
