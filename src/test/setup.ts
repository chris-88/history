import '@testing-library/jest-dom/vitest'

// jsdom lacks the layout observers the timeline and Base UI rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
