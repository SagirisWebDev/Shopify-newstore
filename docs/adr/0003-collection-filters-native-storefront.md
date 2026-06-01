# Collection filters: native storefront filtering over client-side JS

The collection filter UI (roast level, process, origin) is powered by Shopify's native storefront filtering via the Search & Discovery app. No client-side JS filter logic is written in this theme.

## Considered Options

- **Native storefront filtering (chosen)** — Shopify's Search & Discovery app exposes product metafield values as URL-parameter filter facets. Dawn's `facets.liquid` snippet already iterates `collection.filters` and renders checkbox UI, active-pill removal, mobile drawer, AJAX page refresh, and sort-by. No theme code is required beyond enabling `enable_filtering: true` on the section (already set in `templates/collection.json`). Requires configuring three metafield filters in the Search & Discovery admin: `coffee.roast_level`, `coffee.process`, `coffee.origin_country`.

- **Client-side JS filtering** — Attach `data-roast`, `data-process`, `data-origin` attributes to each product card, then toggle `hidden` via JS when checkboxes change. Rejected because: (a) it cannot handle paginated collections — only the current page's products are in the DOM; (b) it requires bespoke, untested JS that duplicates platform behaviour; (c) it breaks the URL-shareable-filter-state contract that native filtering provides for free; (d) it doesn't scale to future filter additions without theme changes.

## Consequences

- Filtering works out-of-the-box on any collection with populated metafields, without any additional theme code.
- To make filters appear, the store operator must configure the three metafield filter rules in **Online Store → Search & Discovery → Filters** (see CONTEXT.md). This is a one-time admin step and cannot be automated from the theme.
- Filter labels shown to Shoppers come from the Search & Discovery configuration, not the theme. Label copy should be set there: "Roast Level", "Process", "Origin".
- If a metafield filter is not configured in Search & Discovery, that filter simply does not appear — the collection page still renders correctly with no filters shown.
