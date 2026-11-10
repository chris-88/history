import { site } from '@/config/site'

import { ExternalLink } from './shared'
import { CONTAINER } from './styles'

/** Two parallel tracks with a shared focus line: the product in one glyph. */
function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="23"
        rx="6"
        className="fill-surface-2 stroke-line-strong"
      />
      <path d="M5 9h14M5 15h14" className="stroke-faint" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5.5v13" className="stroke-lime" strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx="12" cy="9" r="2" className="fill-lime" />
      <circle cx="12" cy="15" r="2" className="fill-highlight" />
    </svg>
  )
}

export function SiteHeader() {
  return (
    <header className="border-line border-b">
      <div className={`${CONTAINER} flex min-h-16 items-center justify-between gap-4 py-3`}>
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-sm font-semibold tracking-tight">{site.name}</span>
          <span className="text-faint hidden font-mono text-[0.7rem] tracking-[0.18em] uppercase sm:inline">
            / world history, side by side
          </span>
        </div>
        <nav aria-label="Site" className="flex items-center gap-1 text-sm">
          <ExternalLink
            href={site.repo}
            icon={false}
            className="text-muted-foreground hover:text-foreground hidden min-h-11 items-center rounded-md px-3 transition-colors sm:inline-flex"
          >
            Source
          </ExternalLink>
          <a
            href={site.parent.url}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center rounded-md px-3 transition-colors"
          >
            <span aria-hidden="true">←&nbsp;</span>
            {site.parent.name}
          </a>
        </nav>
      </div>
    </header>
  )
}
