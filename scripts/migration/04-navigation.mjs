#!/usr/bin/env node
/**
 * Copies all navigation menus from the source store to the target store.
 * Skips menus whose handle already exists on the target.
 *
 * All items are migrated as URL-type links so resource IDs don't need
 * to be translated between stores.
 *
 * Required token scope: write_online_store_navigation
 */
import { gql, SOURCE_STORE, SOURCE_TOKEN, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

const FETCH_MENUS = `
  query FetchMenus($after: String) {
    menus(first: 250, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        items {
          title
          type
          url
          items {
            title
            type
            url
          }
        }
      }
    }
  }
`;


const CREATE_MENU = `
  mutation MenuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) {
      menu { id handle title }
      userErrors { field message }
    }
  }
`;

function toUrlItem(item) {
  const entry = { title: item.title, type: 'HTTP', url: item.url ?? '/' };
  if (item.items?.length) entry.items = item.items.map(toUrlItem);
  return entry;
}

async function fetchMenus(store, token) {
  const menus = [];
  let cursor = null;
  do {
    const data = await gql(store, token, FETCH_MENUS, { after: cursor });
    menus.push(...data.menus.nodes);
    cursor = data.menus.pageInfo.hasNextPage ? data.menus.pageInfo.endCursor : null;
  } while (cursor);
  return menus;
}

export async function run() {
  console.log(`  Fetching menus from ${SOURCE_STORE}...`);
  const menus = await fetchMenus(SOURCE_STORE, SOURCE_TOKEN);
  console.log(`  Found ${menus.length} menu(s). Copying to ${TARGET_STORE}...\n`);

  const targetMenus     = await fetchMenus(TARGET_STORE, TARGET_TOKEN);
  const existingHandles = new Set(targetMenus.map(m => m.handle));

  let created = 0, skipped = 0;
  for (const menu of menus) {
    if (existingHandles.has(menu.handle)) {
      console.log(`  – SKIP  ${menu.handle} (already exists)`);
      skipped++;
      continue;
    }

    const items = menu.items.map(toUrlItem);
    const data  = await gql(TARGET_STORE, TARGET_TOKEN, CREATE_MENU, {
      title: menu.title, handle: menu.handle, items,
    });
    const { userErrors } = data.menuCreate;
    if (userErrors.length) throw new Error(`${menu.handle}: ${JSON.stringify(userErrors)}`);
    console.log(`  ✓ OK    ${menu.handle} (${items.length} item(s))`);
    created++;
  }

  console.log(`\n  Menus: ${created} created, ${skipped} skipped`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
