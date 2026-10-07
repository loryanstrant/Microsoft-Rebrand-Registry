# Authoritative logo sync from MicrosoftCloudLogos

**Status:** implemented · **Branch:** `claude/bb2e24e0cf50-updated-azure-logo`

## Problem

The registry keeps its own copy of every logo. When the Azure DevOps mark was updated in
[MicrosoftCloudLogos](https://github.com/loryanstrant/MicrosoftCloudLogos) - the collection
behind [www.mscloudlogos.com](https://www.mscloudlogos.com), and the credited source for 42
of our entries - nothing flowed through. Someone had to notice the change, find the right
file, copy it in, and hope it still looked right at the sizes the site renders.

That is the whole problem: there was no link between the authoritative artwork and the
copies we ship.

## Approach

A scheduled Gitea Action copies the mapped artwork from the authoritative repository,
validates it against the sizes the site actually renders, and opens **one** review pull
request. It never merges and never deploys.

### The source contract is `logos/`, not a generated manifest

The upstream repository used to generate `docs/js/logo-data.js` for its GitHub Pages site.
That site has moved to its own repository and the generated manifest has been removed
upstream, so this sync deliberately reads **nothing but the files mapped under `logos/`**.
`config/logo-sources.json` records the mapping; `tests/data.test.js` asserts that no
upstream manifest creeps back into the contract.

### Explicit mappings, with one narrow fallback

`config/logo-sources.json` holds two lists:

- **`managed`** - 47 assets, each with its exact upstream path, product slug, expected
  format, and an optional reviewed validation exception.
- **`unmanaged`** - 26 assets that stay local, each with a reason. Those credited to the
  authoritative collection but still unmanaged carry `creditedUpstream: true`, so the
  opt-out is explicit rather than an oversight.

Several registry assets may share one upstream mark - the Entra ID icon also stands in for
Permissions Management and Workload ID. That fan-out is supported. Two mappings writing to
the same local file is a conflict and fails the run.

When a mapped upstream path disappears, the sync looks for exactly one same-extension file
at the top level of `logos/<slug>/`. One candidate is adopted and reported as **relocated**
in the pull request body, so a human still reviews the swap. Zero or several candidates
fail that entry and leave the approved local asset untouched.

### Validation targets the two sizes the site renders

`scripts/validate-logos.js` is pure Node - the registry has no runtime dependencies and
this keeps it that way. It decodes PNGs itself (IHDR, palette, `tRNS`, and the five PNG
row filters through `node:zlib`) and checks:

- SVGs have a positive `viewBox`, or failing that positive intrinsic width and height;
- SVGs carry no script, event handler, `foreignObject`, or external reference;
- PNGs decode, and the longest edge is at least **104px** - twice the 52px registry size,
  so the artwork stays crisp at 2x density;
- visible (non-transparent) artwork fills at least half the canvas, and is itself large
  enough after transparent padding is discounted;
- aspect ratios stay within 4:1.

Nothing is cropped, resized, optimised or re-encoded. Source corrections belong upstream.

### Review evidence

`scripts/render-logo-preview.js` builds a self-contained HTML contact sheet with the
artwork inlined as data URIs, showing each changed logo at **52px** (registry table) and
**32px** (timeline) on light, dark and checkerboard backgrounds. It is uploaded as the
`logo-sync-review` workflow artifact. Rendering in a browser is the point: it is the same
engine the site uses, so optical problems that dimensions alone cannot catch show up.
Status is reported as `● Valid` and `○ Invalid` - words and shapes, never colour alone.

## Flow

1. The Action runs daily, or on demand with an optional upstream ref.
2. It shallow-clones the authoritative repository and records the commit SHA.
3. `scripts/sync-authoritative-logos.js` resolves each mapping, validates the candidate
   bytes, and writes only files that genuinely differ.
4. `npm run validate:logos`, `npm run validate`, `npm test` and `npm run package` all run.
5. The contact sheet and the machine-readable sync report are uploaded as artifacts.
6. If `src/assets/logos` is unchanged, the run ends cleanly with no branch and no pull
   request.
7. Otherwise `automation/sync-authoritative-logos` is force-pushed and one pull request is
   opened or updated, quoting the upstream commit and listing changed and relocated files.
8. A human reviews the contact sheet, merges, and deploys through the existing separate
   process.

## Acceptance criteria

### Sync
- An unchanged upstream file produces no commit, no branch and no pull request.
- A changed upstream file is copied byte for byte, and a second run is a no-op.
- A missing upstream path fails the run without altering or deleting the local asset.
- A single renamed file inside a mapped product folder is adopted and flagged as relocated.
- Several rename candidates are ambiguous: the run fails and changes nothing.
- A changed file format fails rather than swapping file types.
- One upstream mark may feed several registry assets.

### Validation
- Malformed, empty, undersized or effectively invisible artwork is refused.
- Excessive transparent padding is refused unless the mapping documents an exception.
- Active content and external references in SVGs are refused before packaging.
- Every shipped asset passes `npm run validate:logos` on every run.

### Manifest
- Every logo in use is classified exactly once, and the manifest lists no asset the
  registry has stopped using.
- Every asset credited to the authoritative collection is either managed or carries an
  explicit `creditedUpstream` opt-out with a reason.
- No generated upstream website manifest is consumed.

### Workflow
- Runs daily and on demand; one concurrent run at a time.
- Never merges and never deploys.
- Uses the built-in workflow token, falling back to a repository-scoped `LOGO_SYNC_TOKEN`
  Actions secret if that token cannot push branches or open pull requests.

## UX impact

No site change. Navigation, controls, loading, empty and error states are untouched; the
~380px layout is unaffected because the same local assets render through the existing
`object-fit: contain` boxes. There is no separate mobile app: the responsive site receives
the same artwork. The only new surface is the reviewer's contact sheet.

## Risks

- **Upstream reorganisation.** Mappings fail safely rather than deleting approved artwork,
  and the single-candidate fallback covers the common rename without guessing.
- **Token permissions.** The workflow token is tried first; a dedicated repository-scoped
  secret is the documented fallback.
- **False size failures.** Narrow, documented per-asset exceptions are supported.
- **Source outages.** A failed run keeps the last approved assets and succeeds next time.
- **Optical sizing.** Dimensions alone cannot prove a mark looks right, which is why the
  contact sheet is review evidence rather than a nicety.

## Verification performed

A real dry run against `loryanstrant/MicrosoftCloudLogos@8dbed75` reported exactly one
difference - `src/assets/logos/azure-devops.svg`, the mark that prompted this work - with
46 of 47 mappings already matching and no failures. Applying it updated that one file; an
immediate second run reported no changes. The contact sheet rendered the updated mark at
both sizes. The full suite passes.
