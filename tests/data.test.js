import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { currentThenChronological, monthDiff, parseDate, durationLabel, dateLabel } from '../src/dates.js';

const data = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
test('every product has exactly one ongoing period', () => { for (const product of data.products) assert.equal(product.periods.filter(p => !p.end).length, 1, product.id); });
test('every period cites an existing source', () => { const sources=new Set(data.sources.map(s=>s.id)); for(const product of data.products) for(const period of product.periods) assert.ok(period.sources.every(id=>sources.has(id)),period.id); });
test('every product has an accessible local logo', async () => { for (const product of data.products) { assert.ok(product.logo.alt.includes(product.name), product.id); await assert.doesNotReject(() => readFile(new URL(`../${product.logo.src}`, import.meta.url)), product.id); } });
test('month duration handles year boundaries', () => assert.equal(monthDiff(parseDate('2019-11-04'),parseDate('2020-11-04')),12));
test('duration labels years and remaining months', () => assert.equal(durationLabel(26),'2 yrs 2 mo'));
test('month precision is visibly qualified', () => assert.equal(dateLabel('2007-08','month','by'),'By Aug 2007'));
test('name periods put current first and former names in chronological order', () => {
  const periods = [
    { id: 'newest-former', start: '2015-11-18', end: '2018-09-10' },
    { id: 'current', start: '2018-09-10', end: null },
    { id: 'oldest', start: '2013-11-13', end: '2015-11-18' }
  ];
  assert.deepEqual(currentThenChronological(periods).map(period => period.id), ['current', 'oldest', 'newest-former']);
  assert.equal(periods[0].id, 'newest-former', 'sorting must not mutate canonical data');
});
