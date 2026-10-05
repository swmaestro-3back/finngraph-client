import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { AppShell } from '@/components/fg/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { MyPageLayout } from '@/components/layout/MyPageLayout'
import { useAuth } from '@/lib/auth'
import { issuePath, stockPath, themePath } from '@/lib/fg/paths'
import LoginPage from '@/pages/LoginPage'
import KakaoCallbackPage from '@/pages/KakaoCallbackPage'
import LegalPage from '@/pages/LegalPage'
import AccountSettingsPage from '@/pages/AccountSettingsPage'
import MyFavoritesPage from '@/pages/MyFavoritesPage'
import WithdrawPage from '@/pages/WithdrawPage'
import HomePage from '@/pages/home/HomePage'
import CorpGraphPage from '@/pages/CorpGraphPage'
import ThemesPage from '@/pages/themes/ThemesPage'
import ThemeDetailPage from '@/pages/themes/ThemeDetailPage'
import StocksPage from '@/pages/stocks/StocksPage'
import StockDetailPage from '@/pages/stocks/StockDetailPage'
import BriefingPage from '@/pages/BriefingPage'
import CalendarPage from '@/pages/CalendarPage'
import IssuePage from '@/pages/issues/IssuePage'

const FgGallery = import.meta.env.DEV ? lazy(() => import('@/dev/FgGallery')) : null

function LegacyThemeRedirect() {
  const { themeId } = useParams()
  const { search, hash, state } = useLocation()
  return (
    <Navigate
      to={{ pathname: themeId ? themePath(themeId) : '/themes', search, hash }}
      state={state}
      replace
    />
  )
}

function LegacyStockRedirect() {
  const { stockCode } = useParams()
  const { search, hash, state } = useLocation()
  return (
    <Navigate
      to={{ pathname: stockCode ? stockPath(stockCode) : '/stocks', search, hash }}
      state={state}
      replace
    />
  )
}

function LegacyIssueRedirect() {
  const { issueId } = useParams()
  const { search, hash, state } = useLocation()
  return <Navigate to={{ pathname: issueId ? issuePath(issueId) : '/', search, hash }} state={state} replace />
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return null
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/issues/:issueId" element={<IssuePage />} />
        <Route path="/news" element={<Navigate to="/" replace />} />
        <Route path="/news/:issueId" element={<LegacyIssueRedirect />} />
        <Route path="/themes" element={<ThemesPage />} />
        <Route path="/themes/:themeId" element={<ThemeDetailPage />} />
        <Route path="/theme/:themeId" element={<LegacyThemeRedirect />} />
        <Route path="/stocks" element={<StocksPage />} />
        <Route path="/stocks/:stockCode" element={<StockDetailPage />} />
        <Route path="/stock/:stockCode" element={<LegacyStockRedirect />} />
        <Route path="/graph/theme/:name" element={<CorpGraphPage />} />
        <Route path="/graph/:ticker?" element={<CorpGraphPage />} />
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/terms" element={<LegalPage doc="terms" />} />
        <Route path="/privacy" element={<LegalPage doc="privacy" />} />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <MyPageLayout />
            </RequireAuth>
          }
        >
          <Route index element={<MyFavoritesPage />} />
          <Route path="account" element={<AccountSettingsPage />} />
          <Route path="account/withdraw" element={<WithdrawPage />} />
        </Route>
        {FgGallery && (
          <Route
            path="/dev/fg"
            element={
              <Suspense fallback={null}>
                <FgGallery />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage mode="signup" />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
      </Route>
    </Routes>
  )
}

export default App
