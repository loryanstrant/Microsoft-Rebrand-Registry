# Copilot convergence and the AI at Work Roadmap

**Status:** approved · **Branch:** `claude/06249f8bab5a-m365-roadmap-copilot-reb`

## Problem

Two Microsoft renames landed in August 2026 that the registry cannot currently express.

### 1. Copilot

What looked like a single rename is three related changes:

- **The app.** *Microsoft 365 Copilot app* → *Microsoft Copilot app*, effective 18 August 2026, with a new icon and a web address move from `m365.cloud.microsoft` to `copilot.cloud.microsoft` (MC1454108).
- **The service.** *Microsoft 365 Copilot* → *Microsoft Copilot*. Microsoft Learn states this plainly. That service **is not in the registry at all today** — the registry has only the consumer assistant and the app.
- **A genuine merge.** The consumer Copilot app and the work app are becoming one client: *"Microsoft Copilot application unification updates existing Microsoft Copilot and Microsoft 365 Copilot app installations to a single Copilot application experience."*

The schema holds one linear, non-overlapping name history per entry with exactly one open-ended period. It cannot represent two lineages converging into one. The scope note in `index.html` also puts merges explicitly out of scope.

Adding the service produces two entries whose current name is character-for-character `Microsoft Copilot`. Microsoft's own documentation disambiguates them as *(for organizations)* and *(for individuals)* — but those are documentation titles, not product names, so the registry must not absorb them into `name`.

### 2. The AI at Work Roadmap

The *Microsoft 365 Roadmap* is now the *AI at Work Roadmap* (MC1461528; the new name was live on 25 August 2026). It is not a product, but it is a significant, long-lived, publicly-renamed Microsoft thing — and it has been renamed twice: *Office 365 Roadmap* → *Microsoft 365 Roadmap* → *AI at Work Roadmap*. The registry has no way to carry it without claiming it is a product.

## Approach

Record every rename as ordinary name periods. **Annotate** the Copilot convergence rather than modelling it — the registry tracks names, not lineage. Introduce a `kind` tag so significant non-products can be carried honestly, and a `disambiguator` field, visibly marked as the registry's own, for identically-named entries.

## Flow

A visitor lands on the registry table.

1. They search `copilot`. Three rows appear together: **Microsoft Copilot** *(for individuals)*, **Microsoft Copilot** *(for organizations)*, and **Microsoft Copilot app**. Each carries its family, its disambiguating label where it has one, and — for the two that converged — a note explaining why two histories are recorded separately. Nothing reads as a duplicate-row bug.
2. They scroll to the roadmap. **AI at Work Roadmap** carries a `◇ Resource, not a product` pill and its three name periods back to *Office 365 Roadmap*.
3. They set the **Show** filter to *Resources only*. Only tagged non-products remain. Set to *Products only*, the roadmap disappears and the table is products alone.
4. The header counts read *products* / *resources* / *documented names* separately, so the product count never silently includes a roadmap.

## Acceptance criteria

### Data

- [ ] `m365-copilot-app` is named `Microsoft Copilot app`; its `id` is unchanged.
- [ ] Its previous period ends `2026-08-18`, day precision, qualifier `effective`; a new open period `Microsoft Copilot app` starts on the same date with the same precision and qualifier.
- [ ] A new entry `microsoft-copilot-service` exists, named `Microsoft Copilot`, with four periods: `Microsoft 365 Copilot` (2023-03-16, `announced`) → `Copilot for Microsoft 365` (2023-11-15, `by`) → `Microsoft 365 Copilot` (2024-09-16, `by`) → `Microsoft Copilot` (2026-08, month precision, `by`).
- [ ] A new entry `ai-at-work-roadmap` exists with `kind: "resource"` and three periods: `Office 365 Roadmap` (2015-01, month precision, `by`) → `Microsoft 365 Roadmap` (2018-09-24, day, `effective`) → `AI at Work Roadmap` (2026-08-25, day, `effective`).
- [ ] `microsoft-copilot` keeps its existing periods, dates and sources **unchanged**, and gains only `disambiguator` and `note`.
- [ ] Every new period cites at least one source; every new source has a title, publisher and resolvable URL.
- [ ] `asOf` is bumped to the implementation date.

### Schema and validation

- [ ] `kind`, `disambiguator` and `note` are **optional**; all 72 pre-existing entries validate unchanged without them.
- [ ] `validate-data.js` rejects a `kind` outside `product` / `resource`, an empty `disambiguator` or `note`, and any of the three containing `<` or `&`.
- [ ] Every pre-existing invariant still holds: unique IDs, exactly one open period per entry, non-overlapping ordered periods, precision matching date length, sources resolvable.

### Interface

- [ ] An entry with `kind: "resource"` shows a `◇ Resource, not a product` pill beneath its family line, using the existing `.badge` treatment.
- [ ] An entry with a `disambiguator` shows it on its own line beneath the family, in the smaller/lighter `.family` treatment, suffixed `— our label, not Microsoft's`.
- [ ] The `disambiguator` never appears inside any `name` or period name, is not matched by search, and does not affect alphabetical sorting.
- [ ] An entry with a `note` renders it full-width above its period rows in the table view, and as an `aria-label`/`title` on the product label in the timeline view.
- [ ] The third filter control is labelled **Show** and offers *Everything* (default), *Current only*, *Former only*, *Products only*, *Resources only*. There is no fourth control.
- [ ] The header summary shows three counts: products, resources, documented names — with resources excluded from the product count.
- [ ] Status remains shape + words, never colour alone.
- [ ] No horizontal scroll, clipped text or cut-off control at 380px on either page.
- [ ] Loading, error and empty states still behave; the empty state covers *Resources only* combined with a family that has none.

