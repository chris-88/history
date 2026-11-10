import { useHistoryEvents } from './hooks/useHistoryEvents'
import { useHistoryState } from './hooks/useHistoryState'

/** Placeholder shell; replaced by the full explorer. */
export function HistoryPage() {
  const { data, isPending, error } = useHistoryEvents()
  if (isPending) return <main className="text-muted-foreground p-8">Loading the timeline…</main>
  if (error) return <main className="text-destructive p-8">{error.message}</main>
  return <Explorer events={data} />
}

function Explorer({ events }: { events: ReturnType<typeof useHistoryEvents>['data'] & {} }) {
  const [view] = useHistoryState(events)
  return (
    <main className="p-8">
      {view.visible.length} of {view.totalCount} events in view
    </main>
  )
}
