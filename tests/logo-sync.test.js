import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { syncLogos, findMappingConflicts } from '../scripts/sync-authoritative-logos.js';
import { checkAsset, readSvg, rulesFor, validateLogos, loadConfig } from '../scripts/validate-logos.js';
import { buildPreview } from '../scripts/render-logo-preview.js';

const realConfig = await loadConfig();

function svg(viewBox = '0 0 48 48', body = '<rect width="48" height="48" fill="#0078d4"/>') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
}

// Minimal non-interlaced 8-bit RGBA PNG, so the tests exercise the real decoder
// instead of a stubbed one.
function png(width, height, paint = () => [0, 120, 212, 255]) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y);
      raw.set([r, g, b, a], rowStart + 1 + x * 4);
    }
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function workspace(files) {
  const root = await mkdtemp(path.join(tmpdir(), 'logo-sync-'));
  for (const [relative, contents] of Object.entries(files)) {
    const full = path.join(root, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, contents);
  }
  return root;
}

function fixtureConfig(managed, extra = {}) {
  return {
    schemaVersion: 1,
    sourceRepository: { name: 'loryanstrant/MicrosoftCloudLogos', branch: 'main', assetRoot: 'logos' },
    display: { registryPx: 52, timelinePx: 32, densityFactor: 2 },
    validation: { minVisibleShare: 0.5, maxAspectRatio: 4 },
    resolution: { allowSlugFallback: true },
    managed,
    unmanaged: [],
    ...extra
  };
}

const mapping = {
  local: 'src/assets/logos/azure-devops.svg',
  upstream: 'logos/azure-devops/azure-devops-scalable.svg',
  format: 'svg',
  upstreamSlug: 'azure-devops',
  products: ['azure-devops']
};

test('an unchanged upstream file produces no work', async t => {
  const source = await workspace({ 'logos/azure-devops/azure-devops-scalable.svg': svg() });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg() });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const report = await syncLogos({ config: fixtureConfig([mapping]), sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.counts.changed, 0);
  assert.equal(report.counts.failed, 0);
  assert.equal(report.entries[0].status, 'unchanged');
});

test('a changed upstream file is copied byte for byte and the run is idempotent', async t => {
  const updated = svg('0 0 48 48', '<circle cx="24" cy="24" r="20" fill="#0078d4"/>');
  const source = await workspace({ 'logos/azure-devops/azure-devops-scalable.svg': updated });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg() });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));
  const config = fixtureConfig([mapping]);

  const first = await syncLogos({ config, sourceDir: source, targetDir: target, apply: true });
  assert.deepEqual(first.changed, ['src/assets/logos/azure-devops.svg']);
  assert.equal(await readFile(path.join(target, 'src/assets/logos/azure-devops.svg'), 'utf8'), updated);

  const second = await syncLogos({ config, sourceDir: source, targetDir: target, apply: true });
  assert.equal(second.counts.changed, 0, 'a second run must not reopen the same change');
});

test('a dry run reports the difference without touching the approved asset', async t => {
  const source = await workspace({ 'logos/azure-devops/azure-devops-scalable.svg': svg('0 0 64 64') });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg() });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const report = await syncLogos({ config: fixtureConfig([mapping]), sourceDir: source, targetDir: target });
  assert.equal(report.counts.changed, 1);
  assert.equal(await readFile(path.join(target, 'src/assets/logos/azure-devops.svg'), 'utf8'), svg());
});

test('a missing upstream path fails without deleting or altering the local asset', async t => {
  const source = await workspace({ 'logos/azure-devops/metadata.md': '# Azure DevOps\n' });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg() });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const report = await syncLogos({ config: fixtureConfig([mapping]), sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0].status, 'missing');
  assert.equal(await readFile(path.join(target, 'src/assets/logos/azure-devops.svg'), 'utf8'), svg());
});

