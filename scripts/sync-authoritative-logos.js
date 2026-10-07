// Copies the authoritative logo artwork from a checked-out MicrosoftCloudLogos tree
// into the registry, byte for byte, and reports what changed.
//
// It reads nothing but the files named in config/logo-sources.json. The upstream
// website manifest (docs/js/logo-data.js) was removed when the catalogue site moved to
// its own repository, so logos/ plus metadata.md is the whole source contract.
//
// Nothing here crops, resizes, optimises or rewrites artwork: corrections belong in
// the authoritative repository. When an entry cannot be resolved the approved local
// asset is left exactly as it is and the run fails.
import { readFile, writeFile, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, checkAsset, rulesFor } from './validate-logos.js';

const FAILURE_STATUSES = new Set(['missing', 'ambiguous', 'format-changed', 'invalid', 'conflict']);

// Several registry assets legitimately share one upstream mark: the Entra ID icon, for
// example, also stands in for Permissions Management and Workload ID. That fan-out is
// fine. What is never fine is two mappings writing to the same local file.
export function findMappingConflicts(config) {
  const seen = new Set();
  const conflicts = [];
  for (const entry of [...config.managed, ...config.unmanaged]) {
    if (seen.has(entry.local)) conflicts.push(entry.local);
    else seen.add(entry.local);
  }
  return [...new Set(conflicts)];
}

async function readIfFile(file) {
  try {
    const info = await stat(file);
    if (!info.isFile()) return null;
    return await readFile(file);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}

// Upstream occasionally renames a file inside an otherwise stable product folder.
// Accept exactly one same-extension candidate at the top level of that folder, and
// report it as relocated so a human still reviews the swap. Zero or several
// candidates is an ambiguity we refuse to guess at.
async function findRelocated(sourceDir, entry, assetRoot) {
  const slug = entry.upstreamSlug;
  if (!slug) return { candidates: [] };
  const folder = path.join(sourceDir, assetRoot, slug);
  let names;
  try {
    names = await readdir(folder, { withFileTypes: true });
  } catch {
    return { candidates: [] };
  }
  const extension = path.extname(entry.upstream).toLowerCase();
  const candidates = names
    .filter(item => item.isFile() && path.extname(item.name).toLowerCase() === extension)
    .map(item => path.posix.join(assetRoot, slug, item.name));
  return { candidates };
}

export async function syncLogos({ config, sourceDir, targetDir = '.', apply = false, sha = null } = {}) {
  const loaded = config ?? (await loadConfig());
  const assetRoot = loaded.sourceRepository.assetRoot ?? 'logos';
  const allowFallback = loaded.resolution?.allowSlugFallback !== false;
  const entries = [];

  for (const local of findMappingConflicts(loaded)) {
    entries.push({ local, upstream: null, resolved: null, status: 'conflict', reason: 'mapped more than once' });
  }

  for (const entry of loaded.managed) {
    const result = { local: entry.local, upstream: entry.upstream, resolved: entry.upstream, status: 'unchanged', reason: null };
    const expected = path.extname(entry.upstream).toLowerCase().slice(1);
    if (expected !== entry.format) {
      result.status = 'format-changed';
      result.reason = `mapping declares ${entry.format} but points at a .${expected} file`;
      entries.push(result);
      continue;
    }
    if (path.extname(entry.local).toLowerCase() !== path.extname(entry.upstream).toLowerCase()) {
      result.status = 'format-changed';
      result.reason = 'local and upstream file extensions differ';
      entries.push(result);
      continue;
    }

    let source = await readIfFile(path.join(sourceDir, entry.upstream));
    if (!source && allowFallback) {
      const { candidates } = await findRelocated(sourceDir, entry, assetRoot);
      const usable = candidates.filter(candidate => candidate !== entry.upstream);
      if (usable.length === 1) {
        source = await readIfFile(path.join(sourceDir, usable[0]));
        result.resolved = usable[0];
        result.relocated = true;
      } else if (usable.length > 1) {
        result.status = 'ambiguous';
        result.reason = `upstream path is gone and ${usable.length} candidates remain in ${assetRoot}/${entry.upstreamSlug}`;
        entries.push(result);
        continue;
      }
    }
    if (!source) {
      result.status = 'missing';
      result.reason = `upstream file ${entry.upstream} does not exist; the approved local asset was left untouched`;
      entries.push(result);
      continue;
    }

    let problems = [];
    try {
      ({ problems } = checkAsset(entry.local, source, rulesFor(loaded, entry)));
    } catch (error) {
      problems = [error.message];
    }
    if (problems.length) {
      result.status = 'invalid';
      result.reason = problems.join('; ');
      entries.push(result);
      continue;
    }

    const destination = path.join(targetDir, entry.local);
    const current = await readIfFile(destination);
    if (current && current.equals(source)) {
      result.status = result.relocated ? 'relocated' : 'unchanged';
      if (result.relocated) result.reason = `upstream file moved to ${result.resolved}; bytes are unchanged`;
      entries.push(result);
      continue;
    }

    result.status = current ? 'updated' : 'added';
    result.bytes = source.length;
    if (result.relocated) result.reason = `upstream file moved to ${result.resolved}`;
    if (apply) await writeFile(destination, source);
    entries.push(result);
  }

  const failures = entries.filter(entry => FAILURE_STATUSES.has(entry.status));
  const changed = entries.filter(entry => entry.status === 'added' || entry.status === 'updated');
  return {
    sourceRepository: loaded.sourceRepository.name,
    branch: loaded.sourceRepository.branch,
    sha,
    applied: apply,
    counts: {
      managed: loaded.managed.length,
      unmanaged: loaded.unmanaged.length,
      changed: changed.length,
      failed: failures.length
    },
    changed: changed.map(entry => entry.local),
    failures,
    entries
  };
}

function argument(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sourceDir = argument('source');
  if (!sourceDir) {
    console.error('○ Usage: node scripts/sync-authoritative-logos.js --source <checkout> [--sha <sha>] [--apply] [--report <file>]');
    process.exit(2);
  }
  const report = await syncLogos({
    sourceDir,
    sha: argument('sha'),
    apply: process.argv.includes('--apply')
  });
  const reportPath = argument('report');
  if (reportPath) await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  for (const entry of report.failures) {
    console.error(`○ Failed ${entry.local}: ${entry.reason}`);
  }
  for (const entry of report.entries.filter(item => item.status === 'relocated')) {
    console.log(`◐ Relocated ${entry.local}: ${entry.reason}`);
  }
  for (const local of report.changed) {
    console.log(`◐ Changed ${local}`);
  }
  if (report.failures.length) process.exit(1);
  console.log(
    report.changed.length
      ? `● ${report.changed.length} of ${report.counts.managed} authoritative logos ${report.applied ? 'updated' : 'differ (dry run)'}.`
      : `● All ${report.counts.managed} authoritative logos already match the source.`
  );
}
