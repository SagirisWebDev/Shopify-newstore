import { test, expect } from '@playwright/test';

const PDP = '/products/ethiopia-yirgacheffe-natural';

test.beforeEach(async ({ page }) => {
  await page.goto(PDP);
  await page.waitForSelector('subscription-toggle');
});

// ---------------------------------------------------------------------------
// AC1 — Toggle renders on the PDP buy box
// ---------------------------------------------------------------------------
test('subscription-toggle element renders on the PDP', async ({ page }) => {
  await expect(page.locator('subscription-toggle')).toBeVisible();
});

test('one-time radio is selected by default', async ({ page }) => {
  const onetime = page.locator('input[name="purchase_option"][value="onetime"]');
  await expect(onetime).toBeChecked();
});

test('subscribe radio is not selected by default', async ({ page }) => {
  const subscribe = page.locator('input[name="purchase_option"][value="subscribe"]');
  await expect(subscribe).not.toBeChecked();
});

// ---------------------------------------------------------------------------
// AC2 — Selecting subscribe reveals the cadence picker
// ---------------------------------------------------------------------------
test('cadence picker is hidden on page load', async ({ page }) => {
  const cadence = page.locator('[data-subscription-cadence]');
  await expect(cadence).toBeHidden();
});

test('cadence picker is visible after clicking subscribe', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  const cadence = page.locator('[data-subscription-cadence]');
  await expect(cadence).toBeVisible();
});

test('cadence picker hides again when toggling back to one-time', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  await page.locator('label[for^="purchase-onetime-"]').click();
  const cadence = page.locator('[data-subscription-cadence]');
  await expect(cadence).toBeHidden();
});

// ---------------------------------------------------------------------------
// AC3 — Subscription discount % is displayed when subscribe is selected
// ---------------------------------------------------------------------------
test('discount label is hidden on page load', async ({ page }) => {
  await expect(page.locator('[data-subscription-discount]')).toBeHidden();
});

test('discount label is visible after clicking subscribe', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  await expect(page.locator('[data-subscription-discount]')).toBeVisible();
});

test('discount label shows 25%', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  const percent = page.locator('[data-subscription-discount-percent]');
  await expect(percent).toHaveText('25');
});

test('discount label hides when toggling back to one-time', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  await page.locator('label[for^="purchase-onetime-"]').click();
  await expect(page.locator('[data-subscription-discount]')).toBeHidden();
});

// ---------------------------------------------------------------------------
// AC4 — Add-to-cart with subscribe selected populates the selling_plan field
// ---------------------------------------------------------------------------
test('selling_plan input is empty when one-time is selected', async ({ page }) => {
  const value = await page.evaluate(() =>
    document.querySelector('[data-subscription-selling-plan-input]').value
  );
  expect(value).toBe('');
});

test('selling_plan input is populated with the plan ID after selecting subscribe', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  const value = await page.evaluate(() =>
    document.querySelector('[data-subscription-selling-plan-input]').value
  );
  expect(value).toBeTruthy();
  expect(value).toMatch(/^\d+$/);
});

test('FormData carries selling_plan when subscribe is selected', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  const planId = await page.evaluate(() => {
    const form = document.querySelector('form[data-type="add-to-cart-form"]');
    return new FormData(form).get('selling_plan');
  });
  expect(planId).toBeTruthy();
  expect(planId).toMatch(/^\d+$/);
});

// ---------------------------------------------------------------------------
// AC5 — Add-to-cart with one-time selected sends no selling_plan
// ---------------------------------------------------------------------------
test('FormData has empty selling_plan when one-time is selected', async ({ page }) => {
  const planId = await page.evaluate(() => {
    const form = document.querySelector('form[data-type="add-to-cart-form"]');
    return new FormData(form).get('selling_plan');
  });
  expect(planId).toBe('');
});

test('toggling subscribe then one-time clears the selling_plan field', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  await page.locator('label[for^="purchase-onetime-"]').click();
  const planId = await page.evaluate(() => {
    const form = document.querySelector('form[data-type="add-to-cart-form"]');
    return new FormData(form).get('selling_plan');
  });
  expect(planId).toBe('');
});

// ---------------------------------------------------------------------------
// AC6 — Toggle state persists when the Shopper changes variant
// ---------------------------------------------------------------------------
test('subscribe selection persists after changing bag size to 1kg', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  await page.locator('variant-selects label').filter({ hasText: '1kg' }).click();
  await expect(page.locator('input[name="purchase_option"][value="subscribe"]')).toBeChecked();
});

test('cadence picker stays visible after changing variant', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  await page.locator('variant-selects label').filter({ hasText: '1kg' }).click();
  await expect(page.locator('[data-subscription-cadence]')).toBeVisible();
});

test('discount label stays visible after changing variant', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  await page.locator('variant-selects label').filter({ hasText: '1kg' }).click();
  await expect(page.locator('[data-subscription-discount]')).toBeVisible();
});

test('selling_plan input retains its value after changing variant', async ({ page }) => {
  await page.locator('label[for^="purchase-subscribe-"]').click();
  const planIdBefore = await page.evaluate(() =>
    document.querySelector('[data-subscription-selling-plan-input]').value
  );
  await page.locator('variant-selects label').filter({ hasText: '1kg' }).click();
  const planIdAfter = await page.evaluate(() =>
    document.querySelector('[data-subscription-selling-plan-input]').value
  );
  expect(planIdAfter).toBe(planIdBefore);
  expect(planIdAfter).toBeTruthy();
});
