import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyseRegistry, median } from '../src/analysis.js';

const data = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const page = await readFile(new URL('../analysis.html', import.meta.url), 'utf8');

function fixture(asOf = '2026-01-01') {
  return {
    asOf,
    products: [
      { id: 'alpha', name: 'Alpha', family: 'Cloud', periods: [
        { start: '2020-01-01', end: '2022-01-01' },
        { start: '2022-01-01', end: null }
      ] },
      { id: 'beta', name: 'Beta', family: 'Cloud', periods: [
        { start: '2018-01-01', end: '2020-01-01' },
        { start: '2020-01-01', end: '2023-01-01' },
        { start: '2023-01-01', end: null }
      ] },
      { id: 'gamma', name: 'Gamma', family: 'Sparse', periods: [{ start: '2025-01-01', end: null }] }
    ]
  };
}

test('median supports odd, even, and empty collections without mutation', () => {
  const values = [7, 1, 5, 3];
  assert.equal(median(values), 4);
  assert.equal(median([9, 1, 5]), 5);
  assert.equal(median([]), null);
  assert.deepEqual(values, [7, 1, 5, 3]);
});

test('analysis aggregates renames, durations, years, and families', () => {
  const result = analyseRegistry(fixture());
  assert.equal(result.renames, 3);
  assert.equal(result.medianMonths, 24);
  assert.deepEqual(result.latestRename, { date: '2023-01-01', daysAgo: 1096, products: ['Beta'] });
  assert.deepEqual(result.annualRenames, [{ year: 2020, count: 1 }, { year: 2022, count: 1 }, { year: 2023, count: 1 }]);
  assert.equal(result.families.find(item => item.family === 'Cloud').evidence, 'sufficient');
  assert.equal(result.families.find(item => item.family === 'Sparse').evidence, 'sparse');
});

test('current identity age and rename tracker are anchored to data asOf, not today', () => {
  const firstResult = analyseRegistry(fixture('2025-01-01'));
  const secondResult = analyseRegistry(fixture('2026-01-01'));
  assert.equal(firstResult.forecast.find(item => item.id === 'gamma').ageMonths, 1);
  assert.equal(secondResult.forecast.find(item => item.id === 'gamma').ageMonths, 12);
  assert.equal(firstResult.latestRename.daysAgo, 731);
  assert.equal(secondResult.latestRename.daysAgo, 1096);
});

test('rename tracker groups products sharing the latest recorded date', () => {
  const input = fixture();
  input.products[0].periods[0].end = '2023-01-01';
  assert.deepEqual(analyseRegistry(input).latestRename.products, ['Alpha', 'Beta']);
});

test('forecast is deterministic with stable alphabetical tie-breaking', () => {
  const first = analyseRegistry(fixture()).forecast;
  const second = analyseRegistry(fixture()).forecast;
  assert.deepEqual(first, second);
  assert.equal(first[0].id, 'beta');
  assert.ok(first.every(item => ['Elevated', 'Watchlist', 'Not imminent'].includes(item.label)));
});

test('analysis page separates entertainment from evidence and provides states', () => {
  assert.match(page, /playful extrapolation/);
  assert.match(page, /not reporting, a leak/);
  assert.match(page, /survivorship bias/);
  assert.match(page, /Days since last rename/);
  assert.match(page, /id="rename-days"/);
  assert.match(page, /◐ Analysing the paperwork/);
  assert.match(page, /○ We couldn’t analyse the registry/);
  assert.match(page, /● Elevated, ◐ Watchlist and ○ Not imminent/);
});

test('analysis navigation and contribution route to public pages', () => {
  assert.match(page, /href="index\.html">Registry<\/a>/);
  assert.match(page, /href="analysis\.html" aria-current="page">Analysis<\/a>/);
  assert.match(page, /https:\/\/github\.com\/loryanstrant\/Microsoft-Rebrand-Registry/);
});

test('canonical dataset produces useful non-empty analysis', () => {
  const result = analyseRegistry(data);
  // Resources are analysed alongside products: a roadmap rename moves the clock too.
  assert.equal(result.products, 82);
  assert.equal(result.renames, 108);
  assert.ok(result.families.length > 5);
  assert.equal(result.forecast.length, 82);
  assert.ok(result.busiest.count > 1);
});

test('boomerangs find products that took an abandoned name back', () => {
  const result = analyseRegistry(data);
  const copilot = result.boomerangs.find(item => item.id === 'microsoft-copilot-service');
  assert.ok(copilot, 'the Copilot service wore Microsoft 365 Copilot twice');
  assert.equal(copilot.returnedName, 'Microsoft 365 Copilot');
  assert.equal(copilot.times, 2);
  assert.equal(copilot.awayMonths, 10);
  assert.deepEqual(copilot.journey, [
    'Microsoft 365 Copilot',
    'Copilot for Microsoft 365',
    'Microsoft 365 Copilot',
    'Microsoft Copilot'
  ]);
});

test('boomerangs stay empty when no product reuses a name', () => {
  assert.deepEqual(analyseRegistry(fixture()).boomerangs, []);
});

test('the Boomerang Club section is present with an empty state', () => {
  assert.match(page, /id="boomerang-heading">The Boomerang Club<\/h2>/);
  assert.match(page, /id="boomerang-intro"/);
  assert.match(page, /id="boomerang-list"/);
  assert.match(page, /id="boomerang-empty"[^>]*>○ No product has yet reused one of its own names\./);
});
