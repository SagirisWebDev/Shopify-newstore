#!/usr/bin/env node
/**
 * Prints a final QA checklist for the migrated store.
 */
import { rest, TARGET_STORE, TARGET_TOKEN } from './lib/api.mjs';

export async function run() {
  // Quick sanity checks via API
  const { count: productCount } = await rest(TARGET_STORE, TARGET_TOKEN, 'GET', '/products/count.json');
  const { count: pageCount }    = await rest(TARGET_STORE, TARGET_TOKEN, 'GET', '/pages/count.json');

  console.log(`
  ── Store counts ──────────────────────────────
  Products : ${productCount}
  Pages    : ${pageCount}

  ── Manual QA checklist ───────────────────────
  [ ] Homepage — hero, value props, featured coffees, subscribe CTA
  [ ] Product page — gallery, buy box, tasting notes, brew recs, origin story, freshness indicator
  [ ] About page — hero, philosophy, sourcing, roasting, team sections
  [ ] Subscribe page — hero, how it works, FAQ, featured coffees
  [ ] Navigation — header and footer menus link correctly
  [ ] Brand tokens — colours and fonts match source store
  [ ] Collections — single origins, blends, etc. show correct products
  [ ] Gift card — product page renders, purchase flow works
  [ ] Recharge — Subscribe & Save widget visible on bean products
  [ ] Test order — place a one-time and a subscription order end-to-end
  `);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
