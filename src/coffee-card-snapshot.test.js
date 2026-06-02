// @vitest-environment jsdom
/**
 * Snapshot + a11y tests for snippets/coffee-card.liquid
 *
 * These tests render actual HTML (not just inspect source) using liquidjs,
 * snapshot the structural markup, and run axe-core for accessibility.
 *
 * AC1: Snapshot test captures the structural HTML of the coffee card
 * AC2: Snapshot fails if card markup structure changes unexpectedly
 * AC3: axe-core reports zero a11y violations
 * AC4: Runs as part of `npm test`
 * AC5: Snapshot scope is tight — no image URLs, computed styles, or dynamic content
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Liquid } from 'liquidjs';
import axe from 'axe-core';
import { JSDOM } from 'jsdom';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Ethiopia Yirgacheffe Natural — dev fixture (fully populated metafields)
// ---------------------------------------------------------------------------
const fixture = {
  title: 'Ethiopia Yirgacheffe Natural',
  url: '/products/ethiopia-yirgacheffe-natural',
  featured_media: {
    alt: 'Ethiopia Yirgacheffe Natural coffee bag',
    aspect_ratio: 1.0,
  },
  metafields: {
    coffee: {
      origin_country: { value: 'Ethiopia' },
      origin_region: { value: 'Yirgacheffe' },
      producer_farm_name: { value: 'Worka Cooperative' },
      varietal: { value: 'Heirloom' },
      altitude: { value: '1800–2200 masl' },
      process: { value: 'natural' },
      roast_level: { value: 'light' },
      roast_date: { value: '2026-05-20' },
      tasting_notes: { value: ['Blueberry', 'Jasmine', 'Dark Chocolate'] },
      brew_recommendations: {
        value: [
          { method: 'Pour Over', description: 'Highlight the florals at 92°C' },
          { method: 'French Press', description: 'Brings out the chocolate' },
        ],
      },
      decaf_method: { value: null },
    },
  },
};

// ---------------------------------------------------------------------------
// liquidjs setup with Shopify-specific filter stubs
// ---------------------------------------------------------------------------
function buildEngine() {
  const engine = new Liquid({
    // No partials directory — we stub the price render below
    strictFilters: false,
    strictVariables: false,
  });

  // image_url: return a stable placeholder so snapshots don't embed URLs
  engine.registerFilter('image_url', (_img, _opts) => 'IMAGE_URL_STUB');

  // stylesheet_tag: emit a link tag with the stubbed URL
  engine.registerFilter('stylesheet_tag', (url) => `<link rel="stylesheet" href="${url}">`);

  // placeholder_svg_tag: emit a minimal inline SVG stub
  engine.registerFilter('placeholder_svg_tag', (_name, cssClass) =>
    `<svg class="${cssClass}" aria-hidden="true"><rect width="100" height="100"/></svg>`
  );

  // asset_url: return the asset filename as-is for predictable output
  engine.registerFilter('asset_url', (name) => `/assets/${name}`);

  // divided_by: numeric division (used for aspect ratio height calc)
  engine.registerFilter('divided_by', (num, divisor) => (divisor ? num / divisor : 0));

  // ceil: round up to nearest integer
  engine.registerFilter('ceil', (num) => Math.ceil(num));

  // escape: minimal HTML escaping
  engine.registerFilter('escape', (str) =>
    str == null
      ? ''
      : String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
  );

  // capitalize: first letter uppercase
  engine.registerFilter('capitalize', (str) => {
    if (!str) return '';
    const s = String(str);
    return s.charAt(0).toUpperCase() + s.slice(1);
  });

  // join: array join
  engine.registerFilter('join', (arr, sep) => (Array.isArray(arr) ? arr.join(sep) : String(arr)));

  // t: translation stub — return the key as display text
  engine.registerFilter('t', (key) => key);

  return engine;
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
const snippetPath = join(root, 'snippets/coffee-card.liquid');
const snippetSource = readFileSync(snippetPath, 'utf8');

/**
 * Render the coffee-card snippet with the given context variables.
 * We strip the `{% render 'price' %}` sub-snippet call because liquidjs
 * cannot resolve Shopify-native partials — replace it with a price stub.
 */
function prepareSource(source) {
  // Replace `{% render 'price', ... %}` with a stable price stub element
  return source.replace(
    /\{%-?\s*render\s+'price'[^%]*?-?%\}/g,
    '<span class="coffee-card__price-stub">$18.00</span>'
  );
}

async function renderCard(product, extraVars = {}) {
  const engine = buildEngine();
  const source = prepareSource(snippetSource);
  return engine.parseAndRender(source, {
    card_product: product,
    lazy_load: true,
    skip_styles: false,
    ...extraVars,
  });
}

/**
 * Normalise dynamic content that should NOT be snapshotted:
 * - Image src/srcset values (already stubbed, but normalise just in case)
 * - Whitespace collapse for readability
 */
