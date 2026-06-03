/**
 * Static tests for the Subscribe landing page — issue #7.
 *
 * Verifies that all required files exist and that the section/template
 * satisfy the acceptance criteria derivable from static analysis:
 *   - Template exists at templates/page.subscribe.json
 *   - Section exists at sections/subscribe-hero.liquid
 *   - CSS asset exists at assets/section-subscribe.css
 *   - Section exposes the 25% discount callout
 *   - Section renders benefit blocks (cadence options)
 *   - CTA links into the catalog
 *   - Template composes subscribe-hero + featured-collection
 *
 * Runtime/interaction tests (Subscribe link in nav, page load, CTA click)
 * live in tests/browser/subscribe-page.spec.js.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const templatePath  = join(root, 'templates/page.subscribe.json');
const sectionPath   = join(root, 'sections/subscribe-hero.liquid');
const cssPath       = join(root, 'assets/section-subscribe.css');

let template;
let section;
let css;

beforeAll(() => {
  template = JSON.parse(readFileSync(templatePath, 'utf8'));
  section  = readFileSync(sectionPath, 'utf8');
  css      = readFileSync(cssPath, 'utf8');
});

// ---------------------------------------------------------------------------
// File existence
// ---------------------------------------------------------------------------

describe('AC — required files exist', () => {
  it('templates/page.subscribe.json exists', () => {
    expect(existsSync(templatePath)).toBe(true);
  });

  it('sections/subscribe-hero.liquid exists', () => {
    expect(existsSync(sectionPath)).toBe(true);
  });

  it('assets/section-subscribe.css exists', () => {
    expect(existsSync(cssPath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Template structure
// ---------------------------------------------------------------------------

describe('AC — template/page.subscribe.json structure', () => {
  it('includes a subscribe-hero section', () => {
    const sectionTypes = Object.values(template.sections).map((s) => s.type);
    expect(sectionTypes).toContain('subscribe-hero');
  });

  it('includes a featured-collection section for catalog CTA', () => {
    const sectionTypes = Object.values(template.sections).map((s) => s.type);
    expect(sectionTypes).toContain('featured-collection');
  });

  it('subscribe-hero is rendered before featured-collection', () => {
    const order = template.order;
    const heroIdx       = order.findIndex((id) => template.sections[id]?.type === 'subscribe-hero');
    const collectionIdx = order.findIndex((id) => template.sections[id]?.type === 'featured-collection');
    expect(heroIdx).toBeGreaterThanOrEqual(0);
    expect(collectionIdx).toBeGreaterThan(heroIdx);
  });

  it('subscribe-hero has benefit blocks', () => {
    const heroKey = Object.keys(template.sections).find(
      (k) => template.sections[k].type === 'subscribe-hero'
    );
    const blocks = template.sections[heroKey].blocks ?? {};
    const benefitBlocks = Object.values(blocks).filter((b) => b.type === 'benefit');
    expect(benefitBlocks.length).toBeGreaterThanOrEqual(3);
  });

  it('subscribe-hero default heading mentions Subscribe', () => {
    const heroKey = Object.keys(template.sections).find(
      (k) => template.sections[k].type === 'subscribe-hero'
    );
    const heading = template.sections[heroKey].settings?.heading ?? '';
    expect(heading.toLowerCase()).toMatch(/subscribe/);
  });

  it('subscribe-hero uses discount_percent (not badge_text) for the discount callout', () => {
    const heroKey = Object.keys(template.sections).find(
      (k) => template.sections[k].type === 'subscribe-hero'
    );
    const settings = template.sections[heroKey].settings ?? {};
    expect(settings).not.toHaveProperty('badge_text');
    expect(settings).toHaveProperty('discount_percent', 25);
    expect(settings).toHaveProperty('show_badge', true);
  });

  it('CTA link points into the catalog', () => {
    const heroKey = Object.keys(template.sections).find(
      (k) => template.sections[k].type === 'subscribe-hero'
    );
    const ctaLink = template.sections[heroKey].settings?.cta_link ?? '';
    expect(ctaLink).toMatch(/collections/);
  });
});

// ---------------------------------------------------------------------------
// Section content
// ---------------------------------------------------------------------------

describe('AC — sections/subscribe-hero.liquid content', () => {
  it('loads section-subscribe.css', () => {
    expect(section).toMatch(/section-subscribe\.css/);
  });

  it('renders the discount badge from discount_percent (not free-text)', () => {
    expect(section).toMatch(/discount_percent/);
    expect(section).toMatch(/subscribe-hero__badge/);
    expect(section).not.toMatch(/badge_text/);
  });

  it('badge is guarded by show_badge so operators can hide it intentionally', () => {
    expect(section).toMatch(/section\.settings\.show_badge/);
  });

  it('badge text is computed in Liquid, not stored as user-editable string', () => {
    expect(section).toMatch(/Save.*discount_percent.*%/);
  });

  it('renders the heading setting', () => {
    expect(section).toMatch(/section\.settings\.heading/);
    expect(section).toMatch(/subscribe-hero__heading/);
  });

  it('renders the body / value prop setting', () => {
    expect(section).toMatch(/section\.settings\.body/);
    expect(section).toMatch(/subscribe-hero__body/);
  });

  it('renders the CTA button with cta_label and cta_link', () => {
    expect(section).toMatch(/cta_label/);
    expect(section).toMatch(/cta_link/);
    expect(section).toMatch(/button--primary/);
  });

  it('renders benefit blocks', () => {
    expect(section).toMatch(/subscribe-benefit/);
    expect(section).toMatch(/block\.type == 'benefit'/);
  });

  it('applies brand_color_primary to hero background', () => {
    expect(section).toMatch(/settings\.brand_color_primary/);
  });

  it('applies brand_color_accent to hero badge and CTA', () => {
    expect(section).toMatch(/settings\.brand_color_accent/);
  });

  it('uses data-subscribe-hero attribute for browser-test targeting', () => {
    expect(section).toMatch(/data-subscribe-hero/);
  });

  it('uses data-subscribe-benefits attribute for browser-test targeting', () => {
    expect(section).toMatch(/data-subscribe-benefits/);
  });
});

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

describe('AC — assets/section-subscribe.css', () => {
  it('defines subscribe-hero styles', () => {
    expect(css).toMatch(/\.subscribe-hero/);
  });

  it('defines responsive benefit grid', () => {
    expect(css).toMatch(/subscribe-benefits__grid/);
    expect(css).toMatch(/repeat\(3, 1fr\)/);
  });

  it('defines subscribe-benefit styles', () => {
    expect(css).toMatch(/\.subscribe-benefit/);
  });
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('AC — schema completeness', () => {
  it('section schema declares "Subscribe: Hero" name', () => {
    expect(section).toMatch(/"name":\s*"Subscribe: Hero"/);
  });

  it('schema has show_badge setting', () => {
    expect(section).toMatch(/"id":\s*"show_badge"/);
  });

  it('schema has discount_percent range setting', () => {
    expect(section).toMatch(/"id":\s*"discount_percent"/);
  });

  it('schema has cta_link setting', () => {
    expect(section).toMatch(/"id":\s*"cta_link"/);
  });

  it('schema has benefit block type', () => {
    expect(section).toMatch(/"type":\s*"benefit"/);
  });
});
