# In Parallel — Interactive World History Explorer

**Implementation specification · v1.0 · 10 November 2026**  
**Target:** the existing personal website at `chrisquinn.ie`  
**Preferred public URL:** `/history/` (or an existing route convention in the repository)  
**Historical coverage:** 10,000 BCE through 1999 CE  
**Dataset:** `data/history-events.csv` — **647** curated records, **14** region tracks, **8** event categories  
**Reference:** `reference/previous-explorer.html` and screenshots in `reference/`

> **Agent instruction:** Implement this as a first-class feature inside the **existing** website, not as a new standalone website. Inspect the repository before changing its configuration. Reuse the site's installed framework, router, UI components, typography and CI/CD conventions. The current preferred architecture is Vite + React + TypeScript + Tailwind + shadcn/ui, deployed to GitHub Pages; if the repository differs, follow reality rather than replacing the stack. Preserve all existing routes and site content. Start with the supplied CSV; do not regenerate or rewrite historical entries through an LLM.

## 1. Product goal

Create a fast, attractive, interactive historical **comparison tool**: a visitor can inspect the same point in time across multiple geographic regions, understand what major events occurred near one another, and open an appropriate Wikipedia article for further reading.

This is **not** 14 independent chronologies. **The shared horizontal time axis is the primary interaction**. Visitors should be able to ask: "What else was happening elsewhere when the Easter Rising occurred?" or "What was happening in Ireland when the Roman Empire existed?"

The standalone reference HTML captures the current aesthetic and interaction model. Rebuild its behaviours in proper React components; **do not** simply paste its complete HTML into an iframe or page, and do not rely on the old JS object embedded in that reference. The supplied CSV must power the experience.

### Primary success criteria

- Browse 12,000 years without losing the synchronisation across regions.
- Select any event, read a concise summary and open its specific Wikipedia article.
- Compare regions for the same year/century without misleading users into believing undated processes happened on an exact day or year.
- Work on desktop, tablet and mobile and survive a direct refresh of the route on GitHub Pages.
- Make it straightforward to append new events to the CSV without touching UI code.

## 2. Delivery scope

### P0 — required for launch

1. Site integration: live `/history/` route; consistent back-to-site navigation; existing site deployment succeeds.
2. Data-driven loading from `data/history-events.csv`, with parsing, validation and graceful failure handling.
3. Six era presets and a globally shared time axis; responsive multi-track timeline with coloured event marks.
4. Event selection in timeline and comparison grid; event details panel with region, date, category, summary, approximate-date indication and **direct Wikipedia link**.
5. Search, category filtering, region selection, zoom in/out, pan/previous-next navigation and jump-to-year.
6. Comparison grid: columns represent visible regions; rows are shared years or time buckets appropriate to the scale.
7. Accessible keyboard and touch interaction; usable at common mobile widths.
8. Tests for date handling, filters, data integrity and critical user flows; build/deployment instructions.

### P1 — strongly desirable

- Shareable URL state, e.g. `/history/?era=modern&year=1916&event=evt_...` and restored filters/visible range.
- A "See same-period events" group near the selected event, across _other_ regions, clearly labelled as temporal proximity, **not a proven causal relationship**.
- Event clustering/stacking when many events land on the same pixel or year.
- Mobile comparison mode that allows selecting 2–4 regions for legible side-by-side viewing.
- A reduced-motion mode and polished focus states, loading skeleton and empty-state copy.

### P2 — **not** part of the initial build

- Curated event-to-event causal relationship graph (would require an additional reviewed relationships dataset).
- Admin/CMS, user accounts, commentary submissions, AI-generated event text, APIs or a database.
- Wikipedia extracts or article previews fetched on the fly.
- Multilingual content, localisation of sources, crowd editing or offline article caching.

## 3. Dataset contract

**Canonical file:** `data/history-events.csv`. Use it as a versioned, local static asset. Keep it in the repo under `public/data/history-events.csv` or `src/data/history-events.csv` depending on the build approach.

