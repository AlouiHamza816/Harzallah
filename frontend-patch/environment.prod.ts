// environment.prod.ts pour Cloudflare Pages
// Remplacer ce fichier dans : didier-stock-frontend/src/environments/environment.prod.ts
//
// Avec le proxy _redirects, /api est reecrit vers le Worker.
// Aucun changement d'URL necessaire cote Angular.
export const environment = {
  production: true,
  apiUrl: '/api'
};
