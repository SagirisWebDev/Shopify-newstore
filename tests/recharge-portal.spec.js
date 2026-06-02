/**
 * Recharge subscriber portal — static tests (Issue #14)
 *
 * These tests verify that the required source files exist and contain
 * the expected content. They run with Vitest and require no dev server.
 *
 * Run: npm test
 *
 * All tests should FAIL until the implementation is complete (red phase).
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
// assets/recharge.css — existence and brand-token content
// ---------------------------------------------------------------------------

describe('assets/recharge.css', () => {
  const cssPath = resolve(ROOT, 'assets', 'recharge.css');

  it('file exists', () => {
    expect(existsSync(cssPath), `Expected ${cssPath} to exist`).toBe(true);
  });

  it('references the primary brand colour #2C1810 (dark brown)', () => {
    const contents = readFileSync(cssPath, 'utf-8');
    expect(contents).toMatch(/#2C1810/i);
  });

  it('references the accent colour #C8A96E (warm gold)', () => {
    const contents = readFileSync(cssPath, 'utf-8');
    expect(contents).toMatch(/#C8A96E/i);
  });

  it('contains a .rc-btn selector targeting Recharge portal elements', () => {
    const contents = readFileSync(cssPath, 'utf-8');
    expect(contents).toMatch(/\.rc-btn\b/);
  });

  it('contains a .rc-btn--primary selector', () => {
    const contents = readFileSync(cssPath, 'utf-8');
    expect(contents).toMatch(/\.rc-btn--primary\b/);
  });

  it('contains at least one Recharge subscription card selector (.rc-subscription-card or .rc-card)', () => {
    const contents = readFileSync(cssPath, 'utf-8');
    expect(contents).toMatch(/\.rc-subscription-card\b|\.rc-card\b/);
  });
});

// ---------------------------------------------------------------------------
// sections/main-account.liquid — Recharge entry point
// ---------------------------------------------------------------------------

describe('sections/main-account.liquid', () => {
  const liquidPath = resolve(ROOT, 'sections', 'main-account.liquid');

  it('contains a link to /tools/recharge', () => {
    const contents = readFileSync(liquidPath, 'utf-8');
    expect(contents).toMatch(/\/tools\/recharge/);
  });

  it('contains text matching "Subscription" (entry point label/heading)', () => {
    const contents = readFileSync(liquidPath, 'utf-8');
    expect(contents).toMatch(/Subscription/);
  });
});