test('a single renamed upstream file is adopted and flagged for review', async t => {
  const renamed = svg('0 0 48 48', '<rect width="48" height="48" fill="#111"/>');
  const source = await workspace({ 'logos/azure-devops/azure-devops-colour.svg': renamed, 'logos/azure-devops/metadata.md': '# Azure DevOps\n' });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg() });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const report = await syncLogos({ config: fixtureConfig([mapping]), sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.counts.failed, 0);
  assert.equal(report.entries[0].resolved, 'logos/azure-devops/azure-devops-colour.svg');
  assert.equal(report.entries[0].relocated, true);
  assert.equal(await readFile(path.join(target, 'src/assets/logos/azure-devops.svg'), 'utf8'), renamed);
});

test('several candidates after a rename are ambiguous and change nothing', async t => {
  const source = await workspace({
    'logos/azure-devops/azure-devops-colour.svg': svg(),
    'logos/azure-devops/azure-devops-mono.svg': svg()
  });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg('0 0 16 16') });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const report = await syncLogos({ config: fixtureConfig([mapping]), sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.failures[0].status, 'ambiguous');
  assert.equal(await readFile(path.join(target, 'src/assets/logos/azure-devops.svg'), 'utf8'), svg('0 0 16 16'));
});

test('the slug fallback can be switched off', async t => {
  const source = await workspace({ 'logos/azure-devops/azure-devops-colour.svg': svg() });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg('0 0 16 16') });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const config = fixtureConfig([mapping], { resolution: { allowSlugFallback: false } });
  const report = await syncLogos({ config, sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.failures[0].status, 'missing');
});

