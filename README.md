# In Parallel

A comparative world-history explorer: 647 curated events across 14 regional tracks, 10,000 BCE to 1999 CE, on one shared time axis, with a Wikipedia article for every milestone.

Live: https://history.chrisquinn.ie

```bash
npm install && npm run dev
```

## Updating events

The dataset is `public/data/history-events.csv`. Append a row (unique `event_id`, signed `year` with no year 0, `lane` and `cat` from the enums in `src/features/history/types.ts`, `approx` as `True`/`False`, an `https://en.wikipedia.org/wiki/…` URL). `npm test` validates the file and reports the line of any bad row. No UI change is needed.

## Deploying

Push to `main`. GitHub Actions runs the quality gate (typecheck, lint, format, tests), builds, and publishes to GitHub Pages at the custom domain.

Spec: [docs/BUILD_SPEC.md](docs/BUILD_SPEC.md). Agent guidance: [CLAUDE.md](CLAUDE.md).
