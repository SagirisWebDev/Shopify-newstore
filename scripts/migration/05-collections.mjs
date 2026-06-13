#!/usr/bin/env node
/**
 * Copies custom (manual) and smart (rule-based) collections from the source
 * store to the target store.
 *
 * - Smart collections: rules are copied as-is.
 * - Custom collections: product handles are matched by handle on the target.
 *
 * Skips collections whose handle already exists on the target.
 */
import { rest, restAll, SOURCE_STORE, SOURCE_TOKEN, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

async function getExistingHandles(store, token) {
  const [custom, smart] = await Promise.all([
    restAll(store, token, '/custom_collections.json?limit=250', 'custom_collections'),
    restAll(store, token, '/smart_collections.json?limit=250', 'smart_collections'),
  ]);
  return new Set([...custom, ...smart].map(c => c.handle));
}

async function getTargetProductIds(store, token) {
  const products = await restAll(store, token, '/products.json?limit=250&fields=id,handle', 'products');
  return Object.fromEntries(products.map(p => [p.handle, p.id]));
}

async function getCollectionProducts(store, token, collectionId) {
  const { collects } = await rest(store, token, 'GET', `/collects.json?collection_id=${collectionId}&limit=250`);
  return collects.map(c => c.product_id);
}

async function getProductHandle(store, token, productId) {
  const { product } = await rest(store, token, 'GET', `/products/${productId}.json?fields=handle`);
  return product.handle;
}

export async function run() {
  console.log(`  Fetching collections from ${SOURCE_STORE}...`);
  const [customSrc, smartSrc] = await Promise.all([
    restAll(SOURCE_STORE, SOURCE_TOKEN, '/custom_collections.json?limit=250', 'custom_collections'),
    restAll(SOURCE_STORE, SOURCE_TOKEN, '/smart_collections.json?limit=250', 'smart_collections'),
  ]);
  console.log(`  Found ${customSrc.length} custom, ${smartSrc.length} smart collection(s).`);

  const existingHandles  = await getExistingHandles(TARGET_STORE, TARGET_TOKEN);
  const targetProductIds = await getTargetProductIds(TARGET_STORE, TARGET_TOKEN);

  let created = 0, skipped = 0;

  // ── Smart collections ──
  for (const col of smartSrc) {
    if (existingHandles.has(col.handle)) {
      console.log(`  – SKIP  ${col.handle} (smart, already exists)`);
      skipped++; continue;
    }
    const { smart_collection } = await rest(TARGET_STORE, TARGET_TOKEN, 'POST', '/smart_collections.json', {
      smart_collection: {
        title:          col.title,
        handle:         col.handle,
        body_html:      col.body_html,
        rules:          col.rules,
        disjunctive:    col.disjunctive,
        published:      col.published_at !== null,
        sort_order:     col.sort_order,
      },
    });
    console.log(`  ✓ OK    ${col.handle} (smart)`);
    created++;
  }

  // ── Custom collections ──
  for (const col of customSrc) {
    if (existingHandles.has(col.handle)) {
      console.log(`  – SKIP  ${col.handle} (custom, already exists)`);
      skipped++; continue;
    }
    const { custom_collection } = await rest(TARGET_STORE, TARGET_TOKEN, 'POST', '/custom_collections.json', {
      custom_collection: {
        title:      col.title,
        handle:     col.handle,
        body_html:  col.body_html,
        published:  col.published_at !== null,
        sort_order: col.sort_order,
      },
    });

    // Copy product memberships by matching handles
    const sourceProductIds = await getCollectionProducts(SOURCE_STORE, SOURCE_TOKEN, col.id);
    let linked = 0;
    for (const srcId of sourceProductIds) {
      const handle   = await getProductHandle(SOURCE_STORE, SOURCE_TOKEN, srcId);
      const targetId = targetProductIds[handle];
      if (!targetId) { console.log(`    ⚠ product ${handle} not on target, skipping`); continue; }
      await rest(TARGET_STORE, TARGET_TOKEN, 'POST', '/collects.json', {
        collect: { product_id: targetId, collection_id: custom_collection.id },
      });
      linked++;
    }
    console.log(`  ✓ OK    ${col.handle} (custom, ${linked} product(s) linked)`);
    created++;
  }

  console.log(`\n  Collections: ${created} created, ${skipped} skipped`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
