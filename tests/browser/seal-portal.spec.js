/**
 * Seal Subscriptions portal — browser tests
 *
 * REQUIRES A RUNNING DEV SERVER at http://127.0.0.1:9292
 * Start with: shopify theme dev --store <your-store>.myshopify.com
 *
 * The /account page requires a logged-in session. Tests verify the entry
 * point is present without requiring an active Seal session.
 *
 * Run: npm run test:browser
 */

import { test, expect } from '@playwright/test';

test.describe('AC entry point — /account has Manage Subscriptions link', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account');
  });

  test('account page loads without a server error', async ({ page }) => {
    const response = await page.goto('/account');
    expect(response?.status()).toBeLessThan(500);
  });

  test('page contains an anchor element whose href includes /tools/seal-subscriptions', async ({ page }) => {
    const link = page.locator('a[href*="/tools/seal-subscriptions"]');
    await expect(link).toHaveCount(1);
  });

  test('the Manage Subscriptions link is visible on the account page', async ({ page }) => {
    const link = page.locator('a[href*="/tools/seal-subscriptions"]');
    await expect(link).toBeVisible();
  });

  test('the Manage Subscriptions link text contains "Subscription"', async ({ page }) => {
    const link = page.locator('a[href*="/tools/seal-subscriptions"]');
    const text = await link.textContent();
    expect(text).toMatch(/Subscription/i);
  });

  test('page does not reference /tools/recharge', async ({ page }) => {
    const content = await page.content();
    expect(content).not.toMatch(/\/tools\/recharge/i);
  });
});