**Exactly 647 rows** in the supplied baseline. These are a **curated selection**, not every major event in world history. All 647 rows have a `wikipedia_url`. The links have been format-checked, **not manually confirmed to resolve to live/relevant Wikipedia pages**. Keep a future content-review process separate from engineering validation.

| CSV field           | Type                  | Required | Meaning / handling                                                                                       |
| ------------------- | --------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `event_id`          | string                | Yes      | Stable unique identifier. Use as React key and URL event identifier; never use array index as public ID. |
| `year`              | signed integer        | Yes      | Negative = BCE; positive = CE; **no year zero**. Examples: `-10000`, `-500`, `1066`, `1916`.             |
| `display_year`      | string                | Yes      | Human-readable date from source, e.g. `10,000 BCE`; render with `c.` prefix when `approx` is true.       |
| `lane`              | enum                  | Yes      | Geographic track key. Values below. Not a claim of continuous nationhood.                                |
| `cat`               | enum                  | Yes      | Event category. Values below.                                                                            |
| `title`             | string                | Yes      | Concise event name.                                                                                      |
| `note`              | string                | Yes      | Short human-readable context / interpretation.                                                           |
| `approx`            | boolean-like CSV text | Yes      | `True` / `False`. Parse explicitly to boolean.                                                           |
| `wikipedia_url`     | HTTPS URL             | Yes      | Open the **supplied URL** for the event; no fuzzy title search by default.                               |
| `wikipedia_article` | string                | Yes      | Wikipedia page label.                                                                                    |
| `source`            | enum                  | Yes      | `original` (prior 1800–1999 set) or `expanded` (later curation); not a verification status.              |

**Regions (ordered for display):**

1. Ireland
2. Britain — label `Britain / England`
3. Germany — label `Central Europe / Germany`
4. France — label `Gaul / France`
5. Russia — label `Eastern Europe / Russia`
6. USA — label `North America / USA`
7. China
8. Asia — label `East & SE Asia`
9. South Asia — label `India / South Asia`
10. Mediterranean — label `Mediterranean / Rome`
11. Middle East
12. Africa — label `Africa / Egypt`
13. Americas — label `Americas (other)`
14. Europe — label `Wider Europe`

**Categories:** `politics`, `conflict`, `rights`, `society`, `culture`, `economy`, `technology`, `crisis`. Suggested labels: Politics, War / conflict, Rights / reform, Society, Culture, Economy, Technology, Crisis.

**Important:** Rows may share the same year and the same Wikipedia article. Do not deduplicate by article URL or year. The dataset has no year 0, no empty required fields, and no duplicate `(year, lane, title)` triplets as delivered.

### Types and parsing

```ts
export type Lane =
  | 'Ireland'
  | 'Britain'
  | 'Germany'
  | 'France'
  | 'Russia'
  | 'USA'
  | 'China'
  | 'Asia'
  | 'South Asia'
  | 'Mediterranean'
  | 'Middle East'
  | 'Africa'
  | 'Americas'
  | 'Europe'

export type EventCategory =
  'politics' | 'conflict' | 'rights' | 'society' | 'culture' | 'economy' | 'technology' | 'crisis'

export type HistoricalEvent = {
  id: string // CSV event_id
  year: number
  displayYear: string
  lane: Lane
  category: EventCategory
  title: string
  note: string
  approximate: boolean
  wikipediaUrl: string
  wikipediaArticle: string
  source: 'original' | 'expanded'
}
```

Use a mature CSV parser (e.g. Papa Parse or D3 DSV), or a properly tested equivalent, **not** `split(',')` or `split('\n')`: the file contains commas, quotes and non-ASCII text. Trim enum fields but **do not mutate original event titles or notes**. Parse `approx` only from case-insensitive `true`/`false`, and reject unknown values. Validate `year` as an integer inside `[-10000, -1] ∪ [1, 1999]`, `event_id` uniqueness, valid enums, non-empty title/note, and HTTPS Wikipedia URLs. Handle parse errors visibly and report line numbers in development.

