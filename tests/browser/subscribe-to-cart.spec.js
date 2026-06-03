/**
 * Subscribe-to-cart happy path — Issue #16
 *
 * Single end-to-end test for v1: PDP → toggle subscribe → pick cadence →
 * add to cart → assert cart drawer shows cadence label and discounted price.
 *
 * REQUIRES A RUNNING DEV STORE at http://127.0.0.1:9292
 * Start with: shopify theme dev --store <your-store>.myshopify.com
 *
 * Required CI secrets (configure as GitHub Actions secrets):
 *   SHOPIFY_STORE           — .myshopify.com domain (e.g. common-roast.myshopify.com)
 *   SHOPIFY_CLI_THEME_TOKEN — Theme Access app token (headless auth, not CLI OAuth)
 *
 * A broken Recharge subscription toggle causes this test to fail:
 *   - Missing subscription-toggle element   → waitForSelector times out
 *   - Toggle not wiring selling_plan field  → cart shows regular price,
 *                                             cadence label absent → assertions fail
 */

import { test, expect } from '@playwright/test';

const PDP = '/products/ethiopia-yirgacheffe-natural';

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test('subscribe-to-cart happy path', async ({ page }) => {
  // 1. Open the coffee PDP
  await page.goto(PDP);
  await page.waitForSelector('subscription-toggle', { timeout: 10000 });

  // 2. Select subscribe
  await page.locator('label[for^="purchase-subscribe-"]').click();

  // 3. Cadence picker must appear; the first (only) cadence is auto-selected
  const cadencePicker = page.locator('[data-subscription-cadence]');
  await expect(cadencePicker).toBeVisible();
  const firstCadenceInput = page.locator('[data-subscription-cadence-input]').first();
  await expect(firstCadenceInput).toBeChecked();

  // 4. Selling-plan input must be populated before adding to cart
  const sellingPlanValue = await page.evaluate(
    () => document.querySelector('[data-subscription-selling-plan-input]')?.value ?? ''
  );
  expect(sellingPlanValue).toMatch(/^\d+$/);

  // 5. Add to cart
  const addBtn = page.locator('[name="add"]');
  await addBtn.click();
  await expect(addBtn).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });

  // 6. Open cart drawer (Dawn shows cart-notification first; open drawer explicitly)
  await page.locator('#cart-icon-bubble').click();
  await page.waitForSelector('cart-drawer.active', { timeout: 10000 });

  // 7. Cart line item shows the subscription cadence label
  const cadenceLabel = page.locator('.cart-item__subscription-cadence').first();
  await expect(cadenceLabel).toBeVisible();
  const cadenceText = await cadenceLabel.textContent();
  expect(cadenceText?.trim().length).toBeGreaterThan(0);

  // 8. Cart line item shows the discounted price (struck-through original present)
  await expect(page.locator('.cart-item__old-price').first()).toBeVisible();
});
