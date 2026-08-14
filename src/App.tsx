import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import ThemeDashboardPage from '@/pages/ThemeDashboardPage'
import ThemeDetailPage from '@/pages/ThemeDetailPage'
import StockDetailPage from '@/pages/StockDetailPage'
import CorpGraphPage from '@/pages/CorpGraphPage'
import ThemeListPage from '@/pages/ThemeListPage'
import StockListPage from '@/pages/StockListPage'

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<ThemeDashboardPage />} />
        <Route path="/themes" element={<ThemeListPage />} />
        <Route path="/theme/:themeId" element={<ThemeDetailPage />} />
        <Route path="/stocks" element={<StockListPage />} />
        <Route path="/stock/:stockCode" element={<StockDetailPage />} />
        <Route path="/graph" element={<CorpGraphPage />} />
      </Route>
    </Routes>
  )
}

export default App
