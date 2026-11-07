#!/usr/bin/env node
/**
 * setup.js — Genere le hash bcrypt de Admin@123 et met a jour database/seed.sql
 *
 * Usage:
 *   cd harzallah-migration
 *   node scripts/setup.js
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '..', 'database', 'seed.sql');
const PASSWORD = 'Admin@123';
const ROUNDS = 10;

async function main() {
  console.log(`Generation du hash bcrypt pour "${PASSWORD}" (rounds=${ROUNDS})...`);
  const hash = await bcrypt.hash(PASSWORD, ROUNDS);
  console.log(`Hash: ${hash}`);

  let content = fs.readFileSync(SEED_FILE, 'utf8');
  if (!content.includes('HASH_PLACEHOLDER')) {
    console.log('HASH_PLACEHOLDER non trouve dans seed.sql (deja remplace ?)');
    return;
  }

  content = content.replace('HASH_PLACEHOLDER', hash);
  fs.writeFileSync(SEED_FILE, content, 'utf8');
  console.log('seed.sql mis a jour avec le hash bcrypt.');
  console.log('\nProchaine etape :');
  console.log('  cd workers && npm run db:migrate:remote && npm run db:seed:remote');
}

main().catch(console.error);
