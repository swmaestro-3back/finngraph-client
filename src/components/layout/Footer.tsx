import { Link } from 'react-router-dom'

// 실제 라우트만 노출한다 — 약관·회사 소개류의 빈 링크('#')는 데모에 두지 않는다
const FOOTER_LINKS = [
  { label: '테마 트리맵', to: '/' },
  { label: '테마 목록', to: '/themes' },
  { label: '주식 목록', to: '/stocks' },
  { label: '기업 그래프', to: '/graph' },
]

export function Footer() {
  return (
    <footer className="bg-background pb-12 pt-16 text-foreground-secondary">
      <div className="page-container">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="font-wordmark text-title font-extrabold leading-tight tracking-[-0.05em] text-foreground">
            Finn<span className="text-primary">graph</span>
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
          표시된 시세·등락률·재무지표·뉴스는 데모용 예시 데이터입니다. 투자 판단의
          근거로 사용할 수 없습니다. © 2026 Finngraph
        </div>
      </div>
    </footer>
  )
}
