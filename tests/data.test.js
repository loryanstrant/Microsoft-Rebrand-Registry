import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { alphabeticalProducts, currentThenChronological, monthDiff, parseDate, durationLabel, dateLabel, productLetter } from '../src/dates.js';

const data = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
test('scope disclaimer excludes former products and transformations', () => {
  assert.match(page, /Every entry is a product that still exists today/);
  assert.match(page, /Discontinued products are not listed/);
  assert.match(page, /Product or platform transformations/);
});
test('footer links contributors to the public GitHub repository', () => {
  assert.match(page, /href="https:\/\/github\.com\/loryanstrant\/Microsoft-Rebrand-Registry"[^>]*>Contribute on GitHub<\/a>/);
});
test('primary navigation reaches analysis and identifies the registry page', () => {
  assert.match(page, /href="index\.html" aria-current="page">Registry<\/a>/);
  assert.match(page, /href="analysis\.html">Analysis<\/a>/);
});
test('homepage rotates crossed-out former and alternate site names', () => {
  assert.match(page, /<header class="site-header">[\s\S]*<span>Formerly:<\/span> <s id="former-site-name" aria-hidden="true">Microsoft Product Lifecycle Tracker<\/s>[\s\S]*<\/header>/);
  assert.doesNotMatch(page, /<main id="history">\s*<p class="former-site-name">/);
  const formerNames = app.match(/const FORMER_SITE_NAMES = \[([\s\S]*?)\];/)?.[1]
    .split('\n')
    .map(line => line.match(/'([^']+)'/)?.[1])
    .filter(Boolean);
  assert.equal(formerNames?.length, 24);
  for (const name of ['Rename Pending', 'Brandwidth', 'The Product Formerly Known As', 'Identity Crisis as a Service', 'Cloudy with a Chance of Rebrands', 'Microsoft 365 Name Roulette', 'Rename, Rebrand, Repeat']) {
    assert.ok(formerNames.includes(name), name);
  }
  assert.match(app, /prefers-reduced-motion: reduce/);
  assert.match(app, /}, 3000\);/);
  assert.match(styles, /\.site-header\{position:sticky;top:0;z-index:10/);
  assert.match(styles, /\.former-site-name s\.is-changing\{opacity:0/);
});
test('About the dates note can use the available content width', () => {
  const rule = styles.match(/\.method-note\{([^}]*)\}/)?.[1];
  assert.ok(rule, 'method note styles should exist');
  assert.doesNotMatch(rule, /(?:^|;)max-width:/);
});
test('every product has exactly one ongoing period', () => { for (const product of data.products) assert.equal(product.periods.filter(p => !p.end).length, 1, product.id); });
test('every period cites an existing source', () => { const sources=new Set(data.sources.map(s=>s.id)); for(const product of data.products) for(const period of product.periods) assert.ok(period.sources.every(id=>sources.has(id)),period.id); });
test('every product has a valid accessible local logo', async () => {
  for (const product of data.products) {
    assert.ok(product.logo.alt.includes(product.name), product.id);
    const logo = await readFile(new URL(`../${product.logo.src}`, import.meta.url));
    if (product.logo.src.endsWith('.svg')) assert.match(logo.toString('utf8', 0, 1024), /<svg\b/i, product.id);
    else if (product.logo.src.endsWith('.png')) assert.deepEqual([...logo.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], product.id);
    else assert.fail(`${product.id} uses an unsupported logo format`);
  }
});
test('Defender variants that share a mark use the same logo asset', () => {
  const productIds = [
    'microsoft-defender-xdr',
    'defender-cloud',
    'defender-cloud-apps',
    'defender-endpoint',
    'defender-identity',
    'defender-office-365',
    'defender-vulnerability-management',
    'defender-antivirus'
  ];
  for (const id of productIds) {
    const product = data.products.find(product => product.id === id);
    assert.equal(product?.logo.src, 'src/assets/logos/defender.png', id);
  }
});
test('Copilot products use their distinct canonical marks', () => {
  const copilot = data.products.find(({ id }) => id === 'microsoft-copilot');
  const copilotApp = data.products.find(({ id }) => id === 'm365-copilot-app');
  assert.equal(copilot?.logo.src, 'src/assets/logos/microsoft-copilot.png');
  assert.equal(copilotApp?.logo.src, 'src/assets/logos/microsoft-365-copilot-app.svg');
});
test('Outlook logo artwork fills its image canvas', async () => {
  const logo = await readFile(new URL('../src/assets/logos/outlook-com.png', import.meta.url));
  assert.equal(logo.readUInt32BE(16), 64, 'width');
  assert.equal(logo.readUInt32BE(20), 60, 'height');
});
test('month duration handles year boundaries', () => assert.equal(monthDiff(parseDate('2019-11-04'),parseDate('2020-11-04')),12));
test('duration labels years and remaining months', () => assert.equal(durationLabel(26),'2 yrs 2 mo'));
test('month precision is visibly qualified', () => assert.equal(dateLabel('2007-08','month','by'),'By Aug 2007'));
test('name periods put current first and former names in reverse chronology', () => {
  const periods = [
    { id: 'newest-former', start: '2015-11-18', end: '2018-09-10' },
    { id: 'current', start: '2018-09-10', end: null },
    { id: 'oldest', start: '2013-11-13', end: '2015-11-18' }
  ];
  assert.deepEqual(currentThenChronological(periods).map(period => period.id), ['current', 'newest-former', 'oldest']);
  assert.equal(periods[0].id, 'newest-former', 'sorting must not mutate canonical data');
});
test('products are listed alphabetically without mutating canonical data', () => {
  const groups = [
    { product: { name: 'Microsoft Entra ID' } },
    { product: { name: 'Azure DevOps' } },
    { product: { name: 'Microsoft 365' } }
  ];
  assert.deepEqual(alphabeticalProducts(groups).map(group => group.product.name), ['Azure DevOps', 'Microsoft Entra ID', 'Microsoft 365']);
  assert.equal(groups[0].product.name, 'Microsoft Entra ID');
});
test('product letters support alphabetical navigation', () => {
  assert.equal(productLetter(' Azure DevOps'), 'A');
  assert.equal(productLetter('Microsoft 365'), 'M');
  assert.equal(productLetter('Microsoft Entra ID'), 'E');
  assert.equal(productLetter('365 Copilot'), '#');
});
test('expanded registry contains 72 cloud products in alphabetical sections', () => {
  assert.equal(data.products.length, 72);
  assert.equal(data.products.some(({ id }) => id === 'microsoft-lens'), false);
  const groups = alphabeticalProducts(data.products.map(product => ({ product })));
  const letters = [...new Set(groups.map(group => productLetter(group.product.name)))];
  assert.deepEqual(letters, [...letters].sort());
  assert.ok(letters.length >= 4);
});
test('larger expansion preserves multi-step Configuration Manager history', () => {
  const product = data.products.find(({ id }) => id === 'configuration-manager');
  assert.deepEqual(product.periods.map(({ name }) => name), [
    'System Center Configuration Manager',
    'Microsoft Endpoint Configuration Manager',
    'Microsoft Configuration Manager'
  ]);
});
test('Defender for Office 365 preserves both ATP names', () => {
  const product = data.products.find(({ id }) => id === 'defender-office-365');
  assert.deepEqual(product.periods.map(({ name }) => name), [
    'Exchange Online Advanced Threat Protection',
    'Office 365 Advanced Threat Protection',
    'Microsoft Defender for Office 365'
  ]);
});
test('Entra family products preserve their Azure AD names', () => {
  const expected = new Map([
    ['entra-domain-services', ['Azure AD Domain Services', 'Microsoft Entra Domain Services']],
    ['entra-external-id', ['Azure AD External Identities', 'Microsoft Entra External ID']],
    ['entra-id-governance', ['Azure AD Identity Governance', 'Microsoft Entra ID Governance']],
    ['entra-id-protection', ['Azure AD Identity Protection', 'Microsoft Entra ID Protection']]
  ]);
  for (const [id, names] of expected) {
    const product = data.products.find(candidate => candidate.id === id);
    assert.deepEqual(product.periods.map(period => period.name), names, id);
  }
});
test('Purview eDiscovery preserves the retired Standard name', () => {
  const product = data.products.find(({ id }) => id === 'purview-ediscovery');
  assert.equal(product.name, 'Microsoft Purview eDiscovery');
  assert.deepEqual(product.periods.map(({ name }) => name), [
    'Office 365 Core eDiscovery',
    'Microsoft Purview eDiscovery (Standard)',
    'Microsoft Purview eDiscovery'
  ]);
  assert.equal(product.periods[1].end, '2025-08-31');
  assert.ok(product.periods[2].sources.includes('purview-ediscovery-current-doc'));
});
test('Entra multifactor authentication preserves both Azure names', () => {
  const product = data.products.find(({ id }) => id === 'entra-multifactor-authentication');
  assert.deepEqual(product.periods.map(({ name }) => name), [
    'Windows Azure Multi-Factor Authentication',
    'Azure Multi-Factor Authentication',
    'Microsoft Entra multifactor authentication'
  ]);
});
test('Foundry products use their current names and preserve Azure histories', () => {
  const foundry = data.products.find(({ id }) => id === 'azure-ai-foundry');
  assert.equal(foundry.name, 'Microsoft Foundry');
  assert.deepEqual(foundry.periods.map(({ name }) => name), [
    'Azure AI Studio',
    'Azure AI Foundry',
    'Microsoft Foundry'
  ]);
  const tools = data.products.find(({ id }) => id === 'azure-ai-services');
  assert.equal(tools.name, 'Foundry Tools');
  assert.deepEqual(tools.periods.map(({ name }) => name), [
    'Azure Cognitive Services',
    'Azure AI services',
    'Foundry Tools'
  ]);
});
