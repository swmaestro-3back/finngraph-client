import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AuthBrandPanel } from '@/components/auth/AuthBrandPanel'

export function AuthLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <AuthBrandPanel />

      <div className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center justify-between px-6 lg:px-10">
          <Link
            to="/"
            className="font-wordmark text-lg font-extrabold leading-tight tracking-[-0.05em] text-foreground lg:invisible"
          >
            Finn<span className="text-primary">graph</span>
          </Link>
          <Link
            to="/"
            className="text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            홈으로
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-10 lg:px-10">
          <div
            key={pathname}
            className="w-full max-w-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
          >
            <Outlet />
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 px-6 py-6 text-caption text-muted-foreground">
          <Link to="/terms" className="transition-colors hover:text-foreground">
            이용약관
          </Link>
          <Link to="/privacy" className="font-medium transition-colors hover:text-foreground">
            개인정보처리방침
          </Link>
          <span>© 2026 finngraph</span>
        </footer>
      </div>
    </div>
  )
}