**GitHub Pages note:** for public assets, build the path with Vite's `import.meta.env.BASE_URL`, e.g. `fetch(`${import.meta.env.BASE_URL}data/history-events.csv`)`. Never assume the project deploys at domain root. If importing the CSV as a string at build time, retain a single source file and document the approach.

### Year numbering and precision

- **Never show year 0.** Historical chronology goes from **1 BCE to 1 CE**. Negative numbers represent BCE in this CSV, but differ from astronomical year numbering.
- If working with continuous axis coordinates, convert to an internal astronomical coordinate: `toAxisYear(y) = y < 0 ? y + 1 : y`. Thus `1 BCE (-1) -> 0` and `1 CE (1) -> 1`; these are adjacent years. Do not use the raw signed year as a spacing metric across the boundary without this adjustment.
- For an inverse: `fromAxisYear(n) = n <= 0 ? n - 1 : n` for **integer** axis years.
- Use authored `display_year` for event labels, prefix `c. ` when `approx === true` (the supplied display strings intentionally omit `c.`), and make uncertainties visible in tooltip/detail.
- A prehistoric entry may represent a long process with an indicative date. Do not infer start/end dates that are absent from the data.
- A blank region-year means **no curated entry**, not "nothing happened".

## 4. Eras and initial state

| ID            | Display      | Bounds in CSV year values          | Initial focus |
| ------------- | ------------ | ---------------------------------- | ------------- |
| `prehistoric` | Prehistory   | -10000 through -3001               | -7000         |
| `ancient`     | Ancient      | -3000 through -501                 | -1600         |
| `classical`   | Classical    | -500 through 499; excluding year 0 | 43            |
| `medieval`    | Medieval     | 500 through 1499                   | 1066          |
| `early`       | Early modern | 1500 through 1799                  | 1649          |
| `modern`      | Modern       | 1800 through 1999                  | 1916          |

**Initial view:** `modern`, focus 1916, eight core lanes selected: Ireland, Britain, Germany, France, Russia, USA, China and Asia. Older eras may default to all 14 lanes. The focus year should be visibly marked. Selecting a different era resets the visible time range to the era's full bounds, and shows an event near the era's focus year if available. If no event exists in focus, show the year without fabricating a selection.

**Zoom:** offer buttons and optional wheel/pinch support. Zoom around the focus year (or pointer where appropriate), clamp to the global available bounds and retain selected event if still visible. Pan/previous-next controls must preserve a legible scale and never leave the dataset range. A "Reset era" action should be discoverable.

### Suggested scale-sensitive comparison grid

Use the following as the baseline (can improve UX without changing data):

| Focus range           | Comparison bucket |
| --------------------- | ----------------- |
| 1800–1999 CE          | 1 year            |
| 1500–1799 CE          | 5 years           |
| 500–1499 CE           | 20 years          |
| 500 BCE–499 CE        | 50 years          |
| 3000–501 BCE          | 200 years         |
| Earlier than 3000 BCE | 500 years         |

Display 7–11 nearby buckets centred on focus, with the current bucket highlighted. Each bucket spans a period rather than claiming that every event happened in the exact displayed starting year. Correctly handle buckets across the BCE/CE boundary without showing `0 CE` or a nonsensical `0 BCE`.

## 5. Screen composition and interaction design

Keep the distinctive dark editorial look of the reference HTML, **unless the existing site design system already establishes a coherent style**. Prioritise responsiveness and consistency with the personal site over pixel-perfect mimicry.

### Desktop hierarchy

1. **Header / identity:** `In Parallel` title, one-line thesis, links back to the personal site.
2. **Small stats:** curated event count, visible-region count, historical span (all derived from data).
3. **Era navigator:** six equally discoverable tabs/buttons showing period labels and date ranges.
4. **Toolbar:** search, category select, region multi-select, zoom controls, pan controls, jump-to-year, reset view, current visible count.
5. **Main body:** a wide multi-lane shared-axis timeline (primary); event details sidebar (secondary, approximately 300–360 px).
6. **Comparison section:** a horizontally scrollable region-by-time grid, with selected period highlighted and event rows/buttons.
7. **Method note:** dates, geographic labels, Wikipedia/editorial cautions.