test('a changed upstream format fails rather than swapping file types', async t => {
  const source = await workspace({ 'logos/azure-devops/azure-devops-scalable.svg': svg() });
  const target = await workspace({ 'src/assets/logos/azure-devops.png': png(256, 256) });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const config = fixtureConfig([{ ...mapping, local: 'src/assets/logos/azure-devops.png' }]);
  const report = await syncLogos({ config, sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.failures[0].status, 'format-changed');
});

test('malformed upstream artwork is refused', async t => {
  const source = await workspace({ 'logos/azure-devops/azure-devops-scalable.svg': '<html><body>404</body></html>' });
  const target = await workspace({ 'src/assets/logos/azure-devops.svg': svg() });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const report = await syncLogos({ config: fixtureConfig([mapping]), sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.failures[0].status, 'invalid');
  assert.equal(await readFile(path.join(target, 'src/assets/logos/azure-devops.svg'), 'utf8'), svg());
});

test('an undersized raster upstream file is refused', async t => {
  const rasterMapping = {
    local: 'src/assets/logos/defender.png',
    upstream: 'logos/defender/defender-512.png',
    format: 'png',
    upstreamSlug: 'defender',
    products: ['defender']
  };
  const source = await workspace({ 'logos/defender/defender-512.png': png(64, 64) });
  const target = await workspace({ 'src/assets/logos/defender.png': png(256, 256) });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const report = await syncLogos({ config: fixtureConfig([rasterMapping]), sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.failures[0].status, 'invalid');
  assert.match(report.failures[0].reason, /below the 104px/);
});

test('excessive transparent padding is refused unless the mapping documents an exception', async t => {
  const padded = png(256, 256, (x, y) => (x > 112 && x < 144 && y > 112 && y < 144 ? [0, 120, 212, 255] : [0, 0, 0, 0]));
  const rasterMapping = {
    local: 'src/assets/logos/defender.png',
    upstream: 'logos/defender/defender-512.png',
    format: 'png',
    upstreamSlug: 'defender',
    products: ['defender']
  };
  const source = await workspace({ 'logos/defender/defender-512.png': padded });
  const target = await workspace({ 'src/assets/logos/defender.png': png(256, 256) });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const refused = await syncLogos({ config: fixtureConfig([rasterMapping]), sourceDir: source, targetDir: target, apply: true });
  assert.equal(refused.failures[0].status, 'invalid');
  assert.match(refused.failures[0].reason, /visible artwork/);

  const excepted = fixtureConfig([{ ...rasterMapping, exception: { minVisibleShare: 0.1, minSourcePx: 24 } }]);
  const accepted = await syncLogos({ config: excepted, sourceDir: source, targetDir: target, apply: true });
  assert.equal(accepted.counts.failed, 0);
  assert.equal(accepted.counts.changed, 1);
});

test('one upstream mark may feed several registry assets', async t => {
  const shared = svg('0 0 18 18');
  const source = await workspace({ 'logos/entra-id/microsoft-entra-id-color-icon.svg': shared });
  const target = await workspace({
    'src/assets/logos/entra-id.svg': svg(),
    'src/assets/logos/entra-workload-id.svg': svg()
  });
  t.after(() => Promise.all([rm(source, { recursive: true }), rm(target, { recursive: true })]));

  const config = fixtureConfig([
    { local: 'src/assets/logos/entra-id.svg', upstream: 'logos/entra-id/microsoft-entra-id-color-icon.svg', format: 'svg', upstreamSlug: 'entra-id', products: ['entra-id'] },
    { local: 'src/assets/logos/entra-workload-id.svg', upstream: 'logos/entra-id/microsoft-entra-id-color-icon.svg', format: 'svg', upstreamSlug: 'entra-id', products: ['entra-workload-id'] }
  ]);
  const report = await syncLogos({ config, sourceDir: source, targetDir: target, apply: true });
  assert.equal(report.counts.failed, 0);
  assert.equal(report.counts.changed, 2);
});

test('two mappings writing to the same local file are a conflict', () => {
  const config = fixtureConfig([mapping, { ...mapping, upstream: 'logos/azure-devops/other.svg' }]);
  assert.deepEqual(findMappingConflicts(config), ['src/assets/logos/azure-devops.svg']);
});

test('the sync never reads a generated upstream website manifest', async () => {
  const sources = await readFile(new URL('../scripts/sync-authoritative-logos.js', import.meta.url), 'utf8');
  assert.doesNotMatch(sources.replace(/^\/\/.*$/gm, ''), /logo-data\.js/);
  assert.equal(realConfig.sourceRepository.manifest, undefined, 'the source contract is logos/ paths, not a generated manifest');
  assert.equal(realConfig.sourceRepository.assetRoot, 'logos');
});

test('validation accepts intrinsic SVG dimensions when no viewBox is present', () => {
  const intrinsic = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256"/></svg>';
  assert.deepEqual(readSvg(intrinsic), { width: 256, height: 256, geometry: 'intrinsic' });
  const { problems, detail } = checkAsset('x.svg', Buffer.from(intrinsic), rulesFor(realConfig, null));
  assert.deepEqual(problems, []);
  assert.equal(detail.geometry, 'intrinsic');
});

test('validation rejects active content and external references in SVGs', () => {
  const rules = rulesFor(realConfig, null);
  for (const [name, markup] of [
    ['script', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script></svg>`],
    ['event handler', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="x()"></svg>`],
    ['external reference', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><image href="https://example.com/a.png"/></svg>`],
    ['foreignObject', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><foreignObject></foreignObject></svg>`]
  ]) {
    assert.throws(() => checkAsset('x.svg', Buffer.from(markup), rules), undefined, `${name} should be refused`);
  }
});

test('every shipped logo asset validates at the sizes the site renders', async () => {
  const results = await validateLogos({ config: realConfig });
  const invalid = results.filter(result => result.problems.length);
  assert.deepEqual(invalid.map(result => `${result.local}: ${result.problems.join('; ')}`), []);
});

test('the review sheet shows both display sizes and reports status in words', async () => {
  const html = await buildPreview({ config: realConfig, targets: ['src/assets/logos/azure-devops.svg'], sha: 'abc1234' });
  assert.match(html, /52px/);
  assert.match(html, /32px/);
  assert.match(html, /● Valid/);
  assert.match(html, /data:image\/svg\+xml;base64,/);
  assert.match(html, /abc1234/);
});
