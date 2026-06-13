#!/usr/bin/env node
import { execSync } from 'child_process';
import { rest, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

export async function run() {
  const { themes } = await rest(TARGET_STORE, TARGET_TOKEN, 'GET', '/themes.json');
  const main = themes.find(t => t.role === 'main');
  if (!main) throw new Error(`No published theme found on ${TARGET_STORE}`);
  console.log(`  Pushing to theme "${main.name}" (id: ${main.id}) on ${TARGET_STORE}...`);
  execSync(`shopify theme push --store ${TARGET_STORE} --theme ${main.id} --allow-live`, { stdio: 'inherit' });
  console.log('  ✓ Theme pushed');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
