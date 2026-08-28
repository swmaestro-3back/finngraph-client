import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

export function SiteLayout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex-1">
        <div
          key={pathname}
          className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
        >
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