### Copy

- [ ] The scope note on `index.html` and the matching README bullet no longer claim every entry is a product, and acknowledge that converging products still have their renames recorded separately.
- [ ] A sentence documents that shared-name clarifying labels are the registry's, not Microsoft's.
- [ ] `README.md` headline counts match the shipped dataset.
- [ ] No jargon or raw field names on any user-facing surface.

### Tests

- [ ] `npm run validate` passes with zero errors.
- [ ] `npm test` passes; the pinned counts in `data.test.js` and `analysis.test.js` are updated to deliberately recomputed values, not loosened.
- [ ] The scope-disclaimer test targets the amended wording.
- [ ] The Copilot distinct-marks test covers all three Copilot entries and still asserts the marks differ.
- [ ] New tests cover: the three optional fields present and absent; the Show filter's product/resource modes; the disambiguator never appearing in a name.
- [ ] `npm run package` succeeds, proving every referenced logo asset exists.

## Non-goals

- **Modelling lineage.** No `convergedInto`, `supersedes` or cross-entry references. The registry tracks names, not lineage — this change reinforces that rather than weakening it.
- **Merging the two Copilot entries.** Both histories are documented and both are kept. Folding one into the other would destroy evidence the schema has no way to hold.
- **Excluding resources from the analysis page.** Per explicit direction, `kind: "resource"` entries count in every Rebrand Forecast statistic, including the days-since-last-rename clock.
- **A per-product detail page.** Out of scope; the table row remains the unit of display.
- **Renaming entry IDs to match new names.** IDs are stable identifiers.
- **Backfilling `kind` across the existing 72 entries.** Absent means product.
- **Adding Microsoft 365 Copilot Chat.** Also renamed (to Microsoft Copilot Chat), but a separate entry and a separate change.

## Sources

All first-party unless noted.

| id | Title | Publisher | Published |
|---|---|---|---|
| `m365-copilot-announce` | Introducing Microsoft 365 Copilot—A whole new way to work | Microsoft 365 Blog | 2023-03-16 |
| `copilot-for-m365-name` | Introducing Microsoft Copilot Studio and new features in Copilot for Microsoft 365 | Microsoft 365 Blog | 2023-11-15 |
| `m365-copilot-wave2` | Microsoft 365 Copilot Wave 2: Pages, Python in Excel, and agents | Microsoft 365 Blog | 2024-09-16 |
| `copilot-app-unified-announce` | Prepare customers for a simpler, unified Microsoft Copilot app experience | Microsoft Partner Center | 2026-08-14 |
| `copilot-app-renamed` | Get started with the Microsoft Copilot app | Microsoft Support | 2026-08-14 |
| `copilot-service-renamed` | Application card: Microsoft Copilot (for organizations) | Microsoft Learn | 2026-08-14 |
| `copilot-app-unification` | Deploy the unified Microsoft Copilot application | Microsoft Learn | 2026-08-14 |
| `office-365-roadmap-archive` | Office 365 Roadmap — archived capture of roadmap.office.com | Internet Archive | 2015-01-14 |
| `m365-roadmap-live` | The New Microsoft 365 Roadmap is Live | Microsoft 365 Blog | 2018-09-24 |
| `ai-at-work-roadmap-doc` | Use the AI at Work Roadmap | Microsoft Learn | 2026-08-25 |
| `ai-at-work-roadmap-blog` | One always-on roadmap: Dynamics 365, Power Platform, and Dataverse join the AI at Work roadmap | Microsoft Dynamics 365 Blog | 2026-08-25 |

Load-bearing quotes:

- *"The Microsoft 365 Copilot app is now called Microsoft Copilot app."* — `copilot-app-renamed`
- *"Microsoft 365 Copilot is now named Microsoft Copilot, and Microsoft 365 Copilot Chat is now named Microsoft Copilot Chat."* — `copilot-service-renamed`
- *"the Microsoft AI at Work Roadmap, formerly known as Microsoft 365 Roadmap"* — `ai-at-work-roadmap-doc`
- *"Starting August 18, 2026 … a simplified app name and icon, and a transition of the web app URL from m365.cloud.microsoft to copilot.cloud.microsoft"* — `copilot-app-unified-announce`
- *"…the Office 365 Roadmap URL will automatically redirect to the new page."* — `m365-roadmap-live`

### Notes on evidence

- **Dates record when a change took effect, not when it was announced.** The app rename uses 18 August 2026 (when the rollout began) rather than 13 August (when MC1454108 was published).
- **`by` qualifier.** Used where a source proves a name was in use by a date without establishing first use: both 2023–24 Copilot flip-flops, the undated service rename, and the Office 365 Roadmap's start.
- **Undated evergreen pages.** The four Learn/Support pages carry no publish date. Each takes the date of the dated announcement that corroborates it rather than an invented one.
- **One non-Microsoft source.** `office-365-roadmap-archive` is an Internet Archive capture of Microsoft's own page — used because no first-party announcement of the Office 365 Roadmap's launch could be found. It establishes a `by` date only.

## Open risks

- The Copilot app's new icon may not yet exist in the MicrosoftCloudLogos collection. If not, the existing mark stays and the PR says so rather than substituting a lookalike.
- `microsoft-copilot-service` needs a third distinct Copilot mark; if none is available the distinct-marks test needs a deliberate decision, not a silent relaxation.
- The roadmap needs a mark that isn't an appropriated Microsoft product logo — one is drawn for the registry, establishing the pattern for future resource entries.
