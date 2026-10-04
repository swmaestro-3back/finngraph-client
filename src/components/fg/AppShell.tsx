import { Fragment, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { AppHeader } from '@/components/fg/AppHeader'
import { BottomTabBar } from '@/components/fg/BottomTabBar'
import { SiteFooter } from '@/components/fg/SiteFooter'
import { canvasFor, keepsScroll, outletKey } from '@/lib/fg/nav'

export function AppShell() {
  const { pathname, state } = useLocation()
  const navigationType = useNavigationType()
  const keepScroll = useRef(false)
  useEffect(() => {
    keepScroll.current = keepsScroll(state, navigationType)
  })
  useEffect(() => {
    if (keepScroll.current) return
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="fg fg-app" data-canvas={canvasFor(pathname)}>
      <AppHeader />
      <main className="fg-app__main">
        <Fragment key={outletKey(pathname)}>
          <Outlet />
        </Fragment>
      </main>
      <SiteFooter />
      <BottomTabBar />
    </div>
  )
}
