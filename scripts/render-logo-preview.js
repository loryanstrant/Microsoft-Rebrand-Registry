// Builds the review contact sheet for a logo sync: every changed logo at the two sizes
// the site actually renders, on light, dark and checkerboard backgrounds.
//
// The output is a self-contained HTML file with the artwork inlined as data URIs, so the
// Gitea Actions artifact opens in a browser with no network access and no image library
// in the workflow. Rendering through the browser is the point: it is the same engine the
// site uses, so optical problems that dimensions alone cannot catch are visible here.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, checkAsset, rulesFor } from './validate-logos.js';

const MEDIA_TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
}

export async function buildPreview({ config, targets, baseDir = '.', sha = null } = {}) {
  const loaded = config ?? (await loadConfig());
  const byLocal = new Map([...loaded.managed, ...loaded.unmanaged].map(entry => [entry.local, entry]));
  const list = targets?.length ? targets : loaded.managed.map(entry => entry.local);
  const { registryPx, timelinePx } = loaded.display;
  const cards = [];

  for (const local of list) {
    const entry = byLocal.get(local);
    const extension = path.extname(local).toLowerCase();
    const buffer = await readFile(path.join(baseDir, local));
    let problems = [];
    let detail = {};
    try {
      ({ problems, detail } = checkAsset(local, buffer, rulesFor(loaded, entry)));
    } catch (error) {
      problems = [error.message];
    }
    cards.push({
      local,
      dataUri: `data:${MEDIA_TYPES[extension] ?? 'application/octet-stream'};base64,${buffer.toString('base64')}`,
      status: problems.length ? '○ Invalid' : '● Valid',
      problems,
      detail,
      upstream: entry?.upstream ?? null
    });
  }

  const rows = cards.map(card => `
      <article class="card">
        <h2>${escapeHtml(card.local)}</h2>
        <p class="status ${card.problems.length ? 'invalid' : 'valid'}">${card.status}${card.problems.length ? `: ${escapeHtml(card.problems.join('; '))}` : ''}</p>
        ${card.upstream ? `<p class="source">from <code>${escapeHtml(card.upstream)}</code></p>` : ''}
        <p class="source">${escapeHtml(card.detail.width ?? '?')}&times;${escapeHtml(card.detail.height ?? '?')}${card.detail.scalable ? ' scalable' : ' raster'}${card.detail.note ? ` &middot; ${escapeHtml(card.detail.note)}` : ''}</p>
        <div class="sizes">
          ${[registryPx, timelinePx].map(size => ['light', 'dark', 'checker'].map(background => `
          <figure class="swatch ${background}">
            <img src="${card.dataUri}" alt="${escapeHtml(card.local)} at ${size} pixels" width="${size}" height="${size}">
            <figcaption>${size}px ${background}</figcaption>
          </figure>`).join('')).join('')}
        </div>
      </article>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logo sync review sheet</title>
<style>
  :root { color-scheme: light; font-family: "Segoe UI", system-ui, sans-serif; }
  body { margin: 0; padding: 24px; background: #f3f3f3; color: #1b1b1b; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { margin: 0 0 20px; color: #4a4a4a; font-size: 13px; }
  .card { background: #fff; border: 1px solid #d8d8d8; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .card h2 { font-size: 15px; margin: 0 0 4px; font-family: ui-monospace, Consolas, monospace; }
  .status { margin: 0 0 4px; font-weight: 600; }
  .status.valid { color: #0b6a0b; }
  .status.invalid { color: #a4262c; }
  .source { margin: 0 0 4px; font-size: 12px; color: #595959; }
  .sizes { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
  .swatch { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px; border-radius: 6px; border: 1px solid #d8d8d8; min-width: 88px; }
  .swatch img { object-fit: contain; }
  .swatch figcaption { font-size: 11px; color: #595959; }
  .swatch.dark { background: #1b1b1b; }
  .swatch.dark figcaption { color: #d8d8d8; }
  .swatch.checker { background-color: #fff; background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 12px 12px; background-position: 0 0, 0 6px, 6px -6px, -6px 0; }
  @media (max-width: 380px) { body { padding: 12px; } .sizes { gap: 8px; } }
</style>
</head>
<body>
<h1>Logo sync review sheet</h1>
<p class="meta">${cards.length} logo${cards.length === 1 ? '' : 's'} at ${registryPx}px (registry table) and ${timelinePx}px (timeline).${sha ? ` Source commit ${escapeHtml(sha)}.` : ''} Status is shown as words, never colour alone.</p>
${rows || '<p class="meta">Nothing changed in this run.</p>'}
</body>
</html>
`;
}

function argument(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportPath = argument('report');
  const output = argument('out', '_IMAGES/logo-sync-preview.html');
  let targets = process.argv.slice(2).filter(value => value.startsWith('src/'));
  if (reportPath) {
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    targets = report.changed;
  }
  const html = await buildPreview({ targets, sha: argument('sha') });
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
  console.log(`● Review sheet written to ${output} (${targets?.length ?? 'all managed'} logos).`);
}
