# Footer fix, community issues, and The Boomerang Club

**Status:** approved · **Branch:** `claude/06249f8bab5a-footer-issues-boomerang`

## Problem

Three unrelated things, batched because they touch the same small site.

### 1. The footer wraps badly

`footer{display:flex;justify-content:space-between}` puts the long disclaimer and the meta line in two columns. The disclaimer squeezes the meta line, so *"Data as at 28 August **2026**"* orphans its year onto a second line.

The two pages also word the same fact differently: the registry says *"Dataset as of 28 Aug 2026."*, the analysis page says *"Data as at 28 August 2026"* — different phrasing **and** different date format, because `src/dates.js` `dateLabel()` uses `month: 'short'` while `src/analysis.js` `dateAsOf()` uses `month: 'long'`.

### 2. Four community issues are open on GitHub

Three are actionable; one is declined with evidence.

### 3. The Copilot saga has nowhere to live

The Copilot service is the only entry in the registry that abandoned a name and later took it back. Nothing on the Rebrand Forecast points at that.

## Flow

A visitor reaches the bottom of either page. The disclaimer sits on one line, the meta line on its own line below it, worded identically on both pages. Nothing orphans at any width.

On the Rebrand Forecast, between *Rename waves / Repeat offenders* and the Rebrand Risk Index, they meet **The Boomerang Club**: products that abandoned a name and later took it back. Today that is one product, and the section says so rather than pretending to be a list. Each member shows its round trip and how long the name was away.

## Acceptance criteria

### Footer

- [ ] `footer` is a block layout at every width; the two paragraphs stack.
- [ ] Both pages render exactly `Contribute on GitHub · Data as at 28 Aug 2026`.
- [ ] No orphaned year, and no horizontal overflow at 380px.
- [ ] The analysis page's prose sentences keep the long-month format — they are sentences, not meta lines.

### Data

- [ ] `configuration-manager` gains a first period `Systems Management Server`, starting `1994-11-07` (day, `released`), ending at the existing `2007-11`.
- [ ] A new entry `microsoft-account` exists with four periods: `Microsoft Passport` (`2000-03`, `by`) → `.NET Passport` (`2002-09`, `by`) → `Windows Live ID` (`2006-11`, `by`) → `Microsoft account` (`2012-05-02`, day, `announced`).
- [ ] A new entry `windows-app` exists with two periods: `Microsoft Remote Desktop` (`2013-10-21`, day, `released`) → `Windows App` (`2024-09-19`, day, `generally available`).
- [ ] No Intune change.
- [ ] Every new period cites at least one source; every new source resolves.

### The Boomerang Club

- [ ] `analyseRegistry()` returns a `boomerangs` array: for each product with a repeated period name, the product name and family, the repeated name, the full sequence of names, and the gap in months between the first period ending and the second beginning.
- [ ] The section renders after the *Rename waves / Repeat offenders* split and before the Rebrand Risk Index.
- [ ] Heading is `The Boomerang Club` with eyebrow `Exclusive membership`; the membership count in the intro is generated from the data, not hard-coded.
- [ ] Each member shows the repeated name with a `↩ Returned to this name` pill (shape + words, never colour alone), the journey, and the gap.
- [ ] Empty state: `○ No product has yet reused one of its own names.`
- [ ] Journey arrows are `aria-hidden`; the sequence is readable as text by a screen reader.
- [ ] No horizontal overflow at 380px.

### Tests and counts

- [ ] Pinned counts in `tests/data.test.js` and `tests/analysis.test.js` recomputed, not loosened.
- [ ] The pinned Configuration Manager period sequence gains Systems Management Server at the front.
- [ ] `README.md` headline counts match.
- [ ] New tests cover `boomerangs` (populated and empty), the Boomerang Club markup, and the identical footer meta line on both pages.

## Non-goals

- **No Intune change.** Microsoft's own FAQ says Intune was never renamed — MEM was an umbrella over Intune *and* ConfigMgr. ConfigMgr genuinely was renamed and the registry already records it.
- **No Windows Remote Desktop client entry.** That app was *replaced and retired*, not renamed — a transformation the scope note excludes. Only the macOS/iOS app was renamed.
- **No Office pre-cloud history, no Windows NT branding** (issue #2's other two points): lineage questions about non-cloud products.
- **No `Microsoft Passport Network` period.** Believed to have existed around 2006, but no first-party source could be found, so it is dropped rather than guessed.
- **No per-product anchors** on the registry page for linking from the Boomerang Club. Deferred.
- **No automatic issue closing.** Replies are drafted for review and posted only on explicit approval.

## Sources

| id | Title | Publisher | Published |
|---|---|---|---|
| `sms-1994-release` | 20 Years Of SMS/Configuration Manager | Microsoft Learn | 2014-11-07 |
| `configmgr-at-25` | ConfigMgr at 25 | Microsoft 365 Blog | 2017-09-26 |
| `passport-2000-archive` | Microsoft Passport — archived capture of passport.com | Internet Archive | 2000-03-01 |
| `net-passport-msdn` | Providing Secure Authentication Using Microsoft .NET Passport | Microsoft Learn | 2002-09-01 |
| `windows-live-id-2006` | Windows Live ID Adoption Solution in Microsoft.com | Microsoft Learn | 2006-11-15 |
| `microsoft-account-announce` | Cloud services for Windows 8 and Windows Phone: Windows Live reimagined | Windows Experience Blog | 2012-05-02 |
| `remote-desktop-apps-2013` | Microsoft Remote Desktop Apps for iOS, Mac OS X, and Android available for download | Microsoft Community Hub | 2013-10-21 |
| `windows-app-rename` | Windows App update for Remote Desktop on iOS and macOS | Microsoft Community Hub | 2024-08-12 |
| `windows-app-ga` | Windows App now available on all major platforms | Windows IT Pro Blog | 2024-09-19 |

Load-bearing quotes:

- *"On the 7th of November 1994, a little product called Systems Management Server (SMS) 1.0 was released."* — `sms-1994-release`
- *"Microsoft Passport: A single name, password and wallet for the web!"* — `passport-2000-archive` (page title, 1 March 2000)
- *"In an upcoming update for Remote Desktop on iOS and macOS, the client will have a new name: Windows App!"* — `windows-app-rename`

### Notes on evidence

- **Dates record when a change took effect.** The Windows App rename uses 19 Sep 2024 (GA) rather than 12 Aug 2024 (announcement).
- **`by` qualifier** is used for the three Passport-era periods: each source proves the name was in use by that month without establishing first use.
- **One archive source.** `passport-2000-archive` is an Internet Archive capture of Microsoft's own page, following the precedent set by `office-365-roadmap-archive`. It establishes a `by` date only.

## Open risks

- **`windows-app` has no real mark.** MicrosoftCloudLogos carries only `windows/windows.jpg`, and the registry accepts PNG and SVG only; no image tooling is available in this environment to convert it. A placeholder is drawn for the registry and flagged in the PR for replacement with the real icon.
- `microsoft-account` uses the Microsoft corporate mark, which is what the sign-in experience actually shows.
