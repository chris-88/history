import { ExternalLinkIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Small mono uppercase label, the chrisquinn.ie eyebrow. */
export function Eyebrow({
  children,
  className,
  as: Tag = 'p',
  id,
}: {
  children: ReactNode
  className?: string
  as?: 'p' | 'h2' | 'h3' | 'span'
  id?: string
}) {
  return (
    <Tag
      id={id}
      className={cn(
        'text-muted-foreground font-mono text-[0.72rem] font-normal tracking-[0.18em] uppercase',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function LaneDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}

/** Every link that leaves the site: new tab, no opener, marked external for sight and speech. */
export function ExternalLink({
  href,
  children,
  className,
  icon = true,
  srLabel = '(opens in a new tab)',
}: {
  href: string
  children: ReactNode
  className?: string
  icon?: boolean
  srLabel?: string
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      {icon && <ExternalLinkIcon aria-hidden="true" className="size-3.5 shrink-0" />}
      <span className="sr-only"> {srLabel}</span>
    </a>
  )
}