function normalise(html) {
  return html
    .replace(/srcset="[^"]*"/g, 'srcset="SRCSET_STUB"')
    .replace(/src="[^"]*"/g, 'src="SRC_STUB"')
    .replace(/href="\/assets\/[^"]*"/g, 'href="ASSET_URL_STUB"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('coffee-card snapshot tests (AC1, AC2, AC5)', () => {
  let renderedHtml;
  let normalisedHtml;

  beforeAll(async () => {
    renderedHtml = await renderCard(fixture);
    normalisedHtml = normalise(renderedHtml);
  });

  it('AC1: renders a non-empty HTML string with fixture data', () => {
    expect(renderedHtml).toBeTruthy();
    expect(renderedHtml.length).toBeGreaterThan(50);
  });

  it('AC1: rendered output contains expected structural elements', () => {
    expect(normalisedHtml).toContain('class="coffee-card');
    expect(normalisedHtml).toContain('coffee-card__info');
    expect(normalisedHtml).toContain('coffee-card__title');
    expect(normalisedHtml).toContain('coffee-card__chips');
    expect(normalisedHtml).toContain('coffee-card__tasting-notes');
  });

  it('AC1: snapshot of normalised structural HTML', () => {
    expect(normalisedHtml).toMatchSnapshot();
  });

  it('AC2: product title is rendered in the card', () => {
    expect(normalisedHtml).toContain('Ethiopia Yirgacheffe Natural');
  });

  it('AC2: origin chip renders country and region', () => {
    expect(normalisedHtml).toContain('coffee-card__chip--origin');
    expect(normalisedHtml).toContain('Ethiopia');
    expect(normalisedHtml).toContain('Yirgacheffe');
  });

  it('AC2: process chip renders process value', () => {
    expect(normalisedHtml).toContain('coffee-card__chip--process');
    expect(normalisedHtml).toContain('Natural');
  });

  it('AC2: roast chip renders roast level', () => {
    expect(normalisedHtml).toContain('coffee-card__chip--roast');
    expect(normalisedHtml).toContain('Light Roast');
  });

  it('AC2: tasting notes are rendered and joined', () => {
    expect(normalisedHtml).toContain('Blueberry');
    expect(normalisedHtml).toContain('Jasmine');
    expect(normalisedHtml).toContain('Dark Chocolate');
  });

  it('AC5: snapshot does not contain raw image URLs', () => {
    // No live Shopify CDN URLs should appear in the snapshot
    expect(normalisedHtml).not.toMatch(/cdn\.shopify\.com/);
    expect(normalisedHtml).not.toMatch(/shopifycdn\.com/);
  });

  it('AC5: snapshot does not contain inline computed styles', () => {
    // style="" blocks beyond the ratio helper are not permitted
    // The only allowed style is the --ratio-percent custom property on .ratio
    const styleAttrs = normalisedHtml.match(/style="[^"]+"/g) || [];
    styleAttrs.forEach((attr) => {
      expect(attr).toMatch(/--ratio-percent/);
    });
  });
});

describe('coffee-card placeholder branch snapshot', () => {
  it('renders placeholder card when card_product is empty/null', async () => {
    const html = await renderCard(null);
    const norm = normalise(html);
    expect(norm).toContain('coffee-card--placeholder');
    expect(norm).toMatchSnapshot();
  });
});

describe('coffee-card accessibility tests (AC3)', () => {
  let renderedHtml;

  beforeAll(async () => {
    renderedHtml = await renderCard(fixture);
  });

  it('AC3: axe-core reports zero accessibility violations', async () => {
    // The file-level `// @vitest-environment jsdom` directive gives us real
    // jsdom globals (window, document). Set up a minimal well-formed document
    // so that document-level axe rules (html-has-lang, document-title) do not
    // fire against the test harness rather than the card component itself.
    document.documentElement.setAttribute('lang', 'en');
    document.title = 'Test Harness';

    // Wrap the card in a <main> landmark so the `region` rule — which requires
    // page content to be inside a landmark — does not flag the snippet. In the
    // real storefront, the card always lives inside a sectioned page structure.
    document.body.innerHTML = `<main>${renderedHtml}</main>`;

    // Scope axe to the card element, not the whole document.
    const cardEl = document.querySelector('.coffee-card');

    // axe.run() scoped to the card element.
    const results = await axe.run(cardEl, {
      runOnly: ['wcag2a', 'wcag2aa', 'best-practice'],
    });

    if (results.violations.length > 0) {
      const report = results.violations
        .map(
          (v) =>
            `[${v.impact.toUpperCase()}] ${v.id}: ${v.description}\n` +
            v.nodes
              .map((n) => `  Selector: ${n.target.join(', ')}\n  ${n.failureSummary}`)
              .join('\n')
        )
        .join('\n\n');
      throw new Error(`axe-core found ${results.violations.length} violation(s):\n\n${report}`);
    }

    expect(results.violations).toHaveLength(0);
  });
});
