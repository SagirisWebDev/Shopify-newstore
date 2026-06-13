#!/usr/bin/env node
/**
 * Recharge subscriptions cannot be migrated via API — this step prints
 * the manual setup instructions.
 */

export async function run() {
  console.log(`
  Recharge must be set up manually on the target store:

  1. Install the Recharge app from the Shopify App Store on common-roast.myshopify.com
  2. In Recharge, go to Products → Subscription rules
  3. Create a new selling plan group:
       Name:     Subscribe & Save
       Discount: 25% off recurring orders
       Frequency options: every 1, 2, 4 weeks / 1, 2, 3 months (match source store)
  4. Assign the plan to all bean products (exclude the gift card):
       - Ethiopia Yirgacheffe Natural
       - Colombia Huila Washed
       - Guatemala Antigua Honey
       - Kenya Nyeri AA Washed
       - Brazil Cerrado Natural
       - Peru Cajamarca Washed
       - Morning Ritual
       - After Dark
       - Swiss Water Decaf Colombia
  5. Verify the Subscribe & Save widget appears on each product page
  `);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  run().catch(err => { console.error('✗', err.message); process.exit(1); });
}