### Timeline

- The **x-axis** encodes time consistently for every lane, never separate independent charts.
- The **y-axis** lists visible lanes in stable order; use distinct accessible colours and labelled rows.
- Points mark dated events. Slight vertical offsets or clustering can separate overlapping events **without changing their horizontal time**.
- Hover/focus/tap displays title, date and region. Click/Enter/Space selects an event.
- A vertical guide indicates selected/focus year. Visual emphasis on the selected event should be unambiguous.
- SVG, Canvas with DOM overlays, or a proven React charting library are acceptable; ensure pointer targeting, accessibility and zoom performance. An SVG or layered HTML + SVG solution is likely sufficient for ~647 events.
- For mobile, prefer a **horizontal scrollable timeline with clearly labelled lanes**; do not shrink 14 rows until unreadable. Sticky lane labels or a region selector can help.
- Accessible fallback: the comparison grid must make all visible events discoverable without relying exclusively on an SVG pointer target.

### Selected event detail panel

Required information:

- Date: `c.` prefix for approximate events.
- Event title and description (`note`), region, category.
- Primary external link with readable text e.g. **"Read on Wikipedia — [article title]"**.
- On click: open `wikipedia_url` in a new tab (`target="_blank" rel="noopener noreferrer"`), with standard link semantics and indication it is external.
- Other events around the same period (different regions, nearest by time), clearly described as **concurrent or nearby**, not necessarily related causally.
- Selected state should sync with markers and grid cells. On mobile, show details below the timeline or in an accessible sheet/dialog; do not require hovering.

If a link fails, the existing link should remain visible and a secondary **"Search Wikipedia for event title"** may be offered. Do not silently replace curated URLs with an automatic search link.

### Search and filtering

- Case-insensitive text search across `title`, `note`, `lane`, `wikipedia_article` and year-as-text.
- Show a compact list of matched events with date/region; selecting a result travels to its era, shows its lane, sets focus and opens details.
- Region multi-select with select all / core eight / clear convenience actions; avoid a truly blank view without helpful guidance.
- Category select: All + eight known categories.
- Display number of **visible matching events** and distinguish total dataset count.
- Filtering should not silently rewrite the data or imply that unavailable results did not happen.
- Define a consistent rule for selected-event state when filters hide it (either clear selection or preserve it with a visible "Hidden by filters" indication; test this).

### Responsive layout

- **Wide desktop:** multi-column timeline + sticky or adjacent details panel; comparison grid below.
- **Tablet:** narrower sidebar or stacked detail panel, toolbar wrapping, smaller era controls.
- **Mobile (~320–430 px):** readable heading, horizontally scrollable era tabs, condensed toolbar, scrollable timeline or dedicated 2–4-lane comparison selection, event detail below, no viewport-wide overflow.
- Tap targets >=44px where practicable; avoid hover-only affordances. Make horizontal scrolling obvious.

### Look and feel

Reference palette is a restrained navy / jade editorial UI, not a rainbow dashboard:

- background `#0b1523`
- panels `#111f31` / `#17283c`
- body text `#ecf2f5`
- muted text `#91a6b9`
- main accent `#74e6ba`
- dividers `#304357`

Use existing site fonts/tokens where available; do not require a remote font file for functionality. Keep region colours consistent across graph, legend, filters and grid. Include dark-mode-appropriate contrasts and visible keyboard focus.

## 6. Suggested React architecture

Adapt these names to existing repository conventions rather than forcing a restructure:

```text
src/
  features/history/
    HistoryPage.tsx               # route composition, page metadata
    components/
      EraNavigator.tsx
      TimelineToolbar.tsx
      RegionFilter.tsx
      HistoryTimeline.tsx
      EventDetails.tsx
      ComparisonGrid.tsx
      SearchResults.tsx
    hooks/
      useHistoryState.ts          # URL synchronisation, zoom, focus, selection
    lib/
      parseHistoryCsv.ts          # parser + runtime validation
      chronology.ts               # no-year-zero conversions and era logic
      filters.ts
      proximity.ts                # temporal neighbours, not causal links
    historyConfig.ts              # era definitions, lane metadata, labels
    types.ts
    __tests__/...
public/
  data/
    history-events.csv           # copy supplied CSV here
```

