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
npm test
npm run package
```

`npm run package` creates the complete uploadable site in `.deploy-package/` and fails if an application asset referenced by either HTML page, or a product image referenced by the dataset, is missing. Deploy that directory rather than assembling an upload by hand.

## Analysis calculations

`src/analysis.js` derives the analysis page from the canonical dataset at runtime. Date-sensitive calculations use `products.json`'s `asOf` value, not the visitor's current date, so results remain reproducible. Completed name periods supply rename counts and median historical durations; current periods supply current-name age.

The Rebrand Risk Index normalises current-name age, prior identity count, and family rename frequency before applying documented weights. It uses deterministic alphabetical tie-breaking and broad word-and-symbol status bands. Families with fewer than two completed renames are labelled as sparse rather than presented as comparable evidence.

The page is a separate static entry point at `analysis.html`. Deployment packaging copies both entry points and validates their local application references.

## Azure Static Web Apps

The repository root is both the app location and output location; there is no API or build output. A typical deployment uses:

- **App location:** `/`
- **API location:** leave blank
- **Output location:** leave blank

For token-based manual releases, run `npm run package` and upload `.deploy-package/`. This prevents a partial deployment from silently omitting `src/assets`.

`staticwebapp.config.json` provides navigation fallback and baseline security headers. No credentials are needed by the app.

The production shell is provisioned on the **Free** Static Web Apps tier in the **MVP 1k per month benefit** subscription:

- Resource group: `rebrandregistry`
- Static Web App: `swa-rebrand-registry`
- Region: West US 2
- Azure hostname: `wonderful-ocean-034ff8f1e.7.azurestaticapps.net`

The proof of concept is published at <https://wonderful-ocean-034ff8f1e.7.azurestaticapps.net>. The resource is not connected to a repository; releases are currently uploaded with a deployment token. The example workflow can be adopted later for automatic deployments from `main`.

## Accessibility implementation

Status is conveyed with symbols and words, not colour alone. The table remains the complete primary representation on narrow screens. The timeline is keyboard-focusable, horizontally scrollable, and supplementary; citations and date precision remain available in the table.
