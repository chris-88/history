# CLAUDE.md

Guidance for the development agent working on this project. Read this fully before making changes, and treat the **Definition of Done** as the bar for every task.

## What this is

**In Parallel**, a comparative world-history explorer at `https://history.chrisquinn.ie`. One shared time axis from 10,000 BCE to 1999 CE, 14 regional tracks, 647 curated events, each with a Wikipedia article. The point is comparison: what else was happening elsewhere at the same moment. It is a static site with no backend; the dataset is a versioned CSV in `public/data/`.

Product spec and acceptance tests: `docs/BUILD_SPEC.md`. The previous standalone prototype is in `docs/reference/` as a visual and functional guide only; its embedded data is stale and must never be used.

**Stack:** Vite + React + TypeScript · Tailwind v4 + shadcn/ui (Base UI) · TanStack Query + Zod + Papa Parse · React Router (HashRouter) · Vitest + Testing Library · GitHub Pages via GitHub Actions.

## Operating philosophy: lean surface, high floor

1. **Keep the surface lean.** No speculative features, abstractions or dependencies. Every new library needs a concrete, present need.
2. **Keep the floor high.** Strict types, tests, lint, CI gates, accessibility and real error handling are baseline from the first commit. Restraint governs scope, never craft.

When these tension, craft wins.

## Definition of Done

- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm run test` all pass.
- [ ] New or changed logic has tests (behaviour, not implementation detail).
- [ ] Every async UI has explicit **loading, error and empty** states.
- [ ] External input (the CSV, URL params) is validated with Zod or an equivalent parser at the boundary.
- [ ] UI is keyboard-navigable and accessible (labels, focus, roles, 44 px touch targets).
- [ ] No secrets in client code. There are none in this project; keep it that way.
- [ ] Commit follows Conventional Commits. The diff is focused.

## Domain rules (do not break these)

- **No year zero.** CSV years are signed (`-1` is 1 BCE, `1` is 1 CE). Anything that measures distance or draws an axis uses `toAxisYear` / `fromAxisYear` from `src/features/history/lib/chronology.ts`. Never show `0 CE` or `0 BCE`.
- **The CSV is the only source of event content.** Never hardcode events, never regenerate text with an LLM, never deduplicate rows by year or article. Titles and notes are rendered exactly as authored; `c.` is prefixed only when `approx` is true.
- **Wikipedia links are the supplied `wikipedia_url`**, opened with `target="_blank" rel="noopener noreferrer"` and marked external. Never substitute a search link silently.
- **Proximity is not causation.** "Elsewhere around this time" means nearby in time, and the copy says so.
- **Regions are geographic tracks**, not claims of continuous nationhood. The method note explains this.

## Project structure

```
public/data/history-events.csv     # the dataset (edit here to add events)
src/
  components/ui/                   # shadcn components (CLI-managed; lint ignores them)
  components/ErrorBoundary.tsx
  config/site.ts
  features/history/
    HistoryPage.tsx                # route composition
    historyConfig.ts               # eras, lanes, colours, labels, dataset bounds
    types.ts
    lib/                           # pure, tested: chronology, parser, filters, proximity, grid, navigation, urlState
    hooks/                         # useHistoryEvents (TanStack Query), useHistoryState (URL-backed state)
    components/                    # EraNavigator, TimelineToolbar, RegionFilter, HistoryTimeline, EventDetails, ComparisonGrid, SearchResults, ...
  test/                            # setup and fixtures
docs/                              # spec, handoff note, reference prototype
```

All explorer state lives in the URL hash query (`#/?era=…&year=…&event=…&lanes=…&cat=…&q=…&from=…&to=…`), so every view is shareable and refresh-safe on Pages.

## Adding events

Append a row to `public/data/history-events.csv` with a unique `event_id`, a signed `year` with no zero, the region `lane` and `cat` from the enums in `src/features/history/types.ts`, `approx` as `True` or `False`, and an `https://en.wikipedia.org/wiki/…` URL. `npm test` validates the whole file (row count aside) and fails on any bad row with its line number. No UI change is needed.

## Commands

```bash
npm run dev            # local dev server
npm run build          # type-check + production build
npm run preview        # serve the production build
npm run typecheck      # tsc
npm run lint           # oxlint
npm run format         # prettier --write
npm run format:check
npm run test           # vitest run
npm run test:coverage
npx shadcn@latest add <component>
```

## Deployment

Push to `main`. `.github/workflows/deploy.yml` runs typecheck, lint, format check and tests, then builds and publishes to GitHub Pages at the custom domain in `public/CNAME`. The DNS record is a CNAME `history` → `chris-88.github.io` on Cloudflare (DNS only, not proxied).

## Do not

- Show a year 0, or use raw signed years as a distance.
- Fetch, scrape or embed Wikipedia pages; the CSV supplies all display content.
- Add analytics, cookies or third-party scripts.
- Hand-roll a component shadcn already provides.
- Land code with failing types, lint, format or tests.
