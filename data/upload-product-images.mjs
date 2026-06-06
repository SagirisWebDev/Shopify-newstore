#!/usr/bin/env node
/**
 * Uploads upscaled product images from data/img/ to Shopify products.
 * Matches image filename to product handle (lowercase, hyphens for spaces).
 *
 * Usage:
 *   SHOPIFY_TOKEN=<admin-api-token> node data/upload-product-images.mjs
 *
 * The Admin API token needs read/write Products scope.
 * Create one via: Shopify Admin → Settings → Apps → Develop apps.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, join, extname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, 'img');
const STORE = 'dev1-8903.myshopify.com';
const API_VERSION = '2025-01';
const TOKEN = process.env.SHOPIFY_TOKEN;

if (!TOKEN) {
  console.error('Error: SHOPIFY_TOKEN env var is required.');
  console.error('  SHOPIFY_TOKEN=<token> node data/upload-product-images.mjs');
  process.exit(1);
}

const BASE_URL = `https://${STORE}/admin/api/${API_VERSION}`;
const HEADERS = {
  'X-Shopify-Access-Token': TOKEN,
  'Content-Type': 'application/json',
};

async function shopify(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS, ...opts });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shopify API ${res.status} on ${path}: ${body}`);
  }
  return res.json();
}

function imageFileForHandle(handle) {
  for (const ext of ['.png', '.jpg', '.jpeg', '.webp']) {
    const candidate = join(IMG_DIR, `${handle}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function mimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  return { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[ext] ?? 'image/png';
}

async function run() {
  console.log(`Fetching products from ${STORE}…`);

  // Paginate through all products
  const products = [];
  let url = `/products.json?limit=250&fields=id,handle,title`;
  while (url) {
    const data = await shopify(url);
    products.push(...data.products);
    // Shopify REST pagination via Link header not available in this simple fetch;
    // 250 limit covers all Common Roast products
    url = null;
  }

  console.log(`Found ${products.length} products.\n`);

  const results = { uploaded: [], skipped: [], errored: [] };

  for (const product of products) {
    const imgPath = imageFileForHandle(product.handle);

    if (!imgPath) {
      console.log(`⚠  SKIP  ${product.title} — no image file for handle "${product.handle}"`);
      results.skipped.push(product.title);
      continue;
    }

    const imageData = readFileSync(imgPath);
    const attachment = imageData.toString('base64');
    const filename = basename(imgPath);

    try {
      await shopify(`/products/${product.id}/images.json`, {
        method: 'POST',
        body: JSON.stringify({
          image: {
            attachment,
            filename,
            alt: product.title,
            position: 1,
          },
        }),
      });
      console.log(`✓  OK    ${product.title}`);
      results.uploaded.push(product.title);
    } catch (err) {
      console.error(`✗  ERROR ${product.title}: ${err.message}`);
      results.errored.push(product.title);
    }
  }

  console.log('\n── Summary ──────────────────────────');
  console.log(`Uploaded : ${results.uploaded.length}`);
  console.log(`Skipped  : ${results.skipped.length}${results.skipped.length ? ' (' + results.skipped.join(', ') + ')' : ''}`);
  console.log(`Errored  : ${results.errored.length}${results.errored.length ? ' (' + results.errored.join(', ') + ')' : ''}`);
}

run().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
