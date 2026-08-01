import { Link } from 'react-router-dom'

const FOOTER_COLUMNS = [
  {
    title: '데이터',
    links: [
      { label: '테마 히트맵', to: '/' },
      { label: '테마 DB', to: '/themes' },
      { label: '주식 DB', to: '/stocks' },
      { label: '기업 그래프', to: '/graph' },
    ],
  },
  {
    title: '서비스',
    links: [
      { label: '이용약관', to: '#' },
      { label: '개인정보처리방침', to: '#' },
      { label: '문의하기', to: '#' },
    ],
  },
  {
    title: '회사',
    links: [
      { label: '소개', to: '#' },
      { label: '공지사항', to: '#' },
      { label: '채용', to: '#' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="bg-background pb-12 pt-24 text-[#5b616e]">
      <div className="page-container">
        <div className="mb-8 text-[22px] leading-tight text-primary">Finngraph</div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <div className="text-base font-semibold text-foreground">
                {column.title}
              </div>
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="text-sm hover:text-primary-pressed hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-24 border-t border-border pt-6 text-[13px] text-muted-foreground">
          표시된 시세·등락률·재무지표·뉴스는 데모용 예시 데이터입니다. 투자 판단의
          근거로 사용할 수 없습니다. © 2026 Finngraph
        </div>
      </div>
    </footer>
  )
}
