import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { useAuth } from '@/lib/auth'
import LoginPage from '@/pages/LoginPage'
import KakaoCallbackPage from '@/pages/KakaoCallbackPage'
import MyPage from '@/pages/MyPage'
import ThemeDashboardPage from '@/pages/ThemeDashboardPage'
import ThemeDetailPage from '@/pages/ThemeDetailPage'
import StockDetailPage from '@/pages/StockDetailPage'
import CorpGraphPage from '@/pages/CorpGraphPage'
import ThemeListPage from '@/pages/ThemeListPage'
import StockListPage from '@/pages/StockListPage'
import BriefingPage from '@/pages/BriefingPage'

function ThemesAliasRedirect() {
  const { themeId } = useParams()
  return <Navigate to={`/theme/${themeId}`} replace />
}

// 로그인 필요 라우트 가드 — Design Ref: §5.2. loading 중엔 판단을 미뤄 깜빡 리다이렉트를 막는다
function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return children
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
        {/* 더 구체적인 테마 경로를 먼저 둔다 — /graph/theme/… 가 :ticker 로 잡히지 않도록 */}
        <Route path="/graph/theme/:name" element={<CorpGraphPage />} />
        <Route path="/graph/:ticker?" element={<CorpGraphPage />} />
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <MyPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
