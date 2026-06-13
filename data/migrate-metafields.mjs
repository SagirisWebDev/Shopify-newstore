#!/usr/bin/env node
/**
 * Migrates product metafield definitions and values between two Shopify stores.
 *
 * Step 1 (--defs): Reads all PRODUCT metafield definitions from the source store
 *                  and creates matching definitions on the target store.
 * Step 2 (--values): Reads metafields-fixture.json, looks up each product on the
 *                    target store by handle, and pushes all metafield values.
 *
 * Usage:
 *   SOURCE_STORE=src.myshopify.com SOURCE_TOKEN=shpat_xxx \
 *   TARGET_STORE=dst.myshopify.com TARGET_TOKEN=shpat_yyy \
 *   node data/migrate-metafields.mjs [--defs-only | --values-only]
 *
 * Omitting a flag runs both steps.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_VERSION = '2025-01';

const SOURCE_STORE = process.env.SOURCE_STORE;
const SOURCE_TOKEN = process.env.SOURCE_TOKEN;
const TARGET_STORE = process.env.TARGET_STORE;
const TARGET_TOKEN = process.env.TARGET_TOKEN;
const DEFS_ONLY    = process.argv.includes('--defs-only');
const VALUES_ONLY  = process.argv.includes('--values-only');
const RESET_DEFS   = process.argv.includes('--reset-defs');

if (!TARGET_STORE || !TARGET_TOKEN) {
  console.error('Missing required env vars: TARGET_STORE, TARGET_TOKEN');
  process.exit(1);
}
if (!VALUES_ONLY && (!SOURCE_STORE || !SOURCE_TOKEN)) {
  console.error('Missing required env vars: SOURCE_STORE, SOURCE_TOKEN (or pass --values-only)');
  process.exit(1);
}

// ── GraphQL helper ────────────────────────────────────────────────────────

async function gql(store, token, query, variables = {}) {
  const res = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${store}: ${await res.text()}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error(JSON.stringify(errors, null, 2));
  return data;
}

// ── Step 1: Fetch definitions from source ─────────────────────────────────

async function fetchDefinitions() {
  const QUERY = `
    query FetchDefs($after: String) {
      metafieldDefinitions(ownerType: PRODUCT, first: 250, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          name
          namespace
          key
          type { name }
          description
          access { admin storefront }
          validations { name value }
        }
      }
    }
  `;
  const defs = [];
  let cursor = null;
  do {
    const data = await gql(SOURCE_STORE, SOURCE_TOKEN, QUERY, { after: cursor });
    const page = data.metafieldDefinitions;
    defs.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return defs;
}

// ── Step 2: Create definitions on target ──────────────────────────────────

async function createDefinition(def) {
  const MUTATION = `
    mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id name namespace key }
        userErrors { field message code }
      }
    }
  `;
  const input = {
    ownerType:   'PRODUCT',
    name:        def.name,
    namespace:   def.namespace,
    key:         def.key,
    type:        def.type.name,
    description: def.description || undefined,
  };
  if (def.validations?.length) input.validations = def.validations;

  const data = await gql(TARGET_STORE, TARGET_TOKEN, MUTATION, { definition: input });
  const { createdDefinition, userErrors } = data.metafieldDefinitionCreate;
  const fatal = userErrors.filter(e => e.code !== 'TAKEN');
  if (fatal.length) throw new Error(`${def.namespace}.${def.key}: ${JSON.stringify(fatal)}`);
  if (createdDefinition) await pinDefinition(createdDefinition.id);
  return userErrors.length ? 'existed' : createdDefinition.id;
}

// ── Reset: delete coffee definitions from target, then recreate without validations ──

async function fetchTargetCoffeeDefinitions() {
  const QUERY = `
    query FetchTargetDefs($after: String) {
      metafieldDefinitions(ownerType: PRODUCT, first: 250, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { id namespace key name type { name } }
      }
    }
  `;
  const defs = [];
  let cursor = null;
  do {
    const data = await gql(TARGET_STORE, TARGET_TOKEN, QUERY, { after: cursor });
    const page = data.metafieldDefinitions;
    defs.push(...page.nodes.filter(d => d.namespace === 'coffee'));
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return defs;
}

async function pinDefinition(id) {
  const MUTATION = `
    mutation PinDef($definitionId: ID!) {
      metafieldDefinitionPin(definitionId: $definitionId) {
        pinnedDefinition { id pinnedPosition }
        userErrors { field message }
      }
    }
  `;
  const data = await gql(TARGET_STORE, TARGET_TOKEN, MUTATION, { definitionId: id });
  const { userErrors } = data.metafieldDefinitionPin;
  if (userErrors.length) throw new Error(`Pin ${id}: ${JSON.stringify(userErrors)}`);
}

async function deleteDefinition(id) {
  const MUTATION = `
    mutation DeleteDef($id: ID!) {
      metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: true) {
        deletedDefinitionId
        userErrors { field message }
      }
    }
  `;
  const data = await gql(TARGET_STORE, TARGET_TOKEN, MUTATION, { id });
  const { userErrors } = data.metafieldDefinitionDelete;
  if (userErrors.length) throw new Error(`Delete ${id}: ${JSON.stringify(userErrors)}`);
}

async function resetAndRecreateDefs(sourceDefs) {
  console.log(`\nFetching existing coffee definitions from ${TARGET_STORE}...`);
  const existing = await fetchTargetCoffeeDefinitions();
  console.log(`Deleting ${existing.length} existing definition(s)...`);
  for (const def of existing) {
    await deleteDefinition(def.id);
    console.log(`  ✗ deleted ${def.namespace}.${def.key}`);
  }
  console.log(`\nRecreating ${sourceDefs.length} definition(s) without validations...\n`);
  for (const def of sourceDefs) {
    const input = {
      ownerType:   'PRODUCT',
      name:        def.name,
      namespace:   def.namespace,
      key:         def.key,
      type:        def.type.name,
      description: def.description || undefined,
    };
    const MUTATION = `
      mutation CreateDef($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id name namespace key }
          userErrors { field message code }
        }
      }
    `;
    const data = await gql(TARGET_STORE, TARGET_TOKEN, MUTATION, { definition: input });
    const { createdDefinition, userErrors } = data.metafieldDefinitionCreate;
    if (userErrors.filter(e => e.code !== 'TAKEN').length) {
      throw new Error(`${def.namespace}.${def.key}: ${JSON.stringify(userErrors)}`);
    }
    if (createdDefinition) await pinDefinition(createdDefinition.id);
    console.log(`  ✓ ${def.namespace}.${def.key} [${def.type.name}] (pinned)`);
  }
}

// ── Step 3: Get handle → id map from target ───────────────────────────────

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
    const page = data.products;
    for (const p of page.nodes) map[p.handle] = p.id;
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return map;
}

// ── Step 4: Push values from fixture to target ────────────────────────────

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

function serialize(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

async function pushValues(handleMap) {
  const MUTATION = `
    mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { namespace key }
        userErrors { field message }
      }
    }
  `;

  const fixture = JSON.parse(readFileSync(join(__dirname, 'metafields-fixture.json'), 'utf8'));
  let pushed = 0, skipped = 0;

  for (const entry of fixture) {
    const productId = handleMap[entry.handle];
    if (!productId) {
      console.log(`  ⚠ SKIP  ${entry.handle} — not found on ${TARGET_STORE}`);
      skipped++;
      continue;
    }

    const metafields = [];
    for (const [key, raw] of Object.entries(entry.metafields)) {
      const value = serialize(raw);
      if (!value) continue;
      const type = FIELD_TYPES[key];
      if (!type) continue;
      metafields.push({ ownerId: productId, namespace: 'coffee', key, value, type });
    }

    // metafieldsSet accepts up to 25 per call; push one at a time to isolate failures
    let fieldsPushed = 0;
    const fieldErrors = [];
    for (const mf of metafields) {
      const data = await gql(TARGET_STORE, TARGET_TOKEN, MUTATION, { metafields: [mf] });
      const { userErrors } = data.metafieldsSet;
      if (userErrors.length) {
        fieldErrors.push(`${mf.key}: ${userErrors.map(e => e.message).join(', ')}`);
      } else {
        fieldsPushed++;
      }
    }

    if (fieldErrors.length) {
      console.log(`  ⚠ WARN  ${entry.handle} (${fieldsPushed}/${metafields.length} fields)`);
      for (const e of fieldErrors) console.log(`         ✗ ${e}`);
    } else {
      console.log(`  ✓ OK    ${entry.handle} (${metafields.length} fields)`);
    }
    pushed++;
  }

  console.log(`\nValues: ${pushed} products updated, ${skipped} skipped`);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!VALUES_ONLY) {
    console.log(`\nFetching definitions from ${SOURCE_STORE}...`);
    const defs = await fetchDefinitions();
    const coffeeDefs = defs.filter(d => d.namespace === 'coffee');

    if (RESET_DEFS) {
      await resetAndRecreateDefs(coffeeDefs);
    } else {
      console.log(`Found ${defs.length} definition(s), ${coffeeDefs.length} in coffee namespace. Creating on ${TARGET_STORE}...\n`);
      for (const def of coffeeDefs) {
        const result = await createDefinition(def);
        const icon   = result === 'existed' ? '–' : '✓';
        const note   = result === 'existed' ? '(already existed)' : result;
        console.log(`  ${icon} ${def.namespace}.${def.key} [${def.type.name}] ${note}`);
      }
    }
  }

  if (!DEFS_ONLY) {
    console.log(`\nFetching products from ${TARGET_STORE}...`);
    const handleMap = await fetchProductHandleMap();
    console.log(`Found ${Object.keys(handleMap).length} product(s). Pushing values...\n`);
    await pushValues(handleMap);
  }

  console.log('\nDone.');
}

main().catch(err => { console.error('\n✗', err.message); process.exit(1); });
