/**
 * Seal Subscriptions portal — static tests
 *
 * Verifies that the account page correctly links to the Seal subscriber portal.
 *
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, '..');

describe('sections/main-account.liquid — Seal portal entry point', () => {
  const liquidPath = resolve(ROOT, 'sections', 'main-account.liquid');

  it('contains a link to /tools/seal-subscriptions', () => {
    const contents = readFileSync(liquidPath, 'utf-8');
    expect(contents).toMatch(/\/tools\/seal-subscriptions/);
  });

  it('contains text matching "Subscription" (entry point label/heading)', () => {
    const contents = readFileSync(liquidPath, 'utf-8');
    expect(contents).toMatch(/Subscription/);
  });

  it('does not reference /tools/recharge', () => {
    const contents = readFileSync(liquidPath, 'utf-8');
    expect(contents).not.toMatch(/\/tools\/recharge/);
  });
});
