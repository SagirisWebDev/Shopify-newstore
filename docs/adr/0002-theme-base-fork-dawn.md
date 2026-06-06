# Theme base: fork Dawn over building from scratch

The Demo Store theme starts as a fork of Shopify's reference theme Dawn, heavily customised to land the Common Roast aesthetic and the coffee-DTC feature set. We are explicitly NOT building the theme from scratch despite the Demo Store's "portfolio piece to demonstrate skill" framing.

## Considered Options

- **Fork Dawn (chosen)** — Shopify-maintained, well-structured OS 2.0 theme. Inherits working cart drawer, predictive search, product card patterns, theme settings, and JSON template structure. Reading Dawn's source is one of the best ways to learn Shopify theme conventions, so customising it is also a learning vehicle.
- **Build from scratch** — Rejected for v1. The skill signal that a mid-market Client cares about is what the *final* store looks and works like, not where its theme started. Building from scratch costs an estimated 4–6 extra weeks for a marginal-to-zero increase in Client signal, and the time is better spent making customisations land further from Dawn's defaults — which IS the visible skill signal.
- **Fork a paid theme (Impulse, Symmetry, Pipeline)** — Rejected. Adds licensing cost, visual baggage, and weaker as a build-skill demo than Dawn. Worth revisiting if the operator wants to demo "I can take over your existing paid theme" workflows later.

## Consequences

- The customisation depth must be visibly far from default Dawn. A Demo Store that looks recognisably "Dawn but with a coffee logo" undermines the whole positioning — Clients can spot stock Dawn instantly.
- Theme architecture follows Dawn's conventions (JSON templates, section schemas, snippet structure). Future developers/agents reading the codebase should treat Dawn's patterns as the baseline, not invent new ones unless there's a specific reason.
- If we later regret this decision, the cost is rewriting templates and sections; the brand identity, product data, and Recharge setup all transfer.
