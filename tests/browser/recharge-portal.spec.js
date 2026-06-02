/**
 * Recharge subscriber portal — browser tests (Issue #14)
 *
 * REQUIRES A RUNNING DEV SERVER at http://127.0.0.1:9292
 * Start with: shopify theme dev --store <your-store>.myshopify.com
 *
 * The /account page requires a logged-in session. Tests that depend on full
 * authenticated portal flows (swap, pause, skip, cancel, etc.) are noted
 * below. For the red phase, we verify the entry point and asset presence
 * without requiring an active session — the element href is checked directly
 * rather than navigating through Recharge (which would require real credentials).
 *
 * Tests will fail to connect if the dev server is not running — expected during
 * the red phase.
 *
 * Run: npm run test:browser
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// AC entry point — /account page has a visible link to /tools/recharge
// ---------------------------------------------------------------------------

test.describe('AC entry point — /account has Manage Subscriptions link', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account');
  });

  test('account page loads without a server error', async ({ page }) => {
    // Even unauthenticated, the page should return a valid response (login
    // redirect is 200 with redirect meta, not a 5xx)
    const response = await page.goto('/account');
    expect(response?.status()).toBeLessThan(500);
  });

  test('page contains an anchor element whose href includes /tools/recharge', async ({ page }) => {
    // This tests the rendered HTML — the link must be present in the DOM
    // regardless of auth state (it lives in the account section template).
    // We check the href attribute directly rather than clicking through to
    // avoid requiring a live Recharge session.
    const link = page.locator('a[href*="/tools/recharge"]');
    await expect(link).toHaveCount(1);
  });

  test('the Manage Subscriptions link is visible on the account page', async ({ page }) => {
    const link = page.locator('a[href*="/tools/recharge"]');
    await expect(link).toBeVisible();
  });

  test('the Manage Subscriptions link text contains "Subscription"', async ({ page }) => {
    const link = page.locator('a[href*="/tools/recharge"]');
    const text = await link.textContent();
    expect(text).toMatch(/Subscription/i);
  });
});

// ---------------------------------------------------------------------------
// AC portal branding — recharge.css is served by the theme
// ---------------------------------------------------------------------------

test.describe('AC portal branding — recharge.css asset is served by the theme', () => {
  test('account page HTML references a recharge.css asset', async ({ page }) => {
    await page.goto('/account');

    // Recharge automatically loads CSS from the theme's assets/ folder.
    // The theme must include a <link> tag or the asset must be referenced
    // via {{ 'recharge.css' | asset_url }}. We verify by looking for
    // '/assets/recharge' in the full page source — which covers both a
    // direct stylesheet_tag and any inline reference Recharge injects.
    const content = await page.content();
    expect(content).toMatch(/\/assets\/recharge/i);
  });

  test('recharge.css asset URL is directly accessible (returns 200)', async ({ page }) => {
    // Navigate to the account page first so we can resolve the CDN asset URL
    // from the page source, then fetch it directly.
    await page.goto('/account');

    const content = await page.content();

    // Extract the full CDN URL for recharge.css from the page HTML
    const match = content.match(/https?:\/\/[^"']*\/assets\/recharge[^"'?]*/i);
    expect(match, 'Expected to find a recharge.css CDN URL in page source').toBeTruthy();

    const assetUrl = match[0];
    const response = await page.request.get(assetUrl);
    expect(response.status()).toBe(200);
  });
});
