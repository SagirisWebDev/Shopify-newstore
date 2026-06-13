#!/usr/bin/env node
/**
 * Copies config/settings_data.json from the source store's published theme
 * to the target store's published theme, replacing it entirely.
 */
import { rest, SOURCE_STORE, SOURCE_TOKEN, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

async function getMainThemeId(store, token) {
  const { themes } = await rest(store, token, 'GET', '/themes.json');
  const main = themes.find(t => t.role === 'main');
  if (!main) throw new Error(`No published theme found on ${store}`);
  return main.id;
}

async function getSettingsData(store, token, themeId) {
  const { asset } = await rest(
    store, token, 'GET',
    `/themes/${themeId}/assets.json?asset[key]=config/settings_data.json`,
  );
  return JSON.parse(asset.value);
}

async function putSettingsData(store, token, themeId, settings) {
  await rest(store, token, 'PUT', `/themes/${themeId}/assets.json`, {
    asset: { key: 'config/settings_data.json', value: JSON.stringify(settings, null, 2) },
  });
}

export async function run() {
  console.log(`  Reading settings_data.json from ${SOURCE_STORE}...`);
  const sourceThemeId  = await getMainThemeId(SOURCE_STORE, SOURCE_TOKEN);
  const sourceSettings = await getSettingsData(SOURCE_STORE, SOURCE_TOKEN, sourceThemeId);

  console.log(`  Writing to ${TARGET_STORE}...`);
  const targetThemeId = await getMainThemeId(TARGET_STORE, TARGET_TOKEN);
  await putSettingsData(TARGET_STORE, TARGET_TOKEN, targetThemeId, sourceSettings);

  const keyCount = Object.keys(sourceSettings.current ?? {}).length;
  console.log(`  ✓ Copied settings_data.json (${keyCount} top-level current keys)`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
