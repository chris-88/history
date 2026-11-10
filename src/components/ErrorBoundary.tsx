import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Last line of defence: nothing in the app fails silently to a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="mx-auto max-w-xl px-5 py-20">
          <h1 className="text-2xl font-semibold">Something broke.</h1>
          <p className="text-muted-foreground mt-3">
            The page hit an error it could not recover from. Reloading usually fixes it.
          </p>
          <pre className="border-line bg-card text-muted-foreground mt-6 overflow-x-auto rounded-md border p-4 font-mono text-xs">
            {this.state.error.message}
          </pre>
        </main>
      )
    }
    return this.props.children
  }
}
