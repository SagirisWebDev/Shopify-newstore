#!/usr/bin/env node
/**
 * Full store migration — runs all steps in order.
 *
 * Usage:
 *   node --env-file=.env scripts/migration/index.mjs
 *
 * To skip a step, set the corresponding env var to "skip":
 *   SKIP_STEPS=01,03 node --env-file=.env scripts/migration/index.mjs
 */
import { requireEnv } from './lib/api.mjs';

import * as step01 from './01-push-theme.mjs';
import * as step02 from './02-brand-tokens.mjs';
import * as step02b from './02b-theme-templates.mjs';
import * as step03 from './03-pages.mjs';
import * as step04 from './04-navigation.mjs';
import * as step05 from './05-collections.mjs';
import * as step06 from './06-metafields.mjs';
import * as step07 from './07-recharge.mjs';
import * as step08 from './08-final-checks.mjs';

requireEnv();

const STEPS = [
  { id: '01', name: 'Push theme',        module: step01 },
  { id: '02',  name: 'Brand tokens',        module: step02 },
  { id: '02b', name: 'Theme templates',    module: step02b },
  { id: '03',  name: 'Pages',             module: step03 },
  { id: '04', name: 'Navigation',        module: step04 },
  { id: '05', name: 'Collections',       module: step05 },
  { id: '06', name: 'Metafields',        module: step06 },
  { id: '07', name: 'Recharge (manual)', module: step07 },
  { id: '08', name: 'Final checks',      module: step08 },
];

const skipped = new Set((process.env.SKIP_STEPS ?? '').split(',').map(s => s.trim()).filter(Boolean));

const BAR = '─'.repeat(52);

async function main() {
  const start = Date.now();
  console.log(`\n${'═'.repeat(52)}`);
  console.log(`  Common Roast — Store Migration`);
  console.log(`${'═'.repeat(52)}\n`);

  const results = [];

  for (const step of STEPS) {
    if (skipped.has(step.id)) {
      console.log(`${BAR}\n  [${step.id}] ${step.name} — SKIPPED\n`);
      results.push({ ...step, status: 'skipped' });
      continue;
    }

    console.log(`${BAR}\n  [${step.id}] ${step.name}\n${BAR}`);
    const t0 = Date.now();
    try {
      await step.module.run();
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n  ✓ Done (${elapsed}s)`);
      results.push({ ...step, status: 'ok' });
    } catch (err) {
      console.error(`\n  ✗ FAILED: ${err.message}`);
      console.error('  Continuing to next step...');
      results.push({ ...step, status: 'failed', error: err.message });
    }
    console.log();
  }

  // Summary
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`${'═'.repeat(52)}`);
  console.log(`  Migration complete in ${elapsed}s\n`);
  for (const r of results) {
    const icon = r.status === 'ok' ? '✓' : r.status === 'skipped' ? '–' : '✗';
    console.log(`  ${icon} [${r.id}] ${r.name}${r.error ? ` — ${r.error}` : ''}`);
  }
  console.log(`${'═'.repeat(52)}\n`);

  if (results.some(r => r.status === 'failed')) process.exit(1);
}

main().catch(err => { console.error('\n✗', err.message); process.exit(1); });
