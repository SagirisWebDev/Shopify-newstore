#!/usr/bin/env node
/**
 * Reads metafields-fixture.json + common-roast-products.csv and writes
 * common-roast-products-with-metafields-full.csv.
 *
 * Metafield values are placed only on the first (title) row of each product.
 * Variant rows (empty Title) get empty metafield columns, per Shopify's spec.
 *
 * Usage: node data/fixture-to-merged-csv.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIELD_ORDER = [
  'origin_country',
  'origin_region',
  'producer_farm_name',
  'varietal',
  'altitude',
  'process',
  'roast_level',
  'roast_date',
  'tasting_notes',
  'brew_recommendations',
];

const FIELD_TYPES = {
  origin_country:       'single_line_text_field',
  origin_region:        'single_line_text_field',
  producer_farm_name:   'single_line_text_field',
  varietal:             'single_line_text_field',
  altitude:             'single_line_text_field',
  process:              'single_line_text_field',
  roast_level:          'single_line_text_field',
  roast_date:           'date',
  tasting_notes:        'list.single_line_text_field',
  brew_recommendations: 'json',
};

function colHeader(key) {
  return `Metafield: coffee.${key} [${FIELD_TYPES[key]}]`;
}

function fieldValue(key, raw) {
  if (raw === null || raw === undefined) return '';
  if (Array.isArray(raw) || typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

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

// --- Load fixture ---
const fixture = JSON.parse(readFileSync(join(__dirname, 'metafields-fixture.json'), 'utf8'));
const metaLookup = {};
for (const entry of fixture) {
  metaLookup[entry.handle] = entry.metafields;
}

// --- Load products CSV ---
const prodRaw = readFileSync(join(__dirname, 'common-roast-products.csv'), 'utf8');
const prodRows = parseCSV(prodRaw);
const prodHeader = prodRows[0];
const handleColIdx = prodHeader.indexOf('URL handle');
const titleColIdx  = prodHeader.indexOf('Title');

// New header = product header + metafield columns
const metaCols   = FIELD_ORDER.map(colHeader);
const newHeader  = [...prodHeader, ...metaCols];
const outputRows = [newHeader];

for (let i = 1; i < prodRows.length; i++) {
  const row    = [...prodRows[i]];
  const handle = row[handleColIdx] ?? '';
  const title  = row[titleColIdx]  ?? '';
  const isProductRow = title.trim() !== '';

  if (isProductRow && metaLookup[handle]) {
    const meta = metaLookup[handle];
    for (const key of FIELD_ORDER) {
      row.push(fieldValue(key, meta[key]));
    }
  } else {
    for (let c = 0; c < FIELD_ORDER.length; c++) row.push('');
  }

  outputRows.push(row);
}

const output  = outputRows.map(rowToCSV).join('\n') + '\n';
const outPath = join(__dirname, 'common-roast-products-with-metafields-full.csv');
writeFileSync(outPath, output, 'utf8');

console.log(`Written: ${outPath}`);
console.log(`Product rows (inc. variants): ${outputRows.length - 1}`);
console.log(`Metafield columns added: ${FIELD_ORDER.length}`);
FIELD_ORDER.forEach(k => console.log(`  ${colHeader(k)}`));
