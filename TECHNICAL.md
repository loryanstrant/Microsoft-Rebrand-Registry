# Technical guide

This page covers running, checking, packaging, and deploying The Rebrand Registry. See the [README](README.md) for the project overview, research methodology, and contribution guidance.

## Run locally

Requires Node.js 20 or later.

```bash
npm start
```

Open the local URL printed by `serve`. The app has no build step or runtime API and can be deployed directly as an Azure Static Web App.

## Validate and test

```bash
npm run validate
npm run validate:logos
npm test
npm run package
```

`npm run package` creates the complete uploadable site in `.deploy-package/` and fails if an application asset referenced by either HTML page, or a product image referenced by the dataset, is missing. Deploy that directory rather than assembling an upload by hand.

`npm run validate:logos` checks every shipped logo against the two sizes the site renders: 52px in the registry table and 32px in the timeline. It is pure Node, with no image library, and reports `● Validated` or `○ Invalid` per asset.

## Authoritative logo sync

Most logos are copies of artwork from [MicrosoftCloudLogos](https://github.com/loryanstrant/MicrosoftCloudLogos), the collection behind www.mscloudlogos.com. `.gitea/workflows/sync-authoritative-logos.yml` keeps them current: it runs daily, copies the mapped files byte for byte, validates them, and opens **one** review pull request. It never merges and never deploys. After merging, publish with the [release workflow](#releasing).

`config/logo-sources.json` is the mapping. Each `managed` entry names the local asset, its exact upstream path under `logos/`, the expected format, and an optional reviewed validation exception. Each `unmanaged` entry records why an asset stays local; those credited to the authoritative collection carry `creditedUpstream: true` so the opt-out is deliberate. Several registry assets may share one upstream mark; two mappings writing to the same local file is a conflict and fails the run.

The sync reads nothing but the mapped files. The upstream site moved to its own repository and its generated `docs/js/logo-data.js` manifest no longer exists, so `logos/` plus `metadata.md` is the whole source contract, and a test asserts no generated manifest creeps back in.

To run it by hand against a local checkout of the authoritative repository:

```bash
git clone --depth 1 https://github.com/loryanstrant/MicrosoftCloudLogos.git /tmp/mscl
npm run sync:logos -- --source /tmp/mscl --report sync-report.json          # dry run
npm run sync:logos -- --source /tmp/mscl --report sync-report.json --apply  # write files
npm run preview:logos -- --report sync-report.json --out _IMAGES/logo-sync-preview.html
```

The preview is a self-contained HTML contact sheet showing each changed logo at 52px and 32px on light, dark and checkerboard backgrounds. The workflow uploads it as the `logo-sync-review` artifact; open it in a browser before approving a sync pull request, because dimensions alone cannot prove a mark looks right.

Artwork is never cropped, resized, optimised or re-encoded. A missing or ambiguous upstream path fails the run and leaves the approved local asset untouched; corrections belong in the authoritative repository. Full acceptance criteria are in [docs/specs/authoritative-logo-sync.md](docs/specs/authoritative-logo-sync.md).

To add a logo to the sync, add a `managed` entry and run the dry run above. If the workflow token cannot push branches or open pull requests on this Gitea instance, add a repository-scoped `LOGO_SYNC_TOKEN` Actions secret; the workflow prefers it when present.

## Dataset shape

`scripts/validate-data.js` is the de facto schema. Every entry requires `id`, `name`, `family`, ordered `periods` and a `logo`. Three fields are optional and absent from most entries:

| Field | Values | Effect |
| --- | --- | --- |
| `kind` | `product` (default when absent) or `resource` | A `resource` is a significant Microsoft thing that is not a product. It is tagged in the table, excluded from the product count, and selectable through the **Show** filter. It is still analysed on the Rebrand Forecast alongside products. |
| `disambiguator` | short lowercase phrase | Rendered beneath the family as the registry's own clarifying label for two entries sharing an identical current name. Validation rejects it if it appears inside `name`. It never affects sorting or search. |
| `note` | one or two sentences | Rendered above the entry's name periods in the table, and carried as the label description in the timeline. |

`disambiguator` and `note` are interpolated into the page unescaped, so validation rejects `<` and `&` in either. Keep them plain prose.

## Analysis calculations

`src/analysis.js` derives the analysis page from the canonical dataset at runtime. The `products.json` `asOf` value remains the visible research date, while date-sensitive calculations use the visitor's current local calendar date at page load. Completed name periods supply rename counts and median historical durations; current periods supply current-name age. The days-since-last-rename tracker compares the latest completed period end with today and lists every product sharing the latest recorded transition. Tests inject a fixed current date to keep these calculations deterministic.

The Rebrand Risk Index normalises current-name age, prior identity count, and family rename frequency before applying documented weights. It uses deterministic alphabetical tie-breaking and broad word-and-symbol status bands. Families with fewer than two completed renames are labelled as sparse rather than presented as comparable evidence.

The page is a separate static entry point at `analysis.html`. Deployment packaging copies both entry points and validates their local application references.

## Azure Static Web Apps

The repository root is both the app location and output location; there is no API or build output. A typical deployment uses:

- **App location:** `/`
- **API location:** leave blank
- **Output location:** leave blank

For token-based manual releases, run `npm run package` and upload `.deploy-package/`. This prevents a partial deployment from silently omitting `src/assets`.

```bash
npm run package
npx @azure/static-web-apps-cli deploy .deploy-package --deployment-token <token> --env production
```

`--env production` matters: without it the CLI publishes to a preview environment rather than the live site.

On a minimal Linux container the CLI's `StaticSitesClient` binary aborts with *"Couldn't find a valid ICU package installed on the system"*. Either install `libicu`, or run the deploy with globalization disabled:

```bash
DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 npx @azure/static-web-apps-cli deploy .deploy-package \
  --deployment-token <token> --env production
```

`staticwebapp.config.json` provides navigation fallback and baseline security headers. No credentials are needed by the app.

The production shell is provisioned on the **Free** Static Web Apps tier in the **MVP 1k per month benefit** subscription:

- Resource group: `rebrandregistry`
- Static Web App: `swa-rebrand-registry`
- Region: West US 2
- Azure hostname: `wonderful-ocean-034ff8f1e.7.azurestaticapps.net`

The proof of concept is published at <https://wonderful-ocean-034ff8f1e.7.azurestaticapps.net>. The resource is not connected to a repository, so merging a pull request changes `main` without touching the live site.

### Releasing

`.gitea/workflows/deploy-production.yml` performs a release. It is **`workflow_dispatch` only**: merging never publishes. Run it from the repository's Actions tab, optionally naming a ref other than `main`.

The workflow validates the dataset and every logo, runs the suite, builds `.deploy-package/`, publishes with the Static Web Apps CLI, then polls the live site until `src/assets/logos/azure-devops.svg` matches the committed file and both entry points return HTTP 200. A release that cannot be observed on the live site fails.

It reads the deployment token from the Actions secret `SWA_DEPLOYMENT_TOKEN`, whose value is stored in Vaultwarden as *Rebrand Registry - SWA deployment token*. If the secret is missing the workflow stops with that instruction rather than reporting a hollow success.

To publish automatically on every merge, add a `push` trigger on `main` to that workflow; nothing else needs to change.

## Accessibility implementation

Status is conveyed with symbols and words, not colour alone. The table remains the complete primary representation on narrow screens. The timeline is keyboard-focusable, horizontally scrollable, and supplementary; citations and date precision remain available in the table.
