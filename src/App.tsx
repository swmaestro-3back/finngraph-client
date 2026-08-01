import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import ThemeDashboardPage from '@/pages/ThemeDashboardPage'
import ThemeDetailPage from '@/pages/ThemeDetailPage'
import StockDetailPage from '@/pages/StockDetailPage'
import CorpGraphPage from '@/pages/CorpGraphPage'
import ThemeDbPage from '@/pages/ThemeDbPage'
import StockDbPage from '@/pages/StockDbPage'

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<ThemeDashboardPage />} />
        <Route path="/themes" element={<ThemeDbPage />} />
        <Route path="/theme/:themeId" element={<ThemeDetailPage />} />
        <Route path="/stocks" element={<StockDbPage />} />
        <Route path="/stock/:stockCode" element={<StockDetailPage />} />
        <Route path="/graph" element={<CorpGraphPage />} />
      </Route>
    </Routes>
  )
}

export default App