Data is static and versioned; a backend, database or CMS is unnecessary. Parsing should happen once and be memoised. Render only visible event markers within the active range; optionally add spatial clustering if density causes overdraw. URL query parameters should include stable `event_id` rather than an array index.

**State shape suggestion:** `era`, `rangeStart`, `rangeEnd`, `focusYear`, `selectedEventId`, `selectedLanes`, `category`, `query`. Derive results rather than maintaining divergent copies of filtered arrays in state.

**React/SPA deployment:** use the existing router and GitHub Pages configuration. If serving from a subdirectory, ensure `base` and assets respect its path. If GitHub Pages cannot serve client-side deep links on refresh, add a static `404.html` redirect fallback or the app's established equivalent, or use a routing strategy already supported by the project. Do not change the top-level site URL structure without checking existing code.

## 7. Wikipedia and source policy

1. Use `wikipedia_url` from the CSV for the actual event hyperlink; use `wikipedia_article` for accessible label/copy.
2. Always visually mark Wikipedia as an **external reference**, not a locally curated or verified historical source.
3. Do **not** fetch, scrape or embed page HTML to render the timeline; the CSV supplies all necessary display content.
4. Do **not** silently call events causally related because they are close in time. A future relationship feature must store evidence-backed, typed links separately (e.g. `event_id`, `related_event_id`, `relationship_type`, `explanation`, `citation_url`).
5. Editorial copy must explain that labels such as **Russia, Germany, USA and China** are geographic comparison tracks for eras when those modern states did not yet exist. Prehistoric dates are often approximate.
6. Keep the CSV and UI escaped/sanitised; Wikipedia URLs should be validated as HTTPS URLs on `en.wikipedia.org`, not arbitrary strings inserted as executable HTML.

## 8. Accessibility, quality and performance

- Use semantic page landmarks, proper heading order, labelled controls and a navigable keyboard tab order.
- Era buttons expose active state (`aria-pressed` or tab semantics), dropdowns have accessible labels, selected event states are announced.
- SVG marks or interactive overlays need meaningful accessible names (date, region, title). Provide a grid/list fallback for nonvisual navigation.
- Ensure focus moves predictably when picking a search result or closing a mobile detail sheet.
- Do not force smooth scrolling or animation when `prefers-reduced-motion` is active.
- Desktop target: timeline and filters feel instantaneous on the supplied 647 rows, with no expensive complete DOM reconstruction on pointer move.
- Mobile: no forced horizontal overflow of the entire page and no tiny untappable event controls.
- Metadata: unique title and description; canonical URL consistent with site's approach; avoid indexed duplicate URLs due to query-string state.
- Avoid analytics, cookies or third-party scripts unless the site already uses them.

## 9. Acceptance tests / definition of done

The work is finished when **all P0 checks** below pass:

| ID  | Test                                               | Expected result                                                                        |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A01 | Load `/history/` directly and reload               | Page loads on deployed GitHub Pages without a 404 or broken CSV request.               |
| A02 | Parse supplied data                                | Exactly 647 valid events, 14 region enums, 8 categories; all event IDs unique.         |
| A03 | Default page load                                  | Modern era, focused on 1916, eight core lanes visible.                                 |
| A04 | Select 1916 Easter Rising event                    | Ireland marker highlighted; title/details/year shown; correct Wikipedia URL clickable. |
| A05 | Pick a different country's same-year event         | Same shared time alignment; details update without changing coordinate system.         |
| A06 | Navigate to Prehistory                             | Displays entries around 10,000 BCE and makes approximate dates explicit.               |
| A07 | Navigate to Classical and inspect 1 BCE / 1 CE     | No year zero; date formatting and axis order correct.                                  |
| A08 | Search by title or year, select a result           | Travels to correct era/region/date and opens selected detail.                          |
| A09 | Filter category and deselect regions               | Timeline, count and grid update consistently; clear empty-state handling.              |
| A10 | Zoom + pan across era boundaries                   | Focus stays valid, ticks remain legible, no negative-year formatting errors.           |
| A11 | Click detail Wikipedia link                        | Opens the CSV's `wikipedia_url` in a new tab with secure external-link attributes.     |
| A12 | Keyboard-only                                      | User can reach and select timeline events, filters and Wikipedia links.                |
| A13 | Mobile viewport 375 px                             | Toolbar remains usable; no page-width overflow; event details can be opened by touch.  |
| A14 | Run existing repo lint, tests and production build | Pass without breaking current site routes or assets.                                   |
| A15 | Edit CSV to add a well-formed event and rebuild    | New event appears in correct region/date without hand-editing UI code.                 |

