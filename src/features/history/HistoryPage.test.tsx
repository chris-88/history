import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import { csv, csvRow } from '@/test/fixtures'

import { HistoryPage } from './HistoryPage'

const DATA = csv(
  csvRow({ event_id: 'rising', title: 'Easter Rising' }),
  csvRow({
    event_id: 'somme',
    lane: 'Britain',
    title: 'Battle of the Somme',
    note: 'A long Allied offensive on the Western Front.',
    wikipedia_url: 'https://en.wikipedia.org/wiki/Battle_of_the_Somme',
    wikipedia_article: 'Battle of the Somme',
  }),
  csvRow({
    event_id: 'newgrange',
    year: '-3200',
    display_year: '"3,200 BCE"',
    cat: 'culture',
    title: 'Newgrange constructed',
    note: 'A passage tomb is built in the Boyne valley.',
    approx: 'True',
    wikipedia_url: 'https://en.wikipedia.org/wiki/Newgrange',
    wikipedia_article: 'Newgrange',
  }),
  csvRow({
    event_id: 'hastings',
    year: '1066',
    display_year: '1066 CE',
    lane: 'Britain',
    title: 'Battle of Hastings',
    note: 'William of Normandy defeats Harold.',
    wikipedia_url: 'https://en.wikipedia.org/wiki/Battle_of_Hastings',
    wikipedia_article: 'Battle of Hastings',
  }),
)

function stubFetch(body: string, status = 200) {
  const fetchMock = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : 'OK',
    text: async () => body,
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <HistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const details = () => screen.getByRole('complementary', { name: '03 / Event explorer' })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HistoryPage', () => {
  it('shows a loading state, then the explorer with stats derived from the data', async () => {
    stubFetch(DATA)
    renderPage()
    expect(screen.getByText('Loading the timeline…')).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'History, happening together.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Curated events').parentElement).toHaveTextContent('4')
    expect(screen.getByText('Regions in view').parentElement).toHaveTextContent('8 / 14')
    expect(screen.getByText(/A comparative history explorer/)).toHaveTextContent(
      '3,200 BCE – 1916 CE',
    )
    expect(screen.getByRole('button', { name: /Modern/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/in view ·/)).toHaveTextContent('2 in view · 4 curated')
  })

  it('switches era from the era buttons', async () => {
    stubFetch(DATA)
    const user = userEvent.setup()
    renderPage()
    const medieval = await screen.findByRole('button', { name: /Medieval/ })
    await user.click(medieval)

    expect(medieval).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Modern/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { name: 'Medieval history, in parallel' })).toBeVisible()
    expect(within(details()).getByRole('heading', { name: 'Battle of Hastings' })).toBeVisible()
  })

  it('selects a timeline mark with the keyboard and lists nearby events elsewhere', async () => {
    stubFetch(DATA)
    const user = userEvent.setup()
    renderPage()
    const mark = await screen.findByRole('button', { name: /near 1916 CE: Easter Rising/ })
    mark.focus()
    await user.keyboard('{Enter}')

    const panel = details()
    expect(within(panel).getByRole('heading', { name: 'Easter Rising' })).toBeVisible()
    expect(within(panel).getByText('Nearby in time, not necessarily related.')).toBeVisible()
    expect(within(panel).getByRole('button', { name: /Battle of the Somme/ })).toBeVisible()
    expect(mark).toHaveAccessibleName(/Selected$/)
  })

  it('searches, then opens the chosen result with a secure Wikipedia link', async () => {
    stubFetch(DATA)
    const user = userEvent.setup()
    renderPage()
    const search = await screen.findByRole('searchbox', { name: 'Search all events' })
    await user.type(search, 'hastings')

    const results = screen.getByRole('region', { name: 'Search results' })
    await user.click(within(results).getByRole('button', { name: /Battle of Hastings/ }))

    expect(screen.queryByRole('region', { name: 'Search results' })).not.toBeInTheDocument()
    expect(search).toHaveValue('')
    const heading = within(details()).getByRole('heading', { name: 'Battle of Hastings' })
    expect(heading).toHaveFocus()
    const link = within(details()).getByRole('link', {
      name: /Read on Wikipedia — Battle of Hastings/,
    })
    expect(link).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Battle_of_Hastings')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent('(opens in a new tab)')
    expect(screen.getByRole('button', { name: /Medieval/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says so when a search finds nothing', async () => {
    stubFetch(DATA)
    const user = userEvent.setup()
    renderPage()
    await user.type(await screen.findByRole('searchbox'), 'zzzz')
    expect(screen.getByText('No matching events in this curated selection.')).toBeVisible()
    expect(screen.getByText(/No curated events match in this window/)).toBeVisible()
  })

  it('prefixes approximate dates with c.', async () => {
    stubFetch(DATA)
    renderPage('/?event=newgrange')
    const panel = await screen.findByRole('complementary', { name: '03 / Event explorer' })
    expect(within(panel).getByText('c. 3,200 BCE')).toBeVisible()
    expect(within(panel).getByRole('heading', { name: 'Newgrange constructed' })).toBeVisible()
  })

  it('keeps a selection hidden by a category filter and flags it', async () => {
    stubFetch(DATA)
    const user = userEvent.setup()
    renderPage('/?event=rising')
    await screen.findByRole('complementary', { name: '03 / Event explorer' })
    expect(within(details()).queryByText('Hidden by current filters')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Filter by theme' }))
    await user.click(await screen.findByRole('option', { name: 'Culture' }))

    expect(within(details()).getByText('Hidden by current filters')).toBeVisible()
    expect(within(details()).getByRole('heading', { name: 'Easter Rising' })).toBeVisible()
    expect(screen.getByText(/in view ·/)).toHaveTextContent('0 in view · 1 match · 4 curated')
  })

  it('shows an error with a retry when the CSV request fails', async () => {
    const fetchMock = stubFetch('', 404)
    const user = userEvent.setup()
    renderPage()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The timeline could not load')
    expect(alert).toHaveTextContent('404')

    await user.click(within(alert).getByRole('button', { name: 'Retry' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('lists data problems with their CSV line numbers', async () => {
    stubFetch(csv(csvRow({ event_id: 'bad', year: '0' })))
    renderPage()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Line 2:')
    expect(alert).toHaveTextContent('no year 0')
  })
})
