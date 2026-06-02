/**
 * Cart drawer browser tests — Issue #15
 *
 * REQUIRES A RUNNING DEV SERVER at http://127.0.0.1:9292
 * Start with: shopify theme dev --store <your-store>.myshopify.com
 *
 * These tests will be skipped / fail to connect in CI without the dev server,
 * which is expected during the red phase.
 *
 * Test product slugs used below are Coffee PDP products with selling plans.
 * Adjust the SUB_PRODUCT and OT_PRODUCT constants if the store's URL handles differ.
 */

import { test, expect } from '@playwright/test';

// Product slugs — subscription-enabled coffee PDP
const SUB_PRODUCT = '/products/ethiopia-yirgacheffe-natural';
const OT_PRODUCT = '/products/ethiopia-yirgacheffe-natural';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Add the product at `url` to the cart via the PDP.
 * If `asSubscription` is true, select the subscribe radio before adding.
 *
 * Dawn renders both cart-notification (in the header) and cart-drawer.
 * product-form.js picks cart-notification first, so add-to-cart shows the
 * notification, NOT the drawer. After adding we explicitly open the drawer.
 */
async function addToCart(page, url, asSubscription = false) {
  await page.goto(url);
  await page.waitForSelector('subscription-toggle', { timeout: 10000 });

  if (asSubscription) {
    await page.locator('label[for^="purchase-subscribe-"]').click();
    // Wait for the cadence picker to be visible (subscription is active)
    await page.locator('[data-subscription-cadence]').waitFor({ state: 'visible' });
  } else {
    // Ensure one-time is selected (default)
    const onetime = page.locator('input[name="purchase_option"][value="onetime"]');
    if (!(await onetime.isChecked())) {
      await page.locator('label[for^="purchase-onetime-"]').click();
    }
  }

  const addBtn = page.locator('[name="add"]');
  await addBtn.click();
  // Wait for the API call to complete — button sheds aria-disabled when done
  await expect(addBtn).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10000 });

  // Dawn's add-to-cart shows cart-notification (not the drawer).
  // Explicitly open the drawer via the cart icon.
  await openCartDrawer(page);
}

/** Open the cart drawer by clicking the cart icon. */
async function openCartDrawer(page) {
  await page.locator('#cart-icon-bubble').click();
  // .drawer { visibility: hidden } → .drawer.active { visibility: visible }
  // waitForSelector defaults to state:'visible', so we must wait for .active
  await page.waitForSelector('cart-drawer.active', { timeout: 10000 });
}

/** Clear the cart via the Shopify AJAX cart API. */
async function clearCart(page) {
  await page.goto('/cart/clear');
  await page.goto('/');
}

// ---------------------------------------------------------------------------
// AC3 — Mixed cart: subscription and one-time items display correctly
// ---------------------------------------------------------------------------

