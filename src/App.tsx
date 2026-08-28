import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import ThemeDashboardPage from '@/pages/ThemeDashboardPage'
import ThemeDetailPage from '@/pages/ThemeDetailPage'
import StockDetailPage from '@/pages/StockDetailPage'
import CorpGraphPage from '@/pages/CorpGraphPage'
import ThemeListPage from '@/pages/ThemeListPage'
import StockListPage from '@/pages/StockListPage'

function ThemesAliasRedirect() {
  const { themeId } = useParams()
  return <Navigate to={`/theme/${themeId}`} replace />
}

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<ThemeDashboardPage />} />
        <Route path="/themes" element={<ThemeListPage />} />
        <Route path="/themes/:themeId" element={<ThemesAliasRedirect />} />
        <Route path="/theme/:themeId" element={<ThemeDetailPage />} />
        <Route path="/stocks" element={<StockListPage />} />
        <Route path="/stock/:stockCode" element={<StockDetailPage />} />
        <Route path="/graph" element={<CorpGraphPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
