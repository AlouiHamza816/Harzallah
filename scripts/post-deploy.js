#!/usr/bin/env node
/**
 * post-deploy.js — Remplace WORKER_URL dans les fichiers _redirects
 *
 * Usage:
 *   node scripts/post-deploy.js https://didier-stock-api.MON-SUBDOMAIN.workers.dev
 */

const fs = require('fs');
const path = require('path');

const workerUrl = process.argv[2];
if (!workerUrl || !workerUrl.startsWith('http')) {
  console.error('Usage: node scripts/post-deploy.js <WORKER_URL>');
  console.error('Exemple: node scripts/post-deploy.js https://didier-stock-api.moncompte.workers.dev');
  process.exit(1);
}

// Supprimer le slash final si present
const cleanUrl = workerUrl.replace(/\/$/, '');

const FILES = [
  path.join(__dirname, '..', 'frontend-patch', '_redirects'),
  // Si le fichier a deja ete copie dans le frontend Angular :
  path.join(__dirname, '..', '..', 'didier-stockV2', 'new-bat-harzallah-stock',
            'didier-stock-frontend', 'src', '_redirects'),
];

for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('WORKER_URL')) {
    console.log(`${file} : WORKER_URL deja remplace`);
    continue;
  }
  content = content.replace(/WORKER_URL/g, cleanUrl);
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Mis a jour : ${file}`);
}

console.log(`\nWorker URL configuree : ${cleanUrl}`);
console.log('Le frontend Angular peut maintenant etre deploye sur Cloudflare Pages.');
