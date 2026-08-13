# Microsoft Product Lifecycle Tracker

A static, accessible proof of concept for exploring the current and former names of Microsoft cloud products. The primary view is a sortable-style research table with inline duration bars; a timeline is available as a secondary view.

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

This initial dataset is deliberately small. It uses first-party Microsoft announcements wherever available and should be reviewed as research, not as an official Microsoft chronology.

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

## Accessibility

Status is conveyed with symbols and words, not colour alone. The table remains the complete primary representation on narrow screens. The timeline is keyboard-focusable, horizontally scrollable, and supplementary; citations and date precision remain available in the table.
