/**
 * Create Common Roast gift card products in the Shopify dev store.
 *
 * Run once to seed the three denominations ($25, $50, $100).
 * Safe to re-run — exits early if a "Common Roast Gift Card" product already exists.
 *
 * Usage:
 *   SHOPIFY_STORE=common-roast.myshopify.com \
 *   SHOPIFY_ACCESS_TOKEN=shpat_... \
 *   node scripts/create-gift-cards.mjs
 *
 * Access token: Shopify admin → Settings → Apps → Develop apps → your app
 *   Required scopes: write_products, write_gift_cards
 *
 * After running:
 *   1. In Shopify admin, go to the new gift card product
 *   2. Set template to "product.gift-card" in the Online Store section
 *   3. Add it to a "Gift Cards" collection (type = "Gift Card" rule)
 *   4. Exclude from the "Coffee" collection (verify collection rules)
 */

const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!STORE || !TOKEN) {
  console.error('Set SHOPIFY_STORE and SHOPIFY_ACCESS_TOKEN environment variables.');
  process.exit(1);
}

const endpoint = `https://${STORE}/admin/api/2025-01/graphql.json`;

async function graphql(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

// Check if the gift card product already exists
const existing = await graphql(`{
  products(first: 5, query: "title:'Common Roast Gift Card'") {
    edges { node { id title } }
  }
}`);

if (existing.products.edges.length > 0) {
  console.log('Gift card product already exists:', existing.products.edges[0].node.title);
  process.exit(0);
}

// Create the gift card product with three denomination variants
const result = await graphql(`
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        variants(first: 5) {
          edges { node { id title price } }
        }
      }
      userErrors { field message }
    }
  }
`, {
  input: {
    title: 'Common Roast Gift Card',
    productType: 'Gift Card',
    giftCard: true,
    descriptionHtml: '<p>Give the gift of great coffee. Common Roast gift cards never expire and can be used on any order.</p>',
    tags: ['gift-card'],
    variants: [
      { title: '$25', price: '25.00', requiresShipping: false, taxable: false },
      { title: '$50', price: '50.00', requiresShipping: false, taxable: false },
      { title: '$100', price: '100.00', requiresShipping: false, taxable: false },
    ],
  },
});

const { product, userErrors } = result.productCreate;

if (userErrors.length > 0) {
  console.error('Errors:', userErrors);
  process.exit(1);
}

console.log(`Created: ${product.title} (${product.handle})`);
console.log(`Admin URL: https://${STORE}/admin/products/${product.id.split('/').pop()}`);
console.log('Variants:');
product.variants.edges.forEach(({ node }) => {
  console.log(`  ${node.title} — $${node.price}`);
});
console.log('\nNext steps:');
console.log('  1. Set template to "product.gift-card" on the product page');
console.log('  2. Create a "Gift Cards" collection with rule: product type = Gift Card');
console.log('  3. Verify the coffee collection does not include this product');
