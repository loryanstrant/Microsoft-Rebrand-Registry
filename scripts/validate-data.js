import { readFile } from 'node:fs/promises';

const path = new URL('../src/data/products.json', import.meta.url);
const data = JSON.parse(await readFile(path, 'utf8'));
const errors = [];
const ids = new Set();
const sourceIds = new Set(data.sources.map(source => source.id));
const datePattern = /^\d{4}-\d{2}(-\d{2})?$/;
const kinds = new Set(['product', 'resource']);
// Annotations are interpolated into the page unescaped, so keep them plain prose.
const prose = value => typeof value === 'string' && value.trim().length > 0 && !/[<&]/.test(value);

for (const source of data.sources) {
  if (ids.has(source.id)) errors.push(`Duplicate ID: ${source.id}`);
  ids.add(source.id);
  if (!source.title || !source.publisher || !source.url) errors.push(`Incomplete source: ${source.id}`);
  try { new URL(source.url); } catch { errors.push(`Invalid source URL: ${source.id}`); }
}
for (const product of data.products) {
  if (ids.has(product.id)) errors.push(`Duplicate ID: ${product.id}`);
  ids.add(product.id);
  if (!product.logo?.src || !product.logo?.alt || !product.logo?.source) errors.push(`Incomplete logo: ${product.id}`);
  if (product.logo?.src && !product.logo.src.startsWith('src/assets/logos/')) errors.push(`Invalid logo path: ${product.id}`);
  if ('kind' in product && !kinds.has(product.kind)) errors.push(`Invalid kind: ${product.id}`);
  if ('disambiguator' in product && !prose(product.disambiguator)) errors.push(`Invalid disambiguator: ${product.id}`);
  if ('note' in product && !prose(product.note)) errors.push(`Invalid note: ${product.id}`);
  if (product.disambiguator && product.name.includes(product.disambiguator)) errors.push(`Disambiguator must not be part of the name: ${product.id}`);
  const current = product.periods.filter(period => period.end === null);
  if (current.length !== 1) errors.push(`${product.id} must have exactly one current period`);
  let previousEnd = null;
  for (const period of product.periods) {
    if (ids.has(period.id)) errors.push(`Duplicate ID: ${period.id}`);
    ids.add(period.id);
    if (!datePattern.test(period.start) || (period.end && !datePattern.test(period.end))) errors.push(`Invalid date: ${period.id}`);
    if (period.end && period.start > period.end) errors.push(`Reversed period: ${period.id}`);
    if (previousEnd && period.start < previousEnd) errors.push(`Overlapping periods: ${period.id}`);
    if (!period.sources.length || period.sources.some(id => !sourceIds.has(id))) errors.push(`Missing source: ${period.id}`);
    if ((period.start.length === 7 ? 'month' : 'day') !== period.startPrecision) errors.push(`Start precision mismatch: ${period.id}`);
    if (period.end && (period.end.length === 7 ? 'month' : 'day') !== period.endPrecision) errors.push(`End precision mismatch: ${period.id}`);
    previousEnd = period.end;
  }
  if (current[0].name !== product.name && !product.name.includes(current[0].name)) errors.push(`Current name mismatch: ${product.id}`);
}
if (!datePattern.test(data.asOf)) errors.push('Invalid asOf date');
if (errors.length) { console.error(errors.map(error => `○ ${error}`).join('\n')); process.exit(1); }
const resources = data.products.filter(product => product.kind === 'resource').length;
console.log(`● Validated ${data.products.length - resources} products, ${resources} resources, ${data.products.reduce((n,p)=>n+p.periods.length,0)} name periods, and ${data.sources.length} sources.`);
