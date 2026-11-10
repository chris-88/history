/** Site-wide configuration for history.chrisquinn.ie. */
export const site = {
  name: 'In Parallel',
  tagline: 'History, happening together.',
  url: 'https://history.chrisquinn.ie',
  parent: { name: 'chrisquinn.ie', url: 'https://chrisquinn.ie' },
  repo: 'https://github.com/chris-88/history',
  author: 'Chris Quinn',
  year: 2026,
  version: __APP_VERSION__,
} as const
