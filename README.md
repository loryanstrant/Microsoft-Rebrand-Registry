# The Rebrand Registry

A static, accessible proof of concept for exploring the names and visual identities Microsoft cloud products have accumulated over time. The primary view is a research table with inline duration bars; a timeline is available as a secondary view.

The initial dataset covers product-name periods and displays each product’s current logo from the Microsoft Cloud Logos collection. Researching historical logo periods remains the next dataset expansion, because Microsoft branding history has never been content with one dimension.

The site’s tongue-in-cheek “Get Your Story Straight” network credits [Microsoft Cloud Logos](https://www.mscloudlogos.com/) for current and historical visual identities and [Let Me Correct That For You](https://www.letmecorrectthatforyou.com/) for Microsoft terminology: if you’re going to say something, be right about it. A separate attribution notes that some rename leads were drawn from [M365 Maps](https://m365maps.com/renames.htm) and [Rebranded by Microsoft](https://rebrandedbyms.com/), then checked against cited sources.

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
```

## Data methodology

`src/data/products.json` is the canonical dataset.

- A period start is inclusive and its end is exclusive.
- `YYYY-MM` values retain month precision. They are normalized to the first day only for calculating and drawing durations.
- A qualifier records whether a date is a launch, announcement, effective date, or merely the earliest date established by a source (`by`).
- Each period must cite at least one source, and each product must have exactly one ongoing period.
- Durations for ongoing names are calculated to the top-level `asOf` date, making the output reproducible.
- Sources are evidence for the transition, but historical pages do not always establish an exact first-use date. The interface exposes precision and qualifiers rather than implying unsupported accuracy.

The registry currently covers 48 cloud and online products across 106 documented name periods. It uses first-party Microsoft announcements wherever available and should be reviewed as research, not as an official Microsoft chronology. Alphabetical jump links divide the growing catalogue without hiding entries behind pagination or collapsed sections. The index ignores a leading “Microsoft” so related product names remain easy to scan; names beginning with a number are under #.

## Add a product

1. Add its stable ID, current name, family, and ordered name periods to `products`.
2. Add first-party sources to `sources`; reference their IDs from each supported period.
3. Preserve the precision of the evidence. Do not invent a day or month.
4. Run `npm run validate && npm test`.

## Azure Static Web Apps

The repository root is both the app location and output location; there is no API or build output. A typical deployment uses:

- **App location:** `/`
- **API location:** leave blank
- **Output location:** leave blank

`staticwebapp.config.json` provides navigation fallback and baseline security headers. No credentials are needed by the app.

The production shell is provisioned on the **Free** Static Web Apps tier in the **MVP 1k per month benefit** subscription:

- Resource group: `rebrandregistry`
- Static Web App: `swa-rebrand-registry`
- Region: West US 2
- Azure hostname: `wonderful-ocean-034ff8f1e.7.azurestaticapps.net`

The proof of concept is published at <https://wonderful-ocean-034ff8f1e.7.azurestaticapps.net>. The resource is not connected to a repository; releases are currently uploaded with a deployment token. The example workflow can be adopted later for automatic deployments from `main`.

## Accessibility

Status is conveyed with symbols and words, not colour alone. The table remains the complete primary representation on narrow screens. The timeline is keyboard-focusable, horizontally scrollable, and supplementary; citations and date precision remain available in the table.
