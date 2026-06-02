import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const snippetPath = join(root, 'snippets/cart-drawer.liquid');
const cssPath = join(root, 'assets/component-cart-drawer.css');

let snippet;
let css;

beforeAll(() => {
  snippet = readFileSync(snippetPath, 'utf8');
  css = readFileSync(cssPath, 'utf8');
});

// ---------------------------------------------------------------------------
// AC1 — Subscription line items render with a cadence label and discounted price
// ---------------------------------------------------------------------------
describe('AC1 — subscription line items: cadence label and discounted price', () => {
  it('cart-drawer.liquid exists', () => {
    expect(existsSync(snippetPath)).toBe(true);
  });

  it('iterates over cart.items', () => {
    expect(snippet).toMatch(/for\s+item\s+in\s+cart\.items/);
  });

  it('checks item.selling_plan_allocation to detect subscription items', () => {
    expect(snippet).toMatch(/item\.selling_plan_allocation/);
  });

  it('renders a subscription cadence label element for subscription items', () => {
    // Implementation must emit a dedicated element (e.g. cart-item__subscription-cadence)
    // only when item.selling_plan_allocation != null.
    expect(snippet).toMatch(/cart-item__subscription-cadence/);
  });

  it('the cadence label outputs the selling plan name', () => {
    // The plan name (e.g. "Every 2 weeks") is carried on selling_plan_allocation.selling_plan.name
    expect(snippet).toMatch(/selling_plan_allocation\.selling_plan\.name/);
  });

  it('the cadence label block is guarded by a selling_plan_allocation presence check', () => {
    // The label must only appear when there IS a subscription. The check must be inside an if.
    const guard = snippet.match(
      /if\s+item\.selling_plan_allocation[\s\S]*?cart-item__subscription-cadence/
    );
    expect(guard, 'cart-item__subscription-cadence must be inside an if item.selling_plan_allocation block').toBeTruthy();
  });

  it('renders the subscription discounted price using final_price when selling_plan lowers the price', () => {
    // Dawn already has a discounted price path for item.original_price != item.final_price.
    // The implementation must not suppress that path for subscription items.
    expect(snippet).toMatch(/item\.final_price/);
    // And must show the struck-through original price as well.
    expect(snippet).toMatch(/item\.original_price/);
    expect(snippet).toMatch(/cart-item__old-price/);
  });

  it('subscription cadence label has a CSS class defined in component-cart-drawer.css', () => {
    expect(css).toMatch(/\.cart-item__subscription-cadence\b/);
  });

  it('cadence label is visually distinct — has at least one style rule (font or color)', () => {
    const block = css.match(/\.cart-item__subscription-cadence\s*\{[^}]+\}/);
    expect(block, 'expected a non-empty CSS rule for .cart-item__subscription-cadence').toBeTruthy();
    expect(block[0]).toMatch(/font|color|background|border|text/i);
  });
});

// ---------------------------------------------------------------------------
// AC2 — One-time line items render WITHOUT any subscription label
// ---------------------------------------------------------------------------
describe('AC2 — one-time line items: no subscription label emitted', () => {
  it('the cadence label is inside a conditional, not rendered unconditionally', () => {
    // If the cadence label appeared outside an if block it would render for all items.
    // We verify the label class does NOT appear before the first selling_plan_allocation check.
    const unconditionalMatch = snippet.match(
      /cart-item__subscription-cadence(?![\s\S]*?selling_plan_allocation)/
    );
    expect(
      unconditionalMatch,
      'cart-item__subscription-cadence must not appear before a selling_plan_allocation guard'
    ).toBeNull();
  });

  it('wraps cadence label in endif so it closes before non-subscription item content', () => {
    // Require both if and endif around the cadence block.
    expect(snippet).toMatch(
      /if\s+item\.selling_plan_allocation[\s\S]*?cart-item__subscription-cadence[\s\S]*?endif/
    );
  });

  it('one-time price path (original_price without strike-through) is still present', () => {
    // Dawn's else branch for equal prices must be preserved for one-time items.
    expect(snippet).toMatch(/item\.original_price\s*\|\s*money/);
  });
});

// ---------------------------------------------------------------------------
// AC5 — Checkout button leads to Shopify standard checkout
// ---------------------------------------------------------------------------
describe('AC5 — checkout button submits to Shopify standard checkout', () => {
  it('CartDrawer-Form action points to routes.cart_url', () => {
    expect(snippet).toMatch(/action="\s*{{\s*routes\.cart_url\s*}}"/);
  });

  it('checkout button has name="checkout" so Shopify processes it as a checkout submission', () => {
    expect(snippet).toMatch(/name="checkout"/);
  });

  it('checkout button type is submit', () => {
    expect(snippet).toMatch(/type="submit"[\s\S]*?name="checkout"|name="checkout"[\s\S]*?type="submit"/);
  });

  it('checkout button is associated with CartDrawer-Form via the form attribute', () => {
    expect(snippet).toMatch(/form="CartDrawer-Form"/);
  });

  it('checkout button is disabled when cart is empty', () => {
    // Prevents checkout from an empty cart.
    expect(snippet).toMatch(/if\s+cart\s*==\s*empty[\s\S]*?disabled[\s\S]*?endif/);
  });
});
