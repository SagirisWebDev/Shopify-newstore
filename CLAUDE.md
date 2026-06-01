## Local dev setup

**Prerequisites:** Shopify CLI 3.x (`shopify version`), Node.js 18+.

1. Install JS dependencies: `npm install`
2. Authenticate with Shopify: `shopify auth login`
3. Start the dev server: `shopify theme dev --store <your-store>.myshopify.com`
4. Run tests: `npm test`

The theme is a fork of Dawn 15.4.1. All brand token settings live under **Common Roast — Brand Tokens** in the theme editor — change those four settings to re-skin for a new Client.

---

## Agent skills

### Issue tracker

Issues live in GitHub Issues (use the `gh` CLI). See `.swd-harness/docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `.swd-harness/docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` and `docs/adr/` at the repo root. See `.swd-harness/docs/agents/domain.md`.
