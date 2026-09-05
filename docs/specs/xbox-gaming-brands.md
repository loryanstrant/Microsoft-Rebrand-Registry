# Xbox enters the registry, and the registry stops being about the cloud

**Status:** approved · **Branch:** `claude/6f4a58e2fb74-rebrand-registry-xbox`

## Problem

Xbox appears nowhere in the registry. `grep -ri xbox` across the repository returns nothing — no entry, no source, no logo, no mention in either page.

That is not an oversight so much as a boundary. The site describes itself as *"Microsoft **cloud** branding, properly excavated"*, and every one of the 76 products is a cloud or productivity product. Xbox has some of the most-renamed brands Microsoft owns, and none of them qualified.

The boundary is now judged to be the wrong one. The registry tracks what Microsoft called things; there is no principled reason that stops at the cloud.

## Approach

Two changes in one pass, because the second is what makes the first legitimate:

1. **Drop the cloud framing** from the hero heading, both page meta descriptions, the README opening, and the scope note.
2. **Add five Gaming entries** covering thirteen name periods, all first-party sourced where a first-party source exists.

A new `family` value, `Gaming`, carries them. No code changes: the family filter, the letter navigation and the analysis page all derive their options from the data.

## Flow

A visitor opens the registry. The heading no longer promises cloud products. The **Product family** filter has a new **Gaming** option; choosing it shows five rows — the console line, the network, and the three Game Pass subscriptions — rendered exactly like every other row, with the same duration bars, evidence links and `● Current` / `○ Former` badges.

On the Rebrand Forecast, **Gaming** joins the family table with enough completed renames to be rated on evidence rather than flagged as sparse. `Xbox Live` enters the statistics as one of the longest-lived names in the whole dataset.

## Acceptance criteria

### Data

- [ ] A new entry `xbox-console` exists with four periods: `Xbox` (2001-11-15) → `Xbox 360` (2005-11-22) → `Xbox One` (2013-11-22) → `Xbox Series X|S` (2020-11-10), all day precision, all `launched`.
- [ ] A new entry `xbox-network` exists with two periods: `Xbox Live` (2002-11-15, day, `launched`) → `Xbox network` (2021-03, month, `by`).
- [ ] A new entry `xbox-game-pass-essential` exists with three periods: `Xbox Live Gold` (2005-09-08, `announced`) → `Xbox Game Pass Core` (2023-09-14, `effective`) → `Xbox Game Pass Essential` (2025-10-01, `effective`).
- [ ] A new entry `xbox-game-pass-premium` exists with two periods: `Xbox Game Pass Standard` (2024-09-10, `launched`) → `Xbox Game Pass Premium` (2025-10-01, `effective`).
- [ ] A new entry `pc-game-pass` exists with two periods: `Xbox Game Pass for PC` (2019-06-09, `launched`) → `PC Game Pass` (2021-12-09, `announced`).
- [ ] All five carry `"family": "Gaming"`. None is a `resource`.
- [ ] `xbox-console`, `xbox-network` and `xbox-game-pass-essential` each carry a `note`.
- [ ] Every new period cites at least one source; every new source resolves over HTTP.
- [ ] `asOf` is bumped to the implementation date.

### Logos

- [ ] Five real Microsoft marks, sourced from Wikimedia Commons, land in `src/assets/logos/` as SVG.
- [ ] Each `logo.alt` contains its entry's `name` verbatim, and each `logo.source` is the Commons file page it came from.

### Interface and copy

- [ ] `Gaming` appears in the **Product family** filter, and `X` in the letter navigation, with no code change.
- [ ] The word "cloud" is gone from the `index.html` hero heading, both meta descriptions, and the README opening — while the Microsoft Cloud Logos credits and the `Cloudy with a Chance of Rebrands` joke survive untouched.
- [ ] The scope note explains that consoles remain listed after they stop being sold, which is a documented exception to the "only things Microsoft still operates" rule.
- [ ] No horizontal overflow at 380px on either page.

### Tests and counts

- [ ] Pinned counts recomputed, not loosened: **81** products, **1** resource, **82** entries, **190** name periods, **158** sources, **108** renames.
- [ ] New tests pin the `xbox-console` and `xbox-game-pass-essential` period-name sequences, and assert the `Gaming` family's membership.
- [ ] `README.md` headline counts match the dataset.
- [ ] `npm run validate`, `npm test` and `npm run package` all pass.

## Non-goals

- **No codenames.** `Project xCloud`, `Project Scarlett`, `Project Scorpio` and `DirectX Box` are all left out. The registry records what Microsoft sold, not what it called a project internally.
- **No Xbox Cloud Gaming entry.** Without the `Project xCloud` period it has a single name and no rename to document, so it earns no row.
- **No Xbox app entry.** Investigated and rejected on the evidence: the Windows 10 Xbox app was *renamed* to Xbox Console Companion in 2019, and then a **separate, new** Xbox app *replaced* Console Companion in 2020, with the old app retired. That is a replacement, and the registry excludes replacements — the same reasoning that kept the Windows Remote Desktop client out.
- **No mid-generation console models.** Xbox 360 S and E, Xbox One S and X, and Xbox Series S sold *alongside* their generation rather than after it. Drawing them as sequential periods would assert a chronology that did not happen, and the validator rejects overlapping periods anyway.
- **No Xbox Game Studios, Xbox Insider Program or Xbox Game Bar.** Real rename histories, deliberately out of this batch.
- **No discontinued Xbox media brands.** Xbox Music, Xbox Video and Kinect were retired, not renamed.
- **No per-product detail pages or anchors.** Deferred twice already; the table row stays the unit of display.

## Sources