test.describe('AC3 — mixed cart shows subscription and one-time items correctly', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page);
  });

  test('subscription item in cart shows cadence label', async ({ page }) => {
    await addToCart(page, SUB_PRODUCT, true);

    // The drawer should already be open after adding.
    const cadenceLabel = page.locator('.cart-item__subscription-cadence').first();
    await expect(cadenceLabel).toBeVisible();
    // It should contain some text (the plan name)
    const text = await cadenceLabel.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('subscription item in cart shows discounted (struck-through) original price', async ({ page }) => {
    await addToCart(page, SUB_PRODUCT, true);

    const oldPrice = page.locator('.cart-item__old-price').first();
    await expect(oldPrice).toBeVisible();
  });

  test('subscription item in cart shows the discounted final price', async ({ page }) => {
    await addToCart(page, SUB_PRODUCT, true);

    const finalPrice = page.locator('.cart-item__final-price, .price--end').first();
    await expect(finalPrice).toBeVisible();
  });

  test('one-time item in cart does NOT show a cadence label', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    // There must be zero subscription cadence labels in the drawer for a one-time item.
    const cadenceLabels = page.locator('.cart-item__subscription-cadence');
    await expect(cadenceLabels).toHaveCount(0);
  });

  test('cart with both types shows two line items, one with and one without cadence label', async ({ page }) => {
    // Add one-time item first
    await addToCart(page, OT_PRODUCT, false);
    // Close the drawer and add subscription item
    await page.locator('.drawer__close').first().click();
    await page.locator('cart-drawer.active').waitFor({ state: 'hidden' });

    await addToCart(page, SUB_PRODUCT, true);

    // We should have two cart rows
    const rows = page.locator('.cart-item[id^="CartDrawer-Item-"]');
    await expect(rows).toHaveCount(2);

    // Exactly one cadence label should exist
    const cadenceLabels = page.locator('.cart-item__subscription-cadence');
    await expect(cadenceLabels).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// AC4 — Remove-from-cart works for both subscription and one-time line items
// ---------------------------------------------------------------------------

test.describe('AC4 — remove-from-cart works for subscription and one-time items', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page);
  });

  test('remove button is visible for a subscription line item', async ({ page }) => {
    await addToCart(page, SUB_PRODUCT, true);

    const removeBtn = page.locator('.cart-remove-button').first();
    await expect(removeBtn).toBeVisible();
  });

  test('clicking remove on subscription item removes it from the cart drawer', async ({ page }) => {
    await addToCart(page, SUB_PRODUCT, true);

    await page.locator('.cart-remove-button').first().click();

    // After removal the drawer should show empty state or zero items
    await expect(page.locator('cart-drawer')).toHaveClass(/is-empty/, { timeout: 10000 });
  });

  test('remove button is visible for a one-time line item', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    const removeBtn = page.locator('.cart-remove-button').first();
    await expect(removeBtn).toBeVisible();
  });

  test('clicking remove on one-time item removes it from the cart drawer', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    await page.locator('.cart-remove-button').first().click();

    await expect(page.locator('cart-drawer')).toHaveClass(/is-empty/, { timeout: 10000 });
  });

  test('remove works independently — removing subscription item leaves one-time item', async ({ page }) => {
    // Add one-time first
    await addToCart(page, OT_PRODUCT, false);
    await page.locator('.drawer__close').first().click();
    await page.locator('cart-drawer.active').waitFor({ state: 'hidden' });

    // Add subscription second
    await addToCart(page, SUB_PRODUCT, true);

    // Find the row with the cadence label and remove it
    const subRow = page.locator('.cart-item').filter({ has: page.locator('.cart-item__subscription-cadence') });
    await subRow.locator('.cart-remove-button').click();

    // One-time item should remain
    const rows = page.locator('.cart-item[id^="CartDrawer-Item-"]');
    await expect(rows).toHaveCount(1, { timeout: 10000 });

    // No cadence label should remain
    await expect(page.locator('.cart-item__subscription-cadence')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// AC5 — Checkout button leads to Shopify standard checkout (live navigation)
// ---------------------------------------------------------------------------

test.describe('AC5 — checkout button navigates to Shopify checkout', () => {
  test.beforeEach(async ({ page }) => {
    await clearCart(page);
  });

  test('checkout button is present and enabled when cart has items', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    const checkoutBtn = page.locator('#CartDrawer-Checkout');
    await expect(checkoutBtn).toBeVisible();
    await expect(checkoutBtn).toBeEnabled();
  });

  test('clicking checkout navigates to /checkouts or checkout.shopify.com', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    const checkoutBtn = page.locator('#CartDrawer-Checkout');
    await checkoutBtn.click();

    // Shopify checkout lives at /checkouts/ or an external checkout URL
    await page.waitForURL(/\/checkouts\/|checkout\.shopify\.com/, { timeout: 15000 });
    expect(page.url()).toMatch(/checkouts|checkout\.shopify\.com/);
  });

  test('checkout button is disabled when cart is empty', async ({ page }) => {
    await page.goto('/');
    await openCartDrawer(page);

    const checkoutBtn = page.locator('#CartDrawer-Checkout');
    await expect(checkoutBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// AC6 — Cart drawer renders correctly on mobile
// ---------------------------------------------------------------------------

test.describe('AC6 — cart drawer mobile rendering', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14 Pro dimensions

  test.beforeEach(async ({ page }) => {
    await clearCart(page);
  });

  test('cart drawer opens and is fully visible on mobile viewport', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    const drawerInner = page.locator('.drawer__inner');
    await expect(drawerInner).toBeVisible();

    // Drawer must not overflow the viewport width
    const box = await drawerInner.boundingBox();
    expect(box, 'drawer inner should have a bounding box').toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.width).toBeLessThanOrEqual(390);
  });

  test('subscription cadence label is visible on mobile viewport', async ({ page }) => {
    await addToCart(page, SUB_PRODUCT, true);

    const cadenceLabel = page.locator('.cart-item__subscription-cadence').first();
    await expect(cadenceLabel).toBeVisible();
  });

  test('remove button is tappable on mobile (min 44x44 touch target)', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    const removeBtn = page.locator('.cart-remove-button').first();
    const box = await removeBtn.boundingBox();
    expect(box, 'remove button should have a bounding box on mobile').toBeTruthy();
    // WCAG 2.5.5 recommends 44x44px minimum touch target
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test('checkout button spans full width on mobile', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    const checkoutBtn = page.locator('#CartDrawer-Checkout');
    const box = await checkoutBtn.boundingBox();
    const viewportWidth = 390;
    // Allow for padding: button should occupy at least 80% of viewport width
    expect(box.width).toBeGreaterThanOrEqual(viewportWidth * 0.8);
  });

  test('cart drawer close button is accessible on mobile', async ({ page }) => {
    await addToCart(page, OT_PRODUCT, false);

    const closeBtn = page.locator('.drawer__close').first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('cart-drawer')).not.toHaveClass(/active/, { timeout: 5000 });
  });
});
