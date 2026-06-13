export const API_VERSION = '2025-01';

export const SOURCE_STORE = process.env.SOURCE_STORE;
export const SOURCE_TOKEN = process.env.SOURCE_TOKEN;
export const TARGET_STORE = process.env.TARGET_STORE;
export const TARGET_TOKEN = process.env.TARGET_TOKEN;

export function requireEnv() {
  const missing = ['SOURCE_STORE', 'SOURCE_TOKEN', 'TARGET_STORE', 'TARGET_TOKEN']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export async function gql(store, token, query, variables = {}) {
  const res = await fetch(`https://${store}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GQL ${res.status} from ${store}: ${await res.text()}`);
  const { data, errors } = await res.json();
  if (errors) throw new Error(JSON.stringify(errors, null, 2));
  return data;
}

export async function rest(store, token, method, path, body = null) {
  const url = `https://${store}/admin/api/${API_VERSION}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`REST ${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Fetches all pages of a REST collection using cursor-based pagination (Link header).
export async function restAll(store, token, path, resultKey) {
  const items = [];
  let url = `https://${store}/admin/api/${API_VERSION}${path}`;
  while (url) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    });
    if (!res.ok) throw new Error(`REST GET ${path}: ${res.status} ${await res.text()}`);
    const json = await res.json();
    items.push(...(json[resultKey] ?? []));
    const link = res.headers.get('Link') ?? '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return items;
}
