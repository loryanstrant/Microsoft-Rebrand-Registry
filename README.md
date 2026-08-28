# The Rebrand Registry

A static, accessible proof of concept for exploring the names and visual identities Microsoft cloud products have accumulated over time. The primary view is a research table with inline duration bars; a timeline is available as a secondary view.

The initial dataset covers product-name periods and displays each product’s current logo from the Microsoft Cloud Logos collection. Researching historical logo periods remains the next dataset expansion, because Microsoft branding history has never been content with one dimension.

The site’s tongue-in-cheek “Get Your Story Straight” network credits [Microsoft Cloud Logos](https://www.mscloudlogos.com/) for current and historical visual identities and [Let Me Correct That For You](https://www.letmecorrectthatforyou.com/) for Microsoft terminology: if you’re going to say something, be right about it. A separate attribution notes that some rename leads were drawn from [M365 Maps](https://m365maps.com/renames.htm) and [Rebranded by Microsoft](https://rebrandedbyms.com/), then checked against cited sources.

## Data methodology

`src/data/products.json` is the canonical dataset.

- A period start is inclusive and its end is exclusive.
- `YYYY-MM` values retain month precision. They are normalized to the first day only for calculating and drawing durations.
- A qualifier records whether a date is a launch, announcement, effective date, or merely the earliest date established by a source (`by`).
- Each period must cite at least one source, and each product must have exactly one ongoing period.
- The registry includes only things Microsoft still operates. It excludes discontinued products; former names are
  included only when they document a continuing thing's rename history.
- Most entries are products. An optional `kind: "resource"` marks a significant Microsoft resource that is not a
  product — a roadmap, portal or programme — and the interface tags it as such so the product count stays honest.
- Where products converge into a shared experience, each documented rename is still recorded separately. The schema
  holds one linear name history per entry; it deliberately cannot express lineage, because this registry tracks names.
- An optional `note` carries a short editorial annotation, shown above an entry's name periods.
- An optional `disambiguator` tells apart two entries that share an identical current name. It is the registry's own
  clarifying label, never part of the official name, never part of a period name, and never matched by search.
- Sources are dated by publication. Where a first-party page is evergreen and carries no date, it takes the date of
  the dated announcement that corroborates it rather than an invented one.
- Durations for ongoing names are calculated to the top-level `asOf` date, making the output reproducible.
- Sources are evidence for the transition, but historical pages do not always establish an exact first-use date. The interface exposes precision and qualifiers rather than implying unsupported accuracy.

The registry currently covers 76 cloud and online products plus 1 non-product resource, across 177 documented name periods, supported by 145 cited sources. It uses first-party Microsoft announcements wherever available and should be reviewed as research, not as an official Microsoft chronology. Alphabetical jump links divide the growing catalogue without hiding entries behind pagination or collapsed sections. The index ignores a leading “Microsoft” so related product names remain easy to scan; names beginning with a number are under #.

## Analysis

**The Rebrand Forecast** turns the canonical dataset into an evidence-led—and intentionally playful—analysis of rename timing, product-family patterns, repeat offenders, and possible future naming turbulence. Statistics are calculated from the registry rather than maintained separately. The forecast is entertainment, not reporting or evidence of Microsoft’s plans.

Because the registry covers surviving entries only, its analysis has survivorship bias: discontinued products are outside scope. Resources are analysed alongside products, so a roadmap rename moves the statistics like any other. Product families also vary in size, so sparse groups are labelled rather than treated as conclusive.

## Contribute

Contributions are welcome through the public [GitHub repository](https://github.com/loryanstrant/Microsoft-Rebrand-Registry).

To add a product:

1. Add its stable ID, current name, family, and ordered name periods to `products`.
2. Add first-party sources to `sources`; reference their IDs from each supported period.
3. Preserve the precision of the evidence. Do not invent a day or month. Date a period to when the change took effect, not to when it was announced.
4. If the entry is not a product, set `kind` to `resource`. If its current name collides with another entry's, add a `disambiguator` rather than editing the name.
5. Follow the checks in the [technical guide](TECHNICAL.md) before submitting your contribution.

## Technical documentation

See the [technical guide](TECHNICAL.md) for local development, validation and testing, deployment packaging, Azure Static Web Apps configuration, and accessibility implementation notes.