Additional tests: CSV escaping for quoted titles and comma-containing notes; malformed `approx`; malformed Wikipedia URL; duplicate `event_id`; invalid lane/category; consecutive 1 BCE → 1 CE; overflow at 10,000 BCE and 1999 CE; events with same year/lane; empty filtered results; direct URL into a selected event (if P1 implemented).

## 10. Implementation sequence for agent

**Step 1 — Inspect:** identify the existing repo's Vite base, router, typography, UI primitives and GitHub Pages deployment. Report in brief which existing components/config you will reuse.

**Step 2 — Data layer:** place CSV in repo, implement typed parsing/validation, build tests. Keep the exact titles, notes and URLs. Avoid event deduplication.

**Step 3 — Page shell:** add `/history/` page, navigation and visual layout consistent with the site, matching the reference's hierarchy.

**Step 4 — Core visualisation:** implement single coordinated axis, era tabs, region tracks and event selection, with correct BCE/CE axis conversion.

**Step 5 — Controls + comparison:** search, filters, zoom/pan/year jump, grid, synced event detail and Wikipedia links.

**Step 6 — Mobile + accessibility:** improve touch hitboxes, keyboard access, legible multi-region comparisons and reduced-motion behaviour.

**Step 7 — Verify + ship:** run dataset validation, unit/integration tests, project production build, test route refresh on deployment, then document URL and key implementation decisions.

### Final agent deliverables

- Working history explorer integrated into the existing repository.
- CSV present as a static data asset, **not** hardcoded event arrays in components.
- Automated tests for chronology and CSV parsing, and basic interaction tests.
- A brief README note on updating events and deploying to GitHub Pages.
- A short implementation report: deployed URL (if deployed), files changed, tests run, known limitations and recommended P1 follow-ups.

## 11. Content and project notes

- The original comparison scope was Ireland, England/Britain, Germany, France, Russia, USA, China and Asia. The expanded explorer adds South Asia, Mediterranean, Middle East, Africa, Americas and wider Europe for historical context.
- Some modern-era entries were also added during expansion; hence 381 events currently fall in the modern era, compared with the initial 348-event 1800–1999 dataset.
- Do not represent Wikipedia articles as peer-reviewed source verification. Existing URLs may redirect, be broad overview pages or need human editorial review.
- Be clear that comparison is based on **time and place**, and that causal links need separate research.
- Preserve `source` for editorial provenance but do not surface it as a factual quality rating.
- This build should be approachable and explorable, not merely a raw large table.

---

## 12. Copy-paste kickoff for the development agent

> Build **In Parallel**, a 10,000 BCE–1999 CE interactive historical timeline feature on my existing personal site. Read `BUILD_SPEC.md` fully and use `data/history-events.csv` as the only source of event content. Inspect my repo before changing anything; integrate under `/history/` using the existing Vite/React/TypeScript/Tailwind/shadcn and GitHub Pages conventions where present. Recreate the major interactions from `reference/previous-explorer.html`, but implement them as maintainable components rather than an iframe. Prioritise the shared time axis, responsive country/region comparison, accurate BCE/CE handling, direct per-event Wikipedia links, event search/filters, zoom/era navigation and test coverage. Preserve the rest of the site. Complete all P0 acceptance tests and report any limitations.
