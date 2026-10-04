import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { SearchBox } from '@/components/fg/SearchBox'
import { UserMenu } from '@/components/fg/UserMenu'
import { activeMenu, MAIN_MENU, SIDE_LINKS } from '@/lib/fg/nav'
import { isSearchShortcut } from '@/lib/fg/search'

const WIDE_SEARCH = '(min-width: 1024px)'

export function AppHeader() {
  const { pathname } = useLocation()
  const active = activeMenu(pathname)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const deskInput = useRef<HTMLInputElement>(null)
  const searchToggle = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setOverlayOpen(false)
  }, [pathname])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (!isSearchShortcut(event, target)) return
      event.preventDefault()
      if (window.matchMedia(WIDE_SEARCH).matches) deskInput.current?.focus()
      else setOverlayOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="fg-gh">
      <div className="fg-wrap fg-gh__in">
        <Link to="/" className="fg-gh__logo" aria-label="Finngraph 홈">
          <Logo height={24} />
        </Link>
        <nav className="fg-gh__nav" aria-label="주 메뉴">
          {MAIN_MENU.map((item) => (
            <Link key={item.key} to={item.to} aria-current={active === item.key ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <SearchBox className="fg-gh__search" inputRef={deskInput} />
        <button
          ref={searchToggle}
          type="button"
          className="fg-gh__icon fg-gh__searchbtn"
          aria-label={overlayOpen ? '검색 닫기' : '검색'}
          aria-expanded={overlayOpen}
          onClick={() => setOverlayOpen((open) => !open)}
        >
          {overlayOpen ? (
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Search size={20} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
        <div className="fg-gh__right">
          {SIDE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="fg-gh__link"
              aria-current={pathname === link.to ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          <UserMenu />
        </div>
      </div>
      {overlayOpen && (
        <div className="fg-gh__overlay">
          <div className="fg-wrap">
            <SearchBox
              autoFocus
              onDone={() => setOverlayOpen(false)}
              onEscape={() => {
                setOverlayOpen(false)
                searchToggle.current?.focus()
              }}
            />
          </div>
        </div>
      )}
    </header>
  )
}
