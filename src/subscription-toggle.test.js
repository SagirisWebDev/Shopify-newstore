// @vitest-environment jsdom
/**
 * Tests for the PDP subscription toggle (issue #13).
 *
 * Approach:
 *   - AC1–AC6 exercise DOM behaviour. The implementation will ship as
 *     `assets/subscription-toggle.js` — a custom element that wires the
 *     one-time / subscribe toggle, the cadence picker, the discount label,
 *     and the hidden `selling_plan` input on the product form.
 *
 *     For each behavioural AC we render the expected markup in jsdom,
 *     load the implementation module, and assert on the resulting DOM /
 *     form submission payload. This is the same jsdom-in-vitest pattern
 *     used by `src/coffee-card-snapshot.test.js`.
 *
 *   - AC7 is a containment check — Recharge / selling-plan internals must
 *     not leak across other theme files. Asserted via file content scans.
 *
 * All tests below are expected to FAIL before implementation lands.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const buyBoxPath = join(root, 'sections/coffee-buy-box.liquid');
const toggleAssetPath = join(root, 'assets/subscription-toggle.js');

// ---------------------------------------------------------------------------
// Fixture: the markup that coffee-buy-box.liquid is expected to render for a
// subscription-enabled product. Mirrors the Recharge config documented in
// CONTEXT.md — monthly cadence, 25% off, one-time + subscribe.
// ---------------------------------------------------------------------------
const MONTHLY_PLAN_ID = '1234567890';
const FIXTURE_HTML = `
  <product-info id="MainProduct-abc" data-section="abc" data-product-id="42">
    <subscription-toggle
      data-section-id="abc"
      data-form-id="product-form-abc"
      data-discount-percent="25"
      data-selling-plans='[{"id":"${MONTHLY_PLAN_ID}","name":"Delivery every 1 Month","cadence":"1 Month"}]'
    >
      <fieldset class="subscription-toggle__purchase-option" data-subscription-purchase-option>
        <legend class="visually-hidden">Purchase option</legend>
        <input
          type="radio"
          id="purchase-onetime-abc"
          name="purchase_option"
          value="onetime"
          checked
          data-subscription-purchase-option-input
        >
        <label for="purchase-onetime-abc">One-time purchase</label>
        <input
          type="radio"
          id="purchase-subscribe-abc"
          name="purchase_option"
          value="subscribe"
          data-subscription-purchase-option-input
        >
        <label for="purchase-subscribe-abc">Subscribe &amp; save</label>
      </fieldset>

      <div class="subscription-toggle__cadence" data-subscription-cadence hidden>
        <fieldset>
          <legend class="form__label">Delivery cadence</legend>
          <input
            type="radio"
            id="cadence-monthly-abc"
            name="selling_plan_choice"
            value="${MONTHLY_PLAN_ID}"
            checked
            data-subscription-cadence-input
          >
          <label for="cadence-monthly-abc">Every 1 Month</label>
        </fieldset>
      </div>

      <p class="subscription-toggle__discount" data-subscription-discount hidden>
        Save <span data-subscription-discount-percent>25</span>% with subscribe &amp; save
      </p>
    </subscription-toggle>

    <variant-selects id="variant-selects-abc" data-section="abc">
      <fieldset>
        <legend>Size</legend>
        <input type="radio" id="variant-size-250" name="options[Size]" value="250g" checked>
        <label for="variant-size-250">250g</label>
        <input type="radio" id="variant-size-1kg" name="options[Size]" value="1kg">
        <label for="variant-size-1kg">1kg</label>
      </fieldset>
    </variant-selects>

    <product-form data-section-id="abc">
      <form id="product-form-abc">
        <input type="hidden" name="id" value="999" class="product-variant-id">
        <input
          type="hidden"
          name="selling_plan"
          value=""
          data-subscription-selling-plan-input
        >
        <button type="submit" name="add">Add to cart</button>
      </form>
    </product-form>
  </product-info>
`;

/**
 * Load the subscription-toggle implementation into the current jsdom window.
 * We re-execute the file each time so that custom element registration
 * happens per-test (the spec forbids re-registering the same tag, so we
 * read the source and run it with a fresh DOM each time via vi.resetModules
 * would not help for a non-ESM script — instead the implementation MUST
 * guard against double-registration with `if (!customElements.get(...))`).
 */
