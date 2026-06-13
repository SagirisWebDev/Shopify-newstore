#!/usr/bin/env node
/**
 * Merges coffee-metafields.csv into common-roast-products.csv and writes
 * common-roast-products-with-metafields.csv.
 *
 * Metafield values are placed only on the first (title) row of each product.
 * Variant rows (empty Title) get empty metafield columns, per Shopify's spec.
 *
 * Usage: node data/merge-metafields.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.filter(l => l.trim() !== '').map(line => {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current); current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current);
    return fields;
  });
}

function quoteField(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowToCSV(fields) {
  return fields.map(quoteField).join(',');
}

// --- Load metafields CSV ---
const metaRaw = readFileSync(join(__dirname, 'coffee-metafields.csv'), 'utf8');
const metaRows = parseCSV(metaRaw);
const metaHeader = metaRows[0];
const handleIdx = metaHeader.indexOf('Handle');

// Build lookup: handle -> { colName: value }
const metaLookup = {};
for (let i = 1; i < metaRows.length; i++) {
  const row = metaRows[i];
  const handle = row[handleIdx];
  if (!handle) continue;
  metaLookup[handle] = {};
  for (let c = 0; c < metaHeader.length; c++) {
    if (c !== handleIdx) metaLookup[handle][metaHeader[c]] = row[c] ?? '';
  }
}

// The 3 metafield column names (in order)
const metaCols = metaHeader.filter((_, i) => i !== handleIdx);

// --- Load products CSV ---
const prodRaw = readFileSync(join(__dirname, 'common-roast-products.csv'), 'utf8');
const prodRows = parseCSV(prodRaw);
const prodHeader = prodRows[0];

// New header = product header + metafield columns
const newHeader = [...prodHeader, ...metaCols];

const handleColIdx = prodHeader.indexOf('URL handle');
const titleColIdx = prodHeader.indexOf('Title');

const outputRows = [newHeader];

for (let i = 1; i < prodRows.length; i++) {
  const row = [...prodRows[i]];
  const handle = row[handleColIdx] ?? '';
  const title = row[titleColIdx] ?? '';
  const isProductRow = title.trim() !== '';

  if (isProductRow && metaLookup[handle]) {
    for (const col of metaCols) {
      row.push(metaLookup[handle][col] ?? '');
    }
  } else {
    for (let c = 0; c < metaCols.length; c++) row.push('');
  }

  outputRows.push(row);
}

const output = outputRows.map(rowToCSV).join('\n') + '\n';
const outPath = join(__dirname, 'common-roast-products-with-metafields.csv');
writeFileSync(outPath, output, 'utf8');

console.log(`Written: ${outPath}`);
console.log(`Products: ${outputRows.length - 1} rows (including variants)`);
console.log(`Metafield columns added: ${metaCols.join(', ')}`);
