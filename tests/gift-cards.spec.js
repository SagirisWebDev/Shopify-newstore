/**
 * Gift cards — static tests (Issue #6)
 *
 * These tests verify that the required source files exist and contain the
 * correct structure for Shopify native digital gift cards.  They run with
 * Vitest and require no dev server.
 *
 * Run: npm test
 *
 * Acceptance criteria covered (statically verifiable subset):
 *   AC2 partial — gift card template is valid and uses the standard main-product
 *                 section so a shopper can reach it and add it to the cart.
 *   AC3          — gift card products do NOT appear in the coffee collection
 *                 (verified by template structure: no coffee-specific sections).
 *   AC4 partial — template enables show_gift_card_recipient so Shopify's native
 *                 digital code delivery UI is present on the PDP.
 *
 * AC1 (products seeded in store) and AC4 (email code on order completion) are
 * manual / live-store steps and cannot be verified here — see notes at bottom.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths relative to the repo root (one level up from tests/)
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// templates/product.gift-card.json — alternate product template
// ---------------------------------------------------------------------------

describe('templates/product.gift-card.json', () => {
  const templatePath = resolve(ROOT, 'templates', 'product.gift-card.json');

  it('file exists', () => {
    expect(existsSync(templatePath), `Expected ${templatePath} to exist`).toBe(true);
  });

  // Parse once for structure tests — skipped implicitly if file is missing
  let template;
  try {
    template = JSON.parse(readFileSync(templatePath, 'utf-8'));
  } catch {
    template = null;
  }

  it('is valid JSON', () => {
    expect(template, 'template must be parseable JSON').not.toBeNull();
  });

  it('has a section with type "main-product" (uses Dawn standard section, not coffee-specific)', () => {
    const sections = template?.sections ?? {};
    const sectionTypes = Object.values(sections).map((s) => s.type);
    expect(sectionTypes).toContain('main-product');
  });

  it('does NOT use coffee-specific section types (gift cards must not appear in coffee collection layout)', () => {
    const sections = template?.sections ?? {};
    const sectionTypes = Object.values(sections).map((s) => s.type);
    const coffeeTypes = [
      'coffee-gallery',
      'coffee-buy-box',
      'coffee-tasting-notes',
      'coffee-brew-recommendations',
      'coffee-origin-story',
      'coffee-freshness-indicator',
    ];
    const found = sectionTypes.filter((t) => coffeeTypes.includes(t));
    expect(
      found,
      `Gift card template must not use coffee sections; found: ${found.join(', ')}`
    ).toHaveLength(0);
  });

  it('main-product section includes a buy_buttons block (required to add to cart)', () => {
    const sections = template?.sections ?? {};
    const mainSection = Object.values(sections).find((s) => s.type === 'main-product');
    expect(mainSection, 'main-product section must exist').toBeDefined();

    const blockTypes = Object.values(mainSection?.blocks ?? {}).map((b) => b.type);
    expect(blockTypes).toContain('buy_buttons');
  });

  it('buy_buttons block has show_gift_card_recipient: true (enables digital delivery UI)', () => {
    const sections = template?.sections ?? {};
    const mainSection = Object.values(sections).find((s) => s.type === 'main-product');
    const buyButtonsBlock = Object.values(mainSection?.blocks ?? {}).find(
      (b) => b.type === 'buy_buttons'
    );
    expect(
      buyButtonsBlock?.settings?.show_gift_card_recipient,
      'show_gift_card_recipient must be true to surface the recipient email field'
    ).toBe(true);
  });

  it('main-product section includes a price block', () => {
    const sections = template?.sections ?? {};
    const mainSection = Object.values(sections).find((s) => s.type === 'main-product');
    const blockTypes = Object.values(mainSection?.blocks ?? {}).map((b) => b.type);
    expect(blockTypes).toContain('price');
  });

  it('main-product section includes a variant_picker block (for denomination selection)', () => {
    const sections = template?.sections ?? {};
    const mainSection = Object.values(sections).find((s) => s.type === 'main-product');
    const blockTypes = Object.values(mainSection?.blocks ?? {}).map((b) => b.type);
    expect(blockTypes).toContain('variant_picker');
  });

  it('order array lists the main section', () => {
    expect(Array.isArray(template?.order), 'order must be an array').toBe(true);
    const sectionKeys = Object.keys(template?.sections ?? {});
    for (const key of template?.order ?? []) {
      expect(
        sectionKeys,
        `order references "${key}" which is not in sections`
      ).toContain(key);
    }
  });
});

// ---------------------------------------------------------------------------
// scripts/create-gift-cards.mjs — Admin API seeding script
// ---------------------------------------------------------------------------

describe('scripts/create-gift-cards.mjs', () => {
  const scriptPath = resolve(ROOT, 'scripts', 'create-gift-cards.mjs');

  it('file exists', () => {
    expect(existsSync(scriptPath), `Expected ${scriptPath} to exist`).toBe(true);
  });

  let contents;
  try {
    contents = readFileSync(scriptPath, 'utf-8');
  } catch {
    contents = '';
  }

  it('references SHOPIFY_STORE environment variable (required for Admin API auth)', () => {
    expect(contents).toMatch(/SHOPIFY_STORE/);
  });

  it('references SHOPIFY_ACCESS_TOKEN environment variable (required for Admin API auth)', () => {
    expect(contents).toMatch(/SHOPIFY_ACCESS_TOKEN/);
  });

  it('sets giftCard: true on the product (makes Shopify treat it as a native gift card)', () => {
    // Accepts both `giftCard: true` and the GraphQL mutation flag `isGiftCard`
    expect(contents).toMatch(/giftCard\s*:\s*true|isGiftCard/);
  });

  it('defines at least two denomination variants', () => {
    // Count price strings that look like denomination amounts ($25, $50, $100, etc.)
    // The script should have at least 2 distinct price values
    const priceMatches = contents.match(/price\s*:\s*['"`]\d+\.\d{2}['"`]/g) ?? [];
    expect(
      priceMatches.length,
      `Expected at least 2 denomination price entries, found ${priceMatches.length}`
    ).toBeGreaterThanOrEqual(2);
  });

  it('sets requiresShipping: false on variants (gift cards are digital — no physical fulfilment)', () => {
    expect(contents).toMatch(/requiresShipping\s*:\s*false/);
  });

  it('targets the Shopify Admin API (contains /admin/api/ endpoint)', () => {
    expect(contents).toMatch(/\/admin\/api\//);
  });

  it('uses productCreate mutation or REST product endpoint', () => {
    expect(contents).toMatch(/productCreate|\/products\.json/);
  });

  it('exits with non-zero code on missing env vars (guards against silent misconfiguration)', () => {
    // The script should call process.exit(1) when env vars are absent
    expect(contents).toMatch(/process\.exit\(1\)/);
  });
});

// ---------------------------------------------------------------------------
// Separation from coffee collection — template cross-check
// ---------------------------------------------------------------------------

describe('gift card / coffee collection separation (structural)', () => {
  it('product.gift-card.json does not reference any coffee-* section type', () => {
    const templatePath = resolve(ROOT, 'templates', 'product.gift-card.json');
    if (!existsSync(templatePath)) {
      // Already caught by the file-exists test above; don't double-fail
      return;
    }
    const raw = readFileSync(templatePath, 'utf-8');
    expect(raw).not.toMatch(/coffee-/);
  });

  it('product.json (default coffee PDP template) does not use main-product section (remains coffee-specific)', () => {
    // This is a guard to ensure the two templates stay distinct.
    const defaultTemplatePath = resolve(ROOT, 'templates', 'product.json');
    if (!existsSync(defaultTemplatePath)) return;
    const raw = readFileSync(defaultTemplatePath, 'utf-8');
    const template = JSON.parse(raw);
    const sections = template?.sections ?? {};
    const sectionTypes = Object.values(sections).map((s) => s.type);
    // The coffee PDP should use coffee-* sections, not the generic main-product
    expect(sectionTypes).not.toContain('main-product');
  });
});

/*
 * ---------------------------------------------------------------------------
 * Manual / live-store ACs not covered by static tests
 * ---------------------------------------------------------------------------
 *
 * AC1 — "At least 2 gift card products exist in the dev store with distinct
 *         denominations"
 *   Cannot be verified statically. The create-gift-cards.mjs script seeds these
 *   when run with a valid SHOPIFY_STORE + SHOPIFY_ACCESS_TOKEN. Manual step:
 *   confirm in Shopify admin that 3 variants ($25, $50, $100) exist.
 *
 * AC2 (partial live) — "A Shopper can add a gift card to the cart and proceed
 *         to checkout"
 *   The template structure is verified above. The actual cart/checkout flow
 *   requires a running dev store. A Playwright browser spec (tests/browser/)
 *   is the appropriate vehicle, but requires the store to be seeded first (AC1).
 *   See tests/browser/cart-drawer.spec.js for the add-to-cart pattern to follow.
 *
 * AC4 (live) — "Shopify delivers the gift card code digitally on order
 *         completion (verified in test mode)"
 *   This is a Shopify platform behaviour triggered by order fulfilment.
 *   show_gift_card_recipient: true (verified above) surfaces the recipient UI on
 *   the PDP. Actual email delivery must be confirmed via a test order in the
 *   Shopify admin.
 */
