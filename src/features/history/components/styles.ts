/** Shared class strings so every surface reads as one system. */
export const PANEL = 'border-line bg-surface rounded-xl border'
export const CONTAINER = 'mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8'

export function wikipediaSearchUrl(title: string): string {
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(title)}`
}
