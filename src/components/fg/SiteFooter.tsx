import { Link } from 'react-router-dom'
import { DATA_SOURCE_NOTICE } from '@/lib/themeMetrics'

export function SiteFooter() {
  return (
    <footer className="fg-wrap fg-foot">
      <div className="fg-foot__l">
        <span>© 2026 Finngraph</span>
        <span>{DATA_SOURCE_NOTICE}</span>
      </div>
      <nav aria-label="약관">
        <Link to="/terms">이용약관</Link>
        <Link to="/privacy" className="fg-foot__strong">
          개인정보처리방침
        </Link>
      </nav>
    </footer>
  )
}
