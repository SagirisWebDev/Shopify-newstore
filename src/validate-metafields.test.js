import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const schema = JSON.parse(readFileSync(join(root, 'docs/schemas/coffee.metafields.schema.json'), 'utf8'));
const fixture = JSON.parse(readFileSync(join(root, 'data/metafields-fixture.json'), 'utf8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function formatErrors(handle, errors) {
  const lines = errors.map(e => {
    const field = e.instancePath ? e.instancePath.replace(/^\//, '') : e.params?.missingProperty ?? '(root)';
    return `  ${handle}.${field}: ${e.message}`;
  });
  return lines.join('\n');
}

describe('coffee metafield schema — fixture products', () => {
  for (const product of fixture) {
    it(`${product.handle} passes all required metafields`, () => {
      const valid = validate(product.metafields);
      if (!valid) {
        expect.fail(`Metafield validation failed:\n${formatErrors(product.handle, validate.errors)}`);
      }
    });
  }
});

describe('coffee metafield schema — error reporting', () => {
  it('reports the product handle and missing field name', () => {
    const handle = 'colombia-huila-washed';
    const incomplete = { origin_country: 'Colombia' };
    const valid = validate(incomplete);
    expect(valid).toBe(false);
    const report = formatErrors(handle, validate.errors);
    expect(report).toContain(handle);
    expect(report).toContain('origin_region');
    expect(report).toContain('roast_date');
  });

  it('rejects an invalid process value', () => {
    const base = { ...fixture[0].metafields, process: 'carbonic-maceration' };
    expect(validate(base)).toBe(false);
    const err = validate.errors.find(e => e.instancePath === '/process');
    expect(err).toBeTruthy();
  });

  it('accepts a future roast_date (schema enforces format only, not past-date constraint)', () => {
    const base = { ...fixture[0].metafields, roast_date: '2099-01-01' };
    expect(validate(base)).toBe(true);
  });
});
