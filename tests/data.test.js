import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { alphabeticalProducts, currentThenChronological, monthDiff, parseDate, durationLabel, dateLabel, productLetter } from '../src/dates.js';

const data = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url), 'utf8'));
const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const analysisPage = await readFile(new URL('../analysis.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
const analysisApp = await readFile(new URL('../src/analysis.js', import.meta.url), 'utf8');
const formerSiteNames = await readFile(new URL('../src/former-site-names.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
test('scope disclaimer excludes former products and explains convergence', () => {
  assert.match(page, /Every entry is something Microsoft still operates today/);
  assert.match(page, /Discontinued products are not listed/);
  assert.match(page, /each documented rename is still recorded separately/);
  assert.match(page, /tracks names, not broader lineage/);
});
test('scope disclaimer owns the clarifying labels it adds', () => {
  assert.match(page, /That label is ours, not Microsoft’s, and is never part of the official name/);
});
test('footer links contributors to the public GitHub repository', () => {
  assert.match(page, /href="https:\/\/github\.com\/loryanstrant\/Microsoft-Rebrand-Registry"[^>]*>Contribute on GitHub<\/a>/);
});
test('primary navigation reaches analysis and identifies the registry page', () => {
  assert.match(page, /href="index\.html" aria-current="page">Registry<\/a>/);
  assert.match(page, /href="analysis\.html">Analysis<\/a>/);
});
test('both pages rotate crossed-out former and alternate site names', () => {
  const formerNameMarkup = /<header class="site-header">[\s\S]*<span>Formerly:<\/span> <s id="former-site-name" aria-hidden="true">Microsoft Product Lifecycle Tracker<\/s>[\s\S]*<\/header>/;
  assert.match(page, formerNameMarkup);
  assert.match(analysisPage, formerNameMarkup);
  assert.doesNotMatch(page, /<main id="history">\s*<p class="former-site-name">/);
  assert.match(app, /import \{ rotateFormerSiteNames \} from '\.\/former-site-names\.js'/);
  assert.match(analysisApp, /import \{ rotateFormerSiteNames \} from '\.\/former-site-names\.js'/);
  assert.match(app, /rotateFormerSiteNames\(\);/);
  assert.match(analysisApp, /rotateFormerSiteNames\(\);/);
  const formerNames = formerSiteNames.match(/const FORMER_SITE_NAMES = \[([\s\S]*?)\];/)?.[1]
    .split('\n')
    .map(line => line.match(/'([^']+)'/)?.[1])
    .filter(Boolean);
  assert.equal(formerNames?.length, 24);
  for (const name of ['Rename Pending', 'Brandwidth', 'The Product Formerly Known As', 'Identity Crisis as a Service', 'Cloudy with a Chance of Rebrands', 'Microsoft 365 Name Roulette', 'Rename, Rebrand, Repeat']) {
    assert.ok(formerNames.includes(name), name);
  }
  assert.match(formerSiteNames, /prefers-reduced-motion: reduce/);
  assert.match(formerSiteNames, /}, 2000\);/);
  assert.match(styles, /\.site-header\{position:sticky;top:0;z-index:10/);
  assert.match(styles, /\.skip-link\{[^}]*z-index:11/);
  assert.match(styles, /main\{[^}]*scroll-margin-top:7rem/);
  assert.match(styles, /\.former-site-name\{[^}]*width:30rem/);
  assert.match(styles, /\.former-site-name span:first-child\{[^}]*flex:0 0 auto/);
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
test('Copilot entries share the unified 2026 Copilot mark', () => {
  // Microsoft consolidated the Copilot family onto one icon in August 2026. The
  // registry shows current marks only, so these entries legitimately match.
  const productIds = [
    'microsoft-copilot',
    'microsoft-copilot-service',
    'microsoft-copilot-chat',
    'm365-copilot-app'
  ];
  for (const id of productIds) {
    const product = data.products.find(product => product.id === id);
    assert.equal(product?.logo.src, 'src/assets/logos/copilot.png', id);
    assert.ok(product.logo.alt.includes(product.name), id);
  }
  // Copilot Studio kept its own identity through the consolidation.
  assert.equal(data.products.find(({ id }) => id === 'copilot-studio')?.logo.src, 'src/assets/logos/copilot-studio.svg');
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
test('expanded registry contains 74 cloud products and 1 resource in alphabetical sections', () => {
  const resources = data.products.filter(({ kind }) => kind === 'resource');
  assert.equal(resources.length, 1);
  assert.equal(data.products.length - resources.length, 74);
  assert.equal(data.products.length, 75);
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

test('optional kind, disambiguator and note are absent from ordinary products', () => {
  const entra = data.products.find(({ id }) => id === 'entra-id');
  assert.equal('kind' in entra, false);
  assert.equal('disambiguator' in entra, false);
  assert.equal('note' in entra, false);
});
test('only the roadmap is tagged as a resource rather than a product', () => {
  const resources = data.products.filter(({ kind }) => kind === 'resource');
  assert.deepEqual(resources.map(({ id }) => id), ['ai-at-work-roadmap']);
  for (const product of data.products) {
    if ('kind' in product) assert.ok(['product', 'resource'].includes(product.kind), product.id);
  }
});
test('the disambiguator is never part of any product or period name', () => {
  for (const product of data.products.filter(({ disambiguator }) => disambiguator)) {
    assert.equal(product.name.includes(product.disambiguator), false, product.id);
    for (const period of product.periods) {
      assert.equal(period.name.includes(product.disambiguator), false, period.id);
    }
  }
});
test('annotations stay plain prose so they render safely', () => {
  for (const product of data.products) {
    for (const value of [product.note, product.disambiguator].filter(Boolean)) {
      assert.equal(typeof value, 'string', product.id);
      assert.ok(value.trim().length > 0, product.id);
      assert.doesNotMatch(value, /[<&]/, product.id);
    }
  }
});
test('both Microsoft Copilot entries are told apart without renaming them', () => {
  const named = data.products.filter(({ name }) => name === 'Microsoft Copilot');
  assert.equal(named.length, 2);
  assert.deepEqual(named.map(({ disambiguator }) => disambiguator).sort(),
    ['for individuals', 'for organizations']);
});
test('the converged Copilot entries admit the confusion in the registry voice', () => {
  for (const id of ['microsoft-copilot', 'm365-copilot-app']) {
    const product = data.products.find(candidate => candidate.id === id);
    assert.match(product.note, /naming whiplash/, id);
  }
  assert.match(data.products.find(({ id }) => id === 'microsoft-copilot-service').note,
    /Renamed, un-renamed, then renamed again/);
  assert.match(data.products.find(({ id }) => id === 'microsoft-copilot-chat').note,
    /fourteen months/);
});
test('the Copilot service records its round trip through Copilot for Microsoft 365', () => {
  const service = data.products.find(({ id }) => id === 'microsoft-copilot-service');
  assert.deepEqual(service.periods.map(({ name }) => name), [
    'Microsoft 365 Copilot',
    'Copilot for Microsoft 365',
    'Microsoft 365 Copilot',
    'Microsoft Copilot'
  ]);
});
test('Copilot Chat preserves the Bing Chat Enterprise lineage', () => {
  const chat = data.products.find(({ id }) => id === 'microsoft-copilot-chat');
  assert.deepEqual(chat.periods.map(({ name }) => name), [
    'Bing Chat Enterprise',
    'Microsoft Copilot',
    'Microsoft 365 Copilot Chat',
    'Microsoft Copilot Chat'
  ]);
});
test('the Copilot app rename is dated to when it took effect', () => {
  const app = data.products.find(({ id }) => id === 'm365-copilot-app');
  assert.equal(app.name, 'Microsoft Copilot app');
  const current = app.periods.find(({ end }) => end === null);
  assert.equal(current.name, 'Microsoft Copilot app');
  assert.equal(current.start, '2026-08-18');
  assert.equal(current.startQualifier, 'effective');
});
test('the roadmap keeps all three of its names', () => {
  const roadmap = data.products.find(({ id }) => id === 'ai-at-work-roadmap');
  assert.deepEqual(roadmap.periods.map(({ name }) => name), [
    'Office 365 Roadmap',
    'Microsoft 365 Roadmap',
    'AI at Work Roadmap'
  ]);
  assert.equal(roadmap.periods.at(-1).start, '2026-08-25');
});
test('the Show control offers both name status and entry type', () => {
  assert.match(page, /<label><span>Show<\/span><select id="show">/);
  for (const value of ['all', 'current', 'former', 'products', 'resources']) {
    assert.match(page, new RegExp(`<option value="${value}">`));
  }
  assert.doesNotMatch(page, /id="status"/);
});
test('the header counts products and resources separately', () => {
  assert.match(page, /<dt id="product-count">—<\/dt><dd>products<\/dd>/);
  assert.match(page, /<dt id="resource-count">—<\/dt><dd>resources<\/dd>/);
  assert.match(page, /<dt id="name-count">—<\/dt><dd>documented names<\/dd>/);
});
test('the registry renders resource tags, disambiguators and notes', () => {
  assert.match(app, /badge resource">◇ Resource, not a product/);
  assert.match(app, /class="disambiguator"/);
  assert.match(app, /our label, not Microsoft’s/);
  assert.match(app, /class="entry-note"/);
  assert.match(styles, /\.badge\.resource\{/);
  assert.match(styles, /\.disambiguator\{/);
  assert.match(styles, /\.entry-note\{/);
});
