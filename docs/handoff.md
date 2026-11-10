# In Parallel — Developer handoff

This package is ready to drop into the root of an existing personal-site repository or attach to a development agent session.

**Start here:** [BUILD_SPEC.md](BUILD_SPEC.md) — product requirements, data contract, UI behaviour, implementation instructions and 15 acceptance checks.

**Data:** [`data/history-events.csv`](data/history-events.csv) — 647 historical events; 14 geographic tracks; 8 categories; a specific Wikipedia article URL on every row. This file is the source of truth; the reference HTML contains an older embedded copy of the data and must **not** be the source used in the React implementation.

**Reference design:** [`reference/previous-explorer.html`](reference/previous-explorer.html) — open in a browser to see the existing interface and interactions. [`reference/desktop-preview.png`](reference/desktop-preview.png) and [`reference/mobile-preview.png`](reference/mobile-preview.png) are optional visual guides.

## What to say to the dev agent

> Implement the attached `BUILD_SPEC.md` against my existing personal-site repository. Use the bundled CSV unchanged except for explicitly agreed editorial corrections. Build this into the existing app at `/history/` and preserve the current site and GitHub Pages deployment. Use the reference HTML as a functional and visual guide, not as the final code. Run the spec's acceptance tests and report what you changed.

No backend or database is needed for the initial release.
