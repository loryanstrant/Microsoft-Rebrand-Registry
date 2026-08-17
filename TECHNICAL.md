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

`npm run package` creates the complete uploadable site in `.deploy-package/` and fails if a referenced image or application asset is missing. Deploy that directory rather than assembling an upload by hand.

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
