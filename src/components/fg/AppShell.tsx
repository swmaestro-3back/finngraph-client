import { Fragment, useEffect, useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '@/components/fg/AppHeader'
import { BottomTabBar } from '@/components/fg/BottomTabBar'
import { SiteFooter } from '@/components/fg/SiteFooter'
import { MOTION_BASE_MS, MOTION_EASE, ROUTE_ENTER, motionAllowed } from '@/lib/fg/motion'
import { canvasFor, outletKey } from '@/lib/fg/nav'

const noop = () => {}

export function AppShell() {
  const { pathname } = useLocation()
  const stage = useRef<HTMLDivElement>(null)
  const entered = useRef(pathname)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  useLayoutEffect(() => {
    if (entered.current === pathname) return
    entered.current = pathname
    if (!motionAllowed()) return
    const animation = stage.current?.animate(ROUTE_ENTER, { duration: MOTION_BASE_MS, easing: MOTION_EASE })
    return () => animation?.cancel()
  }, [pathname])
  useEffect(() => {
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])
  return (
    <div className="fg fg-app" data-canvas={canvasFor(pathname)}>
      <AppHeader />
      <main className="fg-app__main">
        <div ref={stage} className="fg-app__stage">
          <Fragment key={outletKey(pathname)}>
            <Outlet />
          </Fragment>
        </div>
      </main>
      <SiteFooter />
      <BottomTabBar />
    </div>
  )
}
