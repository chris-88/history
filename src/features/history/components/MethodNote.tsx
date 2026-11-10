import { site } from '@/config/site'

import { Eyebrow } from './shared'
import { CONTAINER } from './styles'

export function MethodNote({ count }: { count: number | null }) {
  return (
    <footer className="border-line mt-12 border-t">
      <div className={`${CONTAINER} grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_auto]`}>
        <div>
          <Eyebrow as="h2">How to read this</Eyebrow>
          <ul className="text-muted-foreground mt-4 max-w-3xl space-y-3 text-sm leading-relaxed">
            <li>
              <strong className="text-foreground font-medium">Dates are often approximate.</strong>{' '}
              “c.” marks an approximate date. Prehistoric and ancient entries usually describe a
              culture or a process rather than a single dated moment, and many dates are debated.
            </li>
            <li>
              <strong className="text-foreground font-medium">There is no year zero.</strong> The
              calendar runs from 1 BCE straight to 1 CE. The timeline uses an evenly spaced axis for
              navigation, but no date here is ever year 0.
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Regions are geographic labels.
              </strong>{' '}
              Tracks such as Russia, Germany, USA and China are places to compare, used even for
              eras before those states existed. They are not claims of continuous nationhood.
            </li>
            <li>
              <strong className="text-foreground font-medium">
                Wikipedia is a jumping-off point.
              </strong>{' '}
              Each event links to a Wikipedia article for further reading, not as verification or a
              substitute for primary research.
            </li>
            <li>
              <strong className="text-foreground font-medium">Proximity is not causation.</strong>{' '}
              “Elsewhere around this time” lists events that are near in time, not events known to
              be connected.
            </li>
            <li>
              <strong className="text-foreground font-medium">Blank means no curated entry.</strong>{' '}
              This is a selective overview
              {count ? ` of ${new Intl.NumberFormat('en-IE').format(count)} events` : ''}. A blank
              cell does not mean nothing happened.
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 lg:items-end lg:text-right">
          <p className="text-faint font-mono text-[0.7rem] tracking-[0.14em] uppercase">
            static · no tracking · v{site.version}
          </p>
          <a
            href={site.parent.url}
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm"
          >
            <span aria-hidden="true">←&nbsp;</span>
            {site.parent.name}
          </a>
        </div>
      </div>
    </footer>
  )
}
