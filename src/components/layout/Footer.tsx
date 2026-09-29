import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { DATA_SOURCE_NOTICE } from '@/lib/themeMetrics'

// 실제 라우트만 노출한다 — 약관·회사 소개류의 빈 링크('#')는 데모에 두지 않는다
const FOOTER_LINKS = [
  { label: '테마 트리맵', to: '/' },
  { label: '테마 목록', to: '/themes' },
  { label: '주식 목록', to: '/stocks' },
  { label: '기업 그래프', to: '/graph' },
  { label: '이용약관', to: '/terms' },
  { label: '개인정보처리방침', to: '/privacy' },
]

export function Footer() {
  return (
    <footer className="bg-background pb-12 pt-16 text-foreground-secondary">
      <div className="page-container">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="text-foreground">
            <Logo height={28} />
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="text-sm hover:text-primary-pressed hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-body text-muted-foreground">
          {DATA_SOURCE_NOTICE} © 2026 Finngraph
        </div>
      </div>
    </footer>
  )
}
