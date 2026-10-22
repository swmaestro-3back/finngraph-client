// Lucian UX/UI Prompt #027 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#027
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ColorThemeToggle } from '@/components/fg/ColorThemeToggle'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { SearchBox } from '@/components/fg/SearchBox'
import { UserMenu } from '@/components/fg/UserMenu'
import { activeMenu, MAIN_MENU, SIDE_LINKS } from '@/lib/fg/nav'
import { isSearchShortcut } from '@/lib/fg/search'
import { useSlidingMark } from '@/lib/fg/useSlidingMark'
import { cn } from '@/lib/utils'

const WIDE_SEARCH = '(min-width: 1024px)'

function markSearchShift(header: HTMLElement | null, button: HTMLElement | null) {
  const row = button?.parentElement
  if (!header || !button || !row) return
  const pad = parseFloat(getComputedStyle(row).paddingRight) || 0
  const shift = row.getBoundingClientRect().right - pad - button.getBoundingClientRect().right
  header.style.setProperty('--fg-gh-shift', `${Math.max(0, Math.round(shift))}px`)
}

export function AppHeader() {
  const { pathname } = useLocation()
  const active = activeMenu(pathname)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const header = useRef<HTMLElement>(null)
  const deskInput = useRef<HTMLInputElement>(null)
  const searchToggle = useRef<HTMLButtonElement>(null)
  const nav = useRef<HTMLElement>(null)
  const navMark = useRef<HTMLSpanElement>(null)
  useSlidingMark(nav, navMark, MAIN_MENU.findIndex((item) => item.key === active), { items: 'a', motion: 'spring' })

  useEffect(() => {
    setOverlayOpen(false)
  }, [pathname])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (!isSearchShortcut(event, target)) return
      event.preventDefault()
      if (window.matchMedia(WIDE_SEARCH).matches) deskInput.current?.focus()
      else {
        markSearchShift(header.current, searchToggle.current)
        setOverlayOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header ref={header} className="fg-gh" data-search={overlayOpen || undefined}>
      <div className="fg-wrap fg-gh__in">
        <Link to="/" className="fg-gh__logo" aria-label="Finngraph 홈">
          <Logo height={24} />
        </Link>
        <nav ref={nav} className="fg-gh__nav" aria-label="주 메뉴">
          <span ref={navMark} className="fg-gh__mark" aria-hidden="true" />
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
          onClick={() => {
            if (!overlayOpen) markSearchShift(header.current, searchToggle.current)
            setOverlayOpen((open) => !open)
          }}
        >
          {overlayOpen ? (
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <LucianIcon name="search" size={20} />
          )}
        </button>
        <div className="fg-gh__right">
          {SIDE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn('fg-gh__link', link.narrowOnly && 'fg-gh__link--narrow')}
              aria-current={pathname === link.to ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          <ColorThemeToggle />
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
