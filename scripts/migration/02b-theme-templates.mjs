#!/usr/bin/env node
/**
 * Syncs live template and section JSON assets from the source store's
 * published theme to the target store's published theme.
 *
 * Covers: templates/*.json, sections/*.json
 * These files store per-section settings (including color_scheme assignments)
 * that are set via the theme editor and are NOT part of the local theme files
 * pushed in step 01.
 */
import { rest, SOURCE_STORE, SOURCE_TOKEN, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

const SYNC_PREFIXES = ['templates/', 'sections/'];

async function getMainThemeId(store, token) {
  const { themes } = await rest(store, token, 'GET', '/themes.json');
  const main = themes.find(t => t.role === 'main');
  if (!main) throw new Error(`No published theme found on ${store}`);
  return main.id;
}

async function listAssets(store, token, themeId) {
  const { assets } = await rest(store, token, 'GET', `/themes/${themeId}/assets.json`);
  return assets;
}

async function getAsset(store, token, themeId, key) {
  const { asset } = await rest(
    store, token, 'GET',
    `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(key)}`,
  );
  return asset;
}

async function putAsset(store, token, themeId, key, value) {
  await rest(store, token, 'PUT', `/themes/${themeId}/assets.json`, {
    asset: { key, value },
  });
}

export async function run() {
  const [sourceThemeId, targetThemeId] = await Promise.all([
    getMainThemeId(SOURCE_STORE, SOURCE_TOKEN),
    getMainThemeId(TARGET_STORE, TARGET_TOKEN),
  ]);

  console.log(`  Listing assets on ${SOURCE_STORE} (theme ${sourceThemeId})...`);
  const allAssets = await listAssets(SOURCE_STORE, SOURCE_TOKEN, sourceThemeId);
  const jsonAssets = allAssets.filter(a => SYNC_PREFIXES.some(p => a.key.startsWith(p)) && a.key.endsWith('.json'));
  console.log(`  Found ${jsonAssets.length} template/section JSON asset(s) to sync.\n`);

  let synced = 0, failed = 0;
  for (const { key } of jsonAssets) {
    try {
      const asset = await getAsset(SOURCE_STORE, SOURCE_TOKEN, sourceThemeId, key);
      await putAsset(TARGET_STORE, TARGET_TOKEN, targetThemeId, key, asset.value);
      console.log(`  ✓ ${key}`);
      synced++;
    } catch (err) {
      console.warn(`  ⚠ ${key} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n  Synced: ${synced}, Failed: ${failed}`);
  if (failed > 0) throw new Error(`${failed} asset(s) failed to sync`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
