import { Route, Routes } from 'react-router'

import { HistoryPage } from '@/features/history/HistoryPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HistoryPage />} />
      <Route path="*" element={<HistoryPage />} />
    </Routes>
  )
}