| id | Title | Publisher | Published |
|---|---|---|---|
| `xbox-launch-2001` | Xbox Manufacturing Underway for Nov. 15 Launch Date | Microsoft News Center | 2001-09-21 |
| `xbox-live-launch-2002` | Xbox Live Arrives in Stores, Sparking the Next Revolution in Video Games | Microsoft News Center | 2002-11-15 |
| `xbox-live-gold-2005` | Xbox Live Offers New Levels, Features and Premium Retail Packs to Supercharge Online Gaming Experiences on Xbox 360 | Microsoft News Center | 2005-09-08 |
| `xbox-360-launch-2005` | Microsoft Announces Xbox 360 Day One Launch Lineup | Microsoft News Center | 2005-11-14 |
| `xbox-one-launch-2013` | Xbox One is Biggest Launch in Xbox History | Xbox Wire | 2013-11-23 |
| `game-pass-pc-beta-2019` | E3 2019: How to Experience Xbox Game Pass for PC | Xbox Wire | 2019-06-09 |
| `xbox-series-launch-2020` | Power Your Dreams: Xbox Series X and Xbox Series S Now Available Worldwide | Xbox Wire | 2020-11-10 |
| `xbox-network-rename-2021` | Microsoft officially ends 'Xbox Live' brand, changes to 'Xbox network' | Windows Central | 2021-03-22 |
| `pc-game-pass-2021` | Coming Soon to Xbox Game Pass: Mortal Kombat 11, The Gunk, Broken Age, and More | Xbox Wire | 2021-12-14 |
| `game-pass-core-2023` | Introducing Xbox Game Pass Core, Coming This September | Xbox Wire | 2023-07-17 |
| `game-pass-standard-2024` | Xbox Game Pass Standard Is Here - How to Choose the Right Plan for You | Xbox Wire | 2024-09-10 |
| `game-pass-plans-2025` | Microsoft revamps Xbox Game Pass plans and hikes Ultimate to $29.99 a month | The Verge | 2025-10-01 |
| `xbox-network-terminology` | Xbox Network integration terminology | Microsoft Learn | 2019-03-18 |

Load-bearing quotes:

- *"Xbox will launch in North America on Nov. 15, 2001."* — `xbox-launch-2001`
- *"Today, more than 10,000 U.S. and Canadian retail outlets began selling the Xbox Live Starter Kit"* — `xbox-live-launch-2002`
- *"gamers can amplify their gaming experience with a 12-month Xbox Live Gold membership"* — `xbox-live-gold-2005`
- *"will be available when the video game and entertainment system launches in North America on Nov. 22"* — `xbox-360-launch-2005`
- *"Xbox One launched in 13 markets on Nov. 22 to great fanfare."* — `xbox-one-launch-2013`
- *"starting today, PC gamers can join the recently-announced Xbox Game Pass for PC (Beta)"* — `game-pass-pc-beta-2019`
- *"Game Pass Core is the evolution of Xbox Live Gold"* and *"launching on September 14"* — `game-pass-core-2023`
- *"Starting today, we are launching a new plan for Xbox Game Pass - Game Pass Standard."* — `game-pass-standard-2024`
- *"we had some news drop at The Game Awards last week and shared four new games coming to PC Game Pass on day one"* — `pc-game-pass-2021`
- *"Xbox network | The Xbox online game and entertainment network."* — `xbox-network-terminology`, from Microsoft's required-terminology table

### Notes on evidence

- **Two sources are not first-party, and both are deliberate.** Every Microsoft-owned avenue was checked for each.
  - **`xbox-network-rename-2021`.** Microsoft never announced this rename. The name changed inside the Microsoft Services Agreement and on support pages, with a statement given to press. Xbox Wire posts from March and May 2021 were checked and do not use the term. The Internet Archive was unavailable while this was written, so no dated capture could be taken. Windows Central's dated report is the citation of record, paired with Microsoft's own terminology list as proof the name is official.
  - **`game-pass-plans-2025`.** The Xbox Wire post announcing the Essential and Premium tiers is no longer reachable: every reported URL returns 404, and paging the whole `news.xbox.com/en-us/2025/10/` archive shows no post dated 1 October 2025 at all. The Verge's same-day report is used instead, again paired with the terminology list.
- **`xbox-network-terminology` is evergreen.** It is Microsoft's required-terminology list for developers, kept current — it lists `Xbox network`, `Xbox Game Pass Essential` and `PC Game Pass` today. It carries the page's own stated date rather than an invented one, and it is cited only as proof that a name **is** official, never as proof of **when** it became official.
- **Console dates are North American launch dates**, and each generation's period ends on the day the next generation launched. Consoles kept selling past that point; the name, for the purposes of this registry, did not stay the current one.
- **`PC Game Pass` is dated to The Game Awards**, 9 December 2021, where Microsoft announced it on its own channels. The citation is the Xbox Wire post five days later that refers back to that announcement and uses the new name throughout.
- **Xbox Live appears in one entry only.** The network entry holds it from 2002 to 2021; the subscription entry starts at `Xbox Live Gold` in 2005, so no name is claimed by two rows over the same years.

## Open risks

- **The scope change is one-way.** Dropping "cloud" makes every future scope argument easier to win. The scope note is rewritten rather than quietly left behind so the new boundary is at least stated out loud.
- **Console generations are recorded as name periods.** They are successive products rather than renames of one product, and the analysis page counts them as three renames. This is a deliberate editorial decision: the names changed, and the registry tracks names.
- **Logos come from Wikimedia Commons**, not from the Microsoft Cloud Logos collection that supplies every other entry — that collection is Azure-only and carries no Xbox marks. The footer disclaimer already covers Microsoft's ownership of the trademarks.
