import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const facetsPath = join(root, 'snippets/facets.liquid');
const collectionSectionPath = join(root, 'sections/main-collection-product-grid.liquid');
const collectionTemplatePath = join(root, 'templates/collection.json');

let facets;
let collectionSection;
let collectionTemplate;

beforeAll(() => {
  facets = readFileSync(facetsPath, 'utf8');
  collectionSection = readFileSync(collectionSectionPath, 'utf8');
  collectionTemplate = JSON.parse(readFileSync(collectionTemplatePath, 'utf8'));
});

describe('AC1–AC3 — filter by roast level, process, and origin (native storefront filtering)', () => {
  it('collection template has enable_filtering set to true', () => {
    expect(collectionTemplate.sections['product-grid'].settings.enable_filtering).toBe(true);
  });

  it('collection section renders the facets snippet when filtering is enabled', () => {
    expect(collectionSection).toMatch(/render\s+'facets'/);
  });

  it('facets snippet passes the results object to filter iteration', () => {
    expect(facets).toMatch(/for\s+filter\s+in\s+results\.filters/);
  });

  it('facets snippet handles list-type filters (roast level, process, origin are single_line_text)', () => {
    expect(facets).toMatch(/when\s+'boolean',\s*'list'/);
  });

  it('facets snippet renders checkbox inputs for each filter value', () => {
    expect(facets).toMatch(/type="checkbox"/);
    expect(facets).toMatch(/name="\{\{.*value\.param_name.*\}\}"/);
    expect(facets).toMatch(/value="\{\{.*value\.value.*\}\}"/);
  });
});

describe('AC4 — multiple filters can be active simultaneously', () => {
  it('each filter value has an independent param_name (URL-based accumulation)', () => {
    expect(facets).toMatch(/value\.param_name/);
    // Each checkbox posts its own param, so multiple can be submitted in one form.
    expect(facets).toMatch(/<form\s+id="FacetFiltersForm"/);
  });

  it('active filter count is tracked per filter', () => {
    expect(facets).toMatch(/filter\.active_values\.size/);
  });
});

describe('AC5 — removing a filter restores hidden products', () => {
  it('each active filter value has a url_to_remove link', () => {
    expect(facets).toMatch(/value\.url_to_remove/);
  });

  it('uses facet-remove custom element to handle removal', () => {
    expect(facets).toMatch(/<facet-remove/);
  });

  it('clear-all link points to the base results URL (no filters)', () => {
    expect(facets).toMatch(/href="\{\{\s*results_url\s*\}\}"/);
  });

  it('individual filter group has a reset link via url_to_remove', () => {
    expect(facets).toMatch(/filter\.url_to_remove/);
  });
});

describe('AC6 — filter UI is accessible (keyboard-navigable, correct ARIA roles)', () => {
  it('each filter group uses a fieldset with a visually-hidden legend', () => {
    expect(facets).toMatch(/<fieldset/);
    expect(facets).toMatch(/class="visually-hidden"\s*>\s*\{\{\s*filter\.label/);
  });

  it('each checkbox has an associated label element', () => {
    expect(facets).toMatch(/<label\s+for="\{\{.*input_id.*\}\}"/);
  });

  it('filter summary has an aria-label describing the filter and selection count', () => {
    expect(facets).toMatch(/aria-label="\{\{.*filter\.label.*\}\}/);
  });

  it('product count region has role="status" for screen reader announcements', () => {
    expect(facets).toMatch(/role="status"/);
  });

  it('filter list has role="list"', () => {
    expect(facets).toMatch(/role="list"/);
  });

  it('mobile filter drawer uses a details/summary disclosure pattern', () => {
    expect(facets).toMatch(/<menu-drawer/);
    expect(facets).toMatch(/<details\s+class="mobile-facets__disclosure/);
  });

  it('disabled filter values get a disabled attribute (not a broken click target)', () => {
    expect(facets).toMatch(/\{%\s*if\s+is_disabled\s*%\}/);
    expect(facets).toMatch(/disabled/);
  });
});

describe('AC7 — collection page renders correctly with no filters active', () => {
  it('section schema has enable_filtering setting wired up', () => {
    expect(collectionSection).toMatch(/"id":\s*"enable_filtering"/);
  });

  it('section only renders facets wrapper when filtering or sorting is enabled', () => {
    expect(collectionSection).toMatch(/if\s+section\.settings\.enable_filtering\s+or\s+section\.settings\.enable_sorting/);
  });

  it('has an empty state message when collection has no products', () => {
    expect(collectionSection).toMatch(/collection\.products\.size\s*==\s*0/);
    expect(collectionSection).toMatch(/sections\.collection_template\.use_fewer_filters_html/);
  });

  it('facets snippet skips filter rendering when results.filters is empty', () => {
    // The horizontal heading is conditionally rendered when filters exist.
    expect(facets).toMatch(/results\.filters\s*!=\s*empty/);
  });
});
