#!/usr/bin/env node
/**
 * Migrates product metafield definitions and values between two Shopify stores.
 * Moved from data/migrate-metafields.mjs — use this version going forward.
 *
 * Usage (standalone):
 *   node --env-file=.env scripts/migration/06-metafields.mjs [--defs-only | --values-only | --reset-defs]
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { gql, SOURCE_STORE, SOURCE_TOKEN, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, '../../data/metafields-fixture.json');

const FIELD_TYPES = {
  origin_country:       'single_line_text_field',
  origin_region:        'single_line_text_field',
  producer_farm_name:   'single_line_text_field',
  varietal:             'single_line_text_field',
  altitude:             'single_line_text_field',
  process:              'single_line_text_field',
  roast_level:          'single_line_text_field',
  roast_date:           'date',
  tasting_notes:        'list.single_line_text_field',
  brew_recommendations: 'json',
};

// ── Definitions ───────────────────────────────────────────────────────────

async function fetchSourceDefs() {
  const QUERY = `
    query FetchDefs($after: String) {
      metafieldDefinitions(ownerType: PRODUCT, first: 250, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { name namespace key type { name } description access { admin storefront } validations { name value } }
      }
    }
  `;
  const defs = [];
  let cursor = null;
  do {
    const data = await gql(SOURCE_STORE, SOURCE_TOKEN, QUERY, { after: cursor });
    defs.push(...data.metafieldDefinitions.nodes);
    cursor = data.metafieldDefinitions.pageInfo.hasNextPage ? data.metafieldDefinitions.pageInfo.endCursor : null;
  } while (cursor);
  return defs.filter(d => d.namespace === 'coffee');
}

async function fetchTargetDefs() {
  const QUERY = `
    query { metafieldDefinitions(ownerType: PRODUCT, first: 250) {
      nodes { id namespace key name type { name } }
    }}
  `;
  const data = await gql(TARGET_STORE, TARGET_TOKEN, QUERY);
  return data.metafieldDefinitions.nodes.filter(d => d.namespace === 'coffee');
}

async function pinDefinition(id) {
  const data = await gql(TARGET_STORE, TARGET_TOKEN, `
    mutation PinDef($id: ID!) {
      metafieldDefinitionPin(definitionId: $id) {
        pinnedDefinition { id }
        userErrors { field message }
      }
    }
  `, { id });
  const { userErrors } = data.metafieldDefinitionPin;
  if (userErrors.length) throw new Error(`Pin ${id}: ${JSON.stringify(userErrors)}`);
}

async function createDef(def) {
  const data = await gql(TARGET_STORE, TARGET_TOKEN, `
    mutation CreateDef($def: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $def) {
        createdDefinition { id namespace key }
        userErrors { field message code }
      }
    }
  `, { def: { ownerType: 'PRODUCT', name: def.name, namespace: def.namespace, key: def.key, type: def.type.name, description: def.description || undefined } });
  const { createdDefinition, userErrors } = data.metafieldDefinitionCreate;
  const fatal = userErrors.filter(e => e.code !== 'TAKEN');
  if (fatal.length) throw new Error(`${def.namespace}.${def.key}: ${JSON.stringify(fatal)}`);
  if (createdDefinition) await pinDefinition(createdDefinition.id);
  return userErrors.length ? 'existed' : 'created';
}

async function deleteDef(id) {
  const data = await gql(TARGET_STORE, TARGET_TOKEN, `
    mutation DeleteDef($id: ID!) {
      metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: true) {
        deletedDefinitionId
        userErrors { field message }
      }
    }
  `, { id });
  const { userErrors } = data.metafieldDefinitionDelete;
  if (userErrors.length) throw new Error(`Delete ${id}: ${JSON.stringify(userErrors)}`);
}

async function migrateDefs({ reset = false } = {}) {
  const sourceDefs = await fetchSourceDefs();
  if (reset) {
    const existing = await fetchTargetDefs();
    for (const d of existing) {
      await deleteDef(d.id);
      console.log(`    ✗ deleted ${d.namespace}.${d.key}`);
    }
  }
  for (const def of sourceDefs) {
    const result = await createDef(def);
    const icon = result === 'existed' ? '–' : '✓';
    console.log(`    ${icon} ${def.namespace}.${def.key} [${def.type.name}]${result === 'created' ? ' (pinned)' : ' (existed)'}`);
  }
}

// ── Values ────────────────────────────────────────────────────────────────

function serialize(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function fetchProductHandleMap() {
  const QUERY = `
    query FetchProducts($after: String) {
      products(first: 250, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { id handle }
      }
    }
  `;
  const map = {};
  let cursor = null;
  do {
    const data = await gql(TARGET_STORE, TARGET_TOKEN, QUERY, { after: cursor });
    for (const p of data.products.nodes) map[p.handle] = p.id;
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor);
  return map;
}

async function pushValues(handleMap) {
  const SET = `
    mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key }
        userErrors { field message }
      }
    }
  `;
  const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  let pushed = 0, skipped = 0;

  for (const entry of fixture) {
    const productId = handleMap[entry.handle];
    if (!productId) { console.log(`    ⚠ SKIP ${entry.handle} — not on target`); skipped++; continue; }

    const mfs = Object.entries(entry.metafields)
      .map(([key, raw]) => ({ key, value: serialize(raw), type: FIELD_TYPES[key] }))
      .filter(m => m.value && m.type);

    let ok = 0;
    const errs = [];
    for (const mf of mfs) {
      const data = await gql(TARGET_STORE, TARGET_TOKEN, SET, {
        metafields: [{ ownerId: productId, namespace: 'coffee', ...mf }],
      });
      data.metafieldsSet.userErrors.length
        ? errs.push(`${mf.key}: ${data.metafieldsSet.userErrors.map(e => e.message).join(', ')}`)
        : ok++;
    }

    if (errs.length) {
      console.log(`    ⚠ WARN ${entry.handle} (${ok}/${mfs.length})`);
      errs.forEach(e => console.log(`       ✗ ${e}`));
    } else {
      console.log(`    ✓ OK   ${entry.handle} (${mfs.length} fields)`);
    }
    pushed++;
  }
  console.log(`    Values: ${pushed} products, ${skipped} skipped`);
}

// ── run() export (called by index.mjs) ───────────────────────────────────

export async function run() {
  console.log(`  Migrating metafield definitions...`);
  await migrateDefs();
  console.log(`  Pushing metafield values...`);
  const handleMap = await fetchProductHandleMap();
  await pushValues(handleMap);
}

// ── Standalone ────────────────────────────────────────────────────────────

async function main() {
  const defsOnly   = process.argv.includes('--defs-only');
  const valuesOnly = process.argv.includes('--values-only');
  const resetDefs  = process.argv.includes('--reset-defs');

  if (!valuesOnly) {
    console.log(`Fetching/creating definitions...`);
    await migrateDefs({ reset: resetDefs });
  }
  if (!defsOnly) {
    console.log(`\nPushing values...`);
    const map = await fetchProductHandleMap();
    await pushValues(map);
  }
  console.log('\nDone.');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(err => { console.error('\n✗', err.message); process.exit(1); });
}
