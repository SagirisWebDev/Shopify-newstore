/**
 * Subscribe landing page — browser tests (Issue #7)
 *
 * REQUIRES A RUNNING DEV SERVER at http://127.0.0.1:9292
 * Start with: shopify theme dev --store <your-store>.myshopify.com
 *
 * These tests validate the live-rendered Subscribe page composed of the
 * `subscribe-hero` section and a `featured-collection` section, per
 * templates/page.subscribe.json.
 *
 * Without a live dev server these tests will fail to connect — that is
 * expected outside of the browser-test environment. The corresponding static
 * coverage lives in src/subscribe-page.test.js and runs under Vitest.
 *
 * Run: npm run test:browser
 */

import { test, expect } from '@playwright/test';

const SUBSCRIBE_URL = '/pages/subscribe';

// ---------------------------------------------------------------------------
// AC — page exists at /pages/subscribe and renders the hero
// ---------------------------------------------------------------------------

test.describe('AC — Subscribe landing page renders at /pages/subscribe', () => {
  test('GET /pages/subscribe returns 200', async ({ page }) => {
    const response = await page.goto(SUBSCRIBE_URL);
    expect(response, 'expected a response from /pages/subscribe').not.toBeNull();
    expect(response.status()).toBe(200);
  });

  test('[data-subscribe-hero] is visible on the page', async ({ page }) => {
    await page.goto(SUBSCRIBE_URL);
    const hero = page.locator('[data-subscribe-hero]');
    await expect(hero).toBeVisible();
  });

  test('discount badge contains "25%"', async ({ page }) => {
    await page.goto(SUBSCRIBE_URL);
    const badge = page.locator('[data-subscribe-hero] .subscribe-hero__badge');
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    expect(text ?? '').toMatch(/25\s*%/);
  });

  test('[data-subscribe-benefits] grid is visible', async ({ page }) => {
    await page.goto(SUBSCRIBE_URL);
    const benefits = page.locator('[data-subscribe-benefits]');
    await expect(benefits).toBeVisible();

    // The grid should render the three benefit blocks defined in the template.
    const benefitItems = benefits.locator('.subscribe-benefit');
    await expect(benefitItems).toHaveCount(3);
  });

  test('CTA button links to a /collections/ URL', async ({ page }) => {
    await page.goto(SUBSCRIBE_URL);
    const cta = page.locator('[data-subscribe-hero] a.button--primary');
    await expect(cta).toBeVisible();

    const href = await cta.getAttribute('href');
    expect(href, 'expected CTA href to be present').toBeTruthy();
    expect(href).toMatch(/\/collections\//);
  });

  test('featured coffees section heading is visible', async ({ page }) => {
    await page.goto(SUBSCRIBE_URL);

    // The template composes a featured-collection section after the hero.
    // Dawn's featured-collection renders its title in a heading element.
    const heading = page
      .locator('h1, h2, h3')
      .filter({ hasText: /Shop Subscribable Coffees/i });
    await expect(heading.first()).toBeVisible();
  });
});
