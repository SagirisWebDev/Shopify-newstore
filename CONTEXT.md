# Shopify Portfolio Demo Store

A fully-built Shopify store for a fictional brand that doubles as a portfolio piece, used to win paying **Clients** who want a Shopify site built or rebuilt.

## Language

**Demo Store**:
The single Shopify storefront being built in this repo — a fully-functioning store for a fictional brand, designed to be shown to prospective Clients.
_Avoid_: portfolio site, sample site, mock store

**Client**:
A business that pays the operator of this repo to build or rebuild their Shopify store. Targeted tier: mid-market DTC brands with $10k–$50k build budgets.
_Avoid_: customer, lead, prospect (when referring to the buyer of services)

**Shopper**:
A person browsing or buying from a Shopify storefront (the Demo Store or a Client's store). In Shopify's own UI this is called a "Customer" — we use **Shopper** here to keep it distinct from **Client**.
_Avoid_: customer, user, buyer

**Fictional Brand**:
The made-up brand the Demo Store represents. **Common Roast** — an approachable-specialty house roaster with subscription + wholesale. Positioning is egalitarian, anti-snob, accessible to newcomers without losing coffee fluency. Visual identity TBD.

## Relationships

- A **Demo Store** sells products on behalf of a **Fictional Brand** to **Shoppers**
- A **Client** evaluates the **Demo Store** when deciding whether to hire the operator

## Flagged ambiguities

- "customer" is overloaded — in Shopify's own admin UI it means **Shopper**, but in freelance/agency parlance it often means **Client**. Resolved: always use **Shopper** or **Client** explicitly in this repo's docs and code; never "customer".

## Coffee metafield schema

All bean products carry these metafield definitions. Namespace: `coffee`. Access in Liquid as `product.metafields.coffee.<key>`.

| Field | Key | Type | Notes |
|---|---|---|---|
| Origin country | `origin_country` | single_line_text_field | e.g. "Ethiopia" |
| Origin region | `origin_region` | single_line_text_field | e.g. "Yirgacheffe" |
| Producer / farm name | `producer_farm_name` | single_line_text_field | |
| Varietal | `varietal` | single_line_text_field | e.g. "Heirloom" |
| Altitude | `altitude` | single_line_text_field | e.g. "1800–2200 masl" |
| Process | `process` | single_line_text_field | washed / natural / honey / other |
| Roast level | `roast_level` | single_line_text_field | light / medium / dark |
| Roast date | `roast_date` | date | Used by freshness calculator |
| Tasting notes | `tasting_notes` | list.single_line_text_field | |
| Brew recommendations | `brew_recommendations` | json | Array of `{ method, description }` objects |
| Decaf method | `decaf_method` | single_line_text_field | Optional; omit on caffeinated products |

**Dev fixture:** Ethiopia Yirgacheffe Natural — fully populated with all fields; use this product when developing the PDP and coffee card.
