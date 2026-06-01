import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const snippetPath = join(root, 'snippets/coffee-card.liquid');
const cssPath = join(root, 'assets/coffee-card.css');
const collectionPath = join(root, 'sections/main-collection-product-grid.liquid');

let snippet;
let css;
let collection;

beforeAll(() => {
  snippet = readFileSync(snippetPath, 'utf8');
  css = readFileSync(cssPath, 'utf8');
  collection = readFileSync(collectionPath, 'utf8');
});

describe('AC1 — snippets/coffee-card.liquid exists and renders from coffee metafields', () => {
  it('snippet file exists at snippets/coffee-card.liquid', () => {
    expect(existsSync(snippetPath)).toBe(true);
  });

  it('accepts a card_product parameter', () => {
    // Liquid snippets receive locally-scoped variables; the snippet must reference card_product.
    expect(snippet).toMatch(/card_product/);
  });

  it('reads from the coffee metafield namespace', () => {
    expect(snippet).toMatch(/card_product\.metafields\.coffee/);
  });

  it('reads each documented coffee metafield key', () => {
    expect(snippet).toMatch(/coffee\.origin_country/);
    expect(snippet).toMatch(/coffee\.origin_region/);
    expect(snippet).toMatch(/coffee\.process/);
    expect(snippet).toMatch(/coffee\.roast_level/);
    expect(snippet).toMatch(/coffee\.tasting_notes/);
  });
});

describe('AC2 — card displays title, price, origin/process/roast chips, tasting notes', () => {
  it('renders the product title', () => {
    // Must output card_product.title (escaped is fine).
    expect(snippet).toMatch(/card_product\.title[^}]*}}/);
  });

  it('renders price via the price snippet (Dawn convention)', () => {
    expect(snippet).toMatch(/render\s+'price'/);
    // Price must be passed the current card product.
    expect(snippet).toMatch(/render\s+'price'[^%]*product:\s*card_product/);
  });

  it('emits an origin chip element', () => {
    expect(snippet).toMatch(/coffee-card__chip--origin/);
    // Origin chip output must include the origin_country value.
    const originBlock = snippet.match(/coffee-card__chip--origin[\s\S]*?<\/li>/);
    expect(originBlock, 'origin chip <li> should exist').toBeTruthy();
    expect(originBlock[0]).toMatch(/origin_country/);
  });

  it('emits a process chip element', () => {
    expect(snippet).toMatch(/coffee-card__chip--process/);
    const processBlock = snippet.match(/coffee-card__chip--process[\s\S]*?<\/li>/);
    expect(processBlock, 'process chip <li> should exist').toBeTruthy();
    expect(processBlock[0]).toMatch(/\bprocess\b/);
  });

  it('emits a roast-level chip element', () => {
    expect(snippet).toMatch(/coffee-card__chip--roast/);
    const roastBlock = snippet.match(/coffee-card__chip--roast[\s\S]*?<\/li>/);
    expect(roastBlock, 'roast chip <li> should exist').toBeTruthy();
    expect(roastBlock[0]).toMatch(/roast_level/);
  });

  it('renders tasting notes', () => {
    expect(snippet).toMatch(/coffee-card__tasting-notes/);
    // Tasting notes are a list metafield; joining is the conventional render.
    expect(snippet).toMatch(/tasting_notes\s*\|\s*join/);
  });

  it('chips list has an accessible label', () => {
    expect(snippet).toMatch(/<ul[^>]*class="[^"]*coffee-card__chips[^"]*"[^>]*aria-label=/);
  });

  it('ships card CSS so chips/tasting notes have layout', () => {
    expect(existsSync(cssPath)).toBe(true);
    expect(css).toMatch(/\.coffee-card__chip\b/);
    expect(css).toMatch(/\.coffee-card__tasting-notes\b/);
    expect(css).toMatch(/\.coffee-card__title\b/);
    expect(css).toMatch(/\.coffee-card__price\b/);
  });

  it('snippet links the coffee-card stylesheet', () => {
    expect(snippet).toMatch(/'coffee-card\.css'\s*\|\s*asset_url\s*\|\s*stylesheet_tag/);
  });
});

describe('AC3 — collection template uses the snippet for every product in the grid', () => {
  it('main-collection-product-grid renders the coffee-card snippet', () => {
    expect(collection).toMatch(/render\s+'coffee-card'/);
  });

  it('the render call sits inside the products for-loop', () => {
    // Capture from `for product in collection.products` to its matching `endfor`,
    // then assert the coffee-card render is within that block.
    const loopMatch = collection.match(/for\s+product\s+in\s+collection\.products[\s\S]*?endfor/);
    expect(loopMatch, 'expected a for-loop over collection.products').toBeTruthy();
    expect(loopMatch[0]).toMatch(/render\s+'coffee-card'/);
  });

  it('passes the current product into the snippet as card_product', () => {
    expect(collection).toMatch(/render\s+'coffee-card'[\s\S]*?card_product:\s*product/);
  });

  it('does not also render the legacy card-product snippet inside the grid loop', () => {
    // Sanity check that the legacy Dawn card has been fully replaced in the grid.
    const loopMatch = collection.match(/for\s+product\s+in\s+collection\.products[\s\S]*?endfor/);
    expect(loopMatch[0]).not.toMatch(/render\s+'card-product'/);
  });
});

describe('AC5 — card renders gracefully when optional metafields are missing', () => {
  it('guards every optional chip with an {% if %} so missing fields do not output empty markup', () => {
    // The chip block is only emitted if at least one chip-eligible field is present.
    expect(snippet).toMatch(/if\s+has_chips/);
    // Each individual chip is wrapped in its own conditional.
    expect(snippet).toMatch(/if\s+origin_country/);
    expect(snippet).toMatch(/if\s+process/);
    expect(snippet).toMatch(/if\s+roast_level/);
  });

  it('origin_region is appended conditionally inside the origin chip (not a separate empty element)', () => {
    const originBlock = snippet.match(/coffee-card__chip--origin[\s\S]*?<\/li>/)[0];
    expect(originBlock).toMatch(/if\s+origin_region/);
  });

  it('tasting notes block is guarded by both presence and non-empty size', () => {
    // tasting_notes is a list metafield; rendering an empty array would output an empty <p>.
    const tastingGuard = snippet.match(/if\s+tasting_notes[^%]*%}/);
    expect(tastingGuard, 'expected an {% if tasting_notes ... %} guard').toBeTruthy();
    expect(tastingGuard[0]).toMatch(/tasting_notes\.size\s*>\s*0/);
  });

  it('has a placeholder branch for a missing/empty card_product', () => {
    // A missing card_product should still render a structurally-valid card, not crash the loop.
    expect(snippet).toMatch(/if\s+card_product\s+and\s+card_product\s*!=\s*empty/);
    expect(snippet).toMatch(/coffee-card--placeholder/);
  });

  it('guards featured_media so products without images do not emit a broken <img>', () => {
    expect(snippet).toMatch(/if\s+card_product\.featured_media/);
  });

  it('escapes user-controlled strings to prevent broken layout from stray HTML', () => {
    // Title and chip text come from metafields/title — must be escaped.
    expect(snippet).toMatch(/card_product\.title\s*\|\s*escape/);
    expect(snippet).toMatch(/origin_country\s*\|\s*escape/);
  });
});
