import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from '@/lib/auth'
import { FavoriteProvider } from '@/lib/favorites'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* 즐겨찾기는 로그인 상태를 구독하므로 AuthProvider 안쪽이어야 한다 */}
        <FavoriteProvider>
          <App />
          {/* 별표가 목록 한가운데서 눌려 인라인 문구는 시야 밖이다 — 화면 하단 고정 */}
          <Toaster position="bottom-center" richColors />
        </FavoriteProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