async function loadImplementation() {
  if (!existsSync(toggleAssetPath)) {
    throw new Error(
      `Implementation missing: ${toggleAssetPath}. ` +
        `subscription-toggle.js must define the <subscription-toggle> custom element.`
    );
  }
  const src = readFileSync(toggleAssetPath, 'utf8');
  // Evaluate in the current jsdom realm.
  // eslint-disable-next-line no-new-func
  new Function(src).call(window);
}

function mount(html = FIXTURE_HTML) {
  document.body.innerHTML = html;
  return document.querySelector('subscription-toggle');
}

function $(sel, root = document) {
  return root.querySelector(sel);
}

function fireChange(el) {
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function selectPurchaseOption(value) {
  const inputs = document.querySelectorAll('[data-subscription-purchase-option-input]');
  inputs.forEach((i) => (i.checked = i.value === value));
  // Dispatch change on the one that is now checked — mirrors a real click.
  const checked = Array.from(inputs).find((i) => i.checked);
  fireChange(checked);
}

// ---------------------------------------------------------------------------
// AC1 — One-time / subscribe toggle renders on the PDP buy box
// ---------------------------------------------------------------------------
describe('AC1 — one-time / subscribe toggle renders on the PDP buy box', () => {
  it('coffee-buy-box.liquid renders a <subscription-toggle> custom element', () => {
    const buyBox = readFileSync(buyBoxPath, 'utf8');
    expect(buyBox).toMatch(/<subscription-toggle\b/);
  });

  it('the buy box passes the product form id to the toggle so it can update the hidden selling_plan input', () => {
    const buyBox = readFileSync(buyBoxPath, 'utf8');
    expect(buyBox).toMatch(/data-form-id=/);
  });

  it('the buy box loads the subscription-toggle.js asset', () => {
    const buyBox = readFileSync(buyBoxPath, 'utf8');
    expect(buyBox).toMatch(/'subscription-toggle\.js'\s*\|\s*asset_url/);
  });

  it('renders both One-time and Subscribe radio inputs once mounted in jsdom', async () => {
    await loadImplementation();
    mount();
    const inputs = document.querySelectorAll('[data-subscription-purchase-option-input]');
    const values = Array.from(inputs).map((i) => i.value).sort();
    expect(values).toEqual(['onetime', 'subscribe']);
  });

  it('defaults to the one-time option being selected', async () => {
    await loadImplementation();
    mount();
    const onetime = $('input[name="purchase_option"][value="onetime"]');
    const subscribe = $('input[name="purchase_option"][value="subscribe"]');
    expect(onetime.checked).toBe(true);
    expect(subscribe.checked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC2 — Selecting subscribe reveals the cadence picker
// ---------------------------------------------------------------------------
describe('AC2 — selecting subscribe reveals the cadence picker with Recharge options', () => {
  beforeEach(async () => {
    await loadImplementation();
    mount();
  });

  it('cadence picker is hidden when one-time is selected', () => {
    const cadence = $('[data-subscription-cadence]');
    expect(cadence.hidden).toBe(true);
  });

  it('cadence picker becomes visible when subscribe is selected', () => {
    selectPurchaseOption('subscribe');
    const cadence = $('[data-subscription-cadence]');
    expect(cadence.hidden).toBe(false);
  });

  it('cadence picker hides again when toggled back to one-time', () => {
    selectPurchaseOption('subscribe');
    selectPurchaseOption('onetime');
    const cadence = $('[data-subscription-cadence]');
    expect(cadence.hidden).toBe(true);
  });

  it('cadence options come from the data-selling-plans JSON (Recharge configured plans)', () => {
    // The monthly cadence radio's value is the Recharge selling plan ID.
    const cadenceInput = $('[data-subscription-cadence-input]');
    expect(cadenceInput.value).toBe(MONTHLY_PLAN_ID);
  });
});

// ---------------------------------------------------------------------------
// AC3 — Subscription discount % is displayed when subscribe is selected
// ---------------------------------------------------------------------------
describe('AC3 — subscription discount % is displayed when subscribe is selected', () => {
  beforeEach(async () => {
    await loadImplementation();
    mount();
  });

  it('discount label is hidden by default (one-time)', () => {
    const discount = $('[data-subscription-discount]');
    expect(discount.hidden).toBe(true);
  });

  it('discount label is shown when subscribe is selected', () => {
    selectPurchaseOption('subscribe');
    const discount = $('[data-subscription-discount]');
    expect(discount.hidden).toBe(false);
  });

  it('discount label renders the percent from data-discount-percent (25%)', () => {
    selectPurchaseOption('subscribe');
    const percent = $('[data-subscription-discount-percent]');
    expect(percent.textContent.trim()).toBe('25');
  });

  it('discount label hides again when toggled back to one-time', () => {
    selectPurchaseOption('subscribe');
    selectPurchaseOption('onetime');
    const discount = $('[data-subscription-discount]');
    expect(discount.hidden).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC4 — Add-to-cart with subscribe sends the correct Recharge selling plan ID
// ---------------------------------------------------------------------------
describe('AC4 — submitting with subscribe selected sends the selling_plan id', () => {
  beforeEach(async () => {
    await loadImplementation();
    mount();
  });

  it('selling_plan hidden input is empty when one-time is selected', () => {
    const sellingPlanInput = $('[data-subscription-selling-plan-input]');
    expect(sellingPlanInput.value).toBe('');
  });

  it('selling_plan hidden input is populated with the cadence id when subscribe is selected', () => {
    selectPurchaseOption('subscribe');
    const sellingPlanInput = $('[data-subscription-selling-plan-input]');
    expect(sellingPlanInput.value).toBe(MONTHLY_PLAN_ID);
  });

  it('FormData built from the product form includes the selling_plan when subscribe is selected', () => {
    selectPurchaseOption('subscribe');
    const form = document.getElementById('product-form-abc');
    const data = new FormData(form);
    expect(data.get('selling_plan')).toBe(MONTHLY_PLAN_ID);
  });
});

// ---------------------------------------------------------------------------
// AC5 — Add-to-cart with one-time selected sends a standard add-to-cart
// ---------------------------------------------------------------------------
describe('AC5 — submitting with one-time selected sends no selling_plan', () => {
  beforeEach(async () => {
    await loadImplementation();
    mount();
  });

  it('FormData includes an empty selling_plan field when one-time is selected', () => {
    // The hidden input still exists, but its value is empty so Shopify treats it as a standard add-to-cart.
    const form = document.getElementById('product-form-abc');
    const data = new FormData(form);
    expect(data.get('selling_plan')).toBe('');
  });

  it('toggling subscribe then back to one-time clears the selling_plan value', () => {
    selectPurchaseOption('subscribe');
    selectPurchaseOption('onetime');
    const sellingPlanInput = $('[data-subscription-selling-plan-input]');
    expect(sellingPlanInput.value).toBe('');
    const form = document.getElementById('product-form-abc');
    const data = new FormData(form);
    expect(data.get('selling_plan')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// AC6 — Toggle state persists when the Shopper changes variant
// ---------------------------------------------------------------------------
describe('AC6 — toggle state persists across variant changes', () => {
  beforeEach(async () => {
    await loadImplementation();
    mount();
  });

  function changeVariant(newValue) {
    const inputs = document.querySelectorAll('input[name="options[Size]"]');
    inputs.forEach((i) => (i.checked = i.value === newValue));
    const checked = Array.from(inputs).find((i) => i.checked);
    fireChange(checked);
    // Real product-info would dispatch a `variant:change` event after fetch.
    // Our toggle should listen for either the change bubbling out of
    // variant-selects, or an explicit variant:change CustomEvent.
    document.querySelector('variant-selects').dispatchEvent(
      new CustomEvent('variant:change', {
        bubbles: true,
        detail: { variant: { id: 1234 } },
      })
    );
  }

  it('subscribe remains selected after changing the bag size variant', () => {
    selectPurchaseOption('subscribe');
    changeVariant('1kg');
    const subscribe = $('input[name="purchase_option"][value="subscribe"]');
    expect(subscribe.checked).toBe(true);
  });

  it('cadence picker remains visible after changing the bag size variant', () => {
    selectPurchaseOption('subscribe');
    changeVariant('1kg');
    expect($('[data-subscription-cadence]').hidden).toBe(false);
  });

  it('discount label remains visible after changing the bag size variant', () => {
    selectPurchaseOption('subscribe');
    changeVariant('1kg');
    expect($('[data-subscription-discount]').hidden).toBe(false);
  });

  it('selling_plan input still carries the selling plan id after variant change', () => {
    selectPurchaseOption('subscribe');
    changeVariant('1kg');
    expect($('[data-subscription-selling-plan-input]').value).toBe(MONTHLY_PLAN_ID);
  });

  it('one-time selection also survives a variant change', () => {
    // Explicit toggle, then back, then variant change — final state must stick.
    selectPurchaseOption('subscribe');
    selectPurchaseOption('onetime');
    changeVariant('1kg');
    expect($('input[name="purchase_option"][value="onetime"]').checked).toBe(true);
    expect($('[data-subscription-selling-plan-input]').value).toBe('');
  });
});

// ---------------------------------------------------------------------------
// AC7 — Recharge / selling-plan internals encapsulated in a single asset
// ---------------------------------------------------------------------------
describe('AC7 — Recharge internals are encapsulated in subscription-toggle.js', () => {
  it('the subscription-toggle.js asset exists', () => {
    expect(existsSync(toggleAssetPath)).toBe(true);
  });

  it('subscription-toggle.js defines the <subscription-toggle> custom element', () => {
    const src = readFileSync(toggleAssetPath, 'utf8');
    expect(src).toMatch(/customElements\.define\(\s*['"]subscription-toggle['"]/);
  });

  it('coffee-buy-box.liquid does not contain inline JS that pokes at selling_plan', () => {
    const buyBox = readFileSync(buyBoxPath, 'utf8');
    // The buy box may include <subscription-toggle> markup, but the form
    // wiring / selling_plan mutation lives in the asset, not in the section.
    // Inline <script> blocks in the section must NOT touch selling_plan.
    const inlineScripts = buyBox.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g) || [];
    inlineScripts.forEach((block) => {
      expect(block).not.toMatch(/selling_plan/);
      expect(block).not.toMatch(/recharge/i);
    });
  });

  // The single point of containment: search every other JS/Liquid file in the
  // theme for the string "selling_plan" or "Recharge". The only places it is
  // allowed to appear are: subscription-toggle.js, cart-rendering files
  // (which display existing selling plans on already-added line items —
  // documented allow-list below), and the buy box section's markup for the
  // <subscription-toggle> element itself.
  it('no other theme asset (.js) references selling_plan or Recharge', () => {
    const assetsDir = join(root, 'assets');
    const files = readdirSync(assetsDir)
      .filter((f) => extname(f) === '.js')
      .filter((f) => f !== 'subscription-toggle.js');

    const offenders = [];
    files.forEach((f) => {
      const src = readFileSync(join(assetsDir, f), 'utf8');
      if (/selling_plan|recharge/i.test(src)) {
        offenders.push(f);
      }
    });
    expect(offenders).toEqual([]);
  });

  it('no other section/snippet (excluding cart + order display) contains Recharge config strings', () => {
    // Cart drawer, cart items section, order summary, and cart-notification
    // are allow-listed because they render the selling plan NAME of items
    // that are already in the cart — that is read-only display, not config.
    // The buy box section is also allow-listed because it embeds the
    // <subscription-toggle> markup.
    const allowList = new Set([
      'sections/main-cart-items.liquid',
      'sections/main-order.liquid',
      'sections/cart-notification-product.liquid',
      'sections/coffee-buy-box.liquid',
      'snippets/cart-drawer.liquid',
      // Account page: portal entry point link + recharge.css stylesheet tag — display/navigation only, no config data
      'sections/main-account.liquid',
    ]);

    const dirs = ['sections', 'snippets'];
    const offenders = [];
    dirs.forEach((dir) => {
      const dirPath = join(root, dir);
      readdirSync(dirPath)
        .filter((f) => f.endsWith('.liquid'))
        .forEach((f) => {
          const rel = `${dir}/${f}`;
          if (allowList.has(rel)) return;
          const src = readFileSync(join(dirPath, f), 'utf8');
          // Look for selling plan config — discount percent, cadence, plan id
          // hardcoded outside the toggle asset.
          if (/data-selling-plans|data-discount-percent|data-subscription-/i.test(src)) {
            offenders.push(rel);
          }
          // Hard-coded "Recharge" branding strings outside the toggle.
          if (/\brecharge\b/i.test(src)) {
            offenders.push(rel);
          }
        });
    });
    expect(offenders).toEqual([]);
  });
});
