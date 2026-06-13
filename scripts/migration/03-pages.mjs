#!/usr/bin/env node
/**
 * Copies all pages from the source store to the target store.
 * Skips pages whose handle already exists on the target.
 */
import { rest, restAll, SOURCE_STORE, SOURCE_TOKEN, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

export async function run() {
  console.log(`  Fetching pages from ${SOURCE_STORE}...`);
  const sourcePages = await restAll(SOURCE_STORE, SOURCE_TOKEN, '/pages.json?limit=250', 'pages');
  console.log(`  Found ${sourcePages.length} page(s). Copying to ${TARGET_STORE}...\n`);

  const existingPages  = await restAll(TARGET_STORE, TARGET_TOKEN, '/pages.json?limit=250', 'pages');
  const existingHandles = new Set(existingPages.map(p => p.handle));

  let created = 0, skipped = 0;
  for (const page of sourcePages) {
    if (existingHandles.has(page.handle)) {
      console.log(`  – SKIP  ${page.handle} (already exists)`);
      skipped++;
      continue;
    }
    await rest(TARGET_STORE, TARGET_TOKEN, 'POST', '/pages.json', {
      page: {
        title:           page.title,
        handle:          page.handle,
        body_html:       page.body_html,
        published:       page.published_at !== null,
        template_suffix: page.template_suffix || '',
      },
    });
    console.log(`  ✓ OK    ${page.handle}`);
    created++;
  }

  console.log(`\n  Pages: ${created} created, ${skipped} skipped`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
