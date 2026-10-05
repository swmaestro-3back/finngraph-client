import { ExternalLink } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '@/components/fg/Button'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { Segment } from '@/components/fg/SegmentedTabs'
import {
  ARTICLE_LIMIT,
  ARTICLE_SORTS,
  articleRows,
  articlesSubtitle,
  mediaTally,
  type ArticleRow,
  type ArticleSort,
} from '@/lib/fg/issueArticles'
import type { IssueSubject } from '@/lib/fg/issueSubject'

const SOURCE_NOTE = '기사 원문은 각 매체 사이트에서 열려요. Finngraph는 제목과 링크만 보여 주고 기사 전문은 싣지 않아요.'

export function ArticleLine({ row, onOpenNews }: { row: ArticleRow; onOpenNews: (id: string) => void }) {
  const { item } = row
  const main: ReactNode = (
    <>
      <span className="fg-iar__time fg-num">
        {row.date && <span className="fg-iar__date">{row.date}</span>}
        <span>{row.time}</span>
      </span>
      <span className="fg-iar__press">{item.press}</span>
      <span className="fg-iar__title">{item.title}</span>
    </>
  )
  if (item.analyzed) {
    return (
      <div className="fg-iar__row">
        <button type="button" className="fg-iar__main" onClick={() => onOpenNews(item.id)}>
          {main}
        </button>
        {item.url && (
          <a
            className="fg-iar__ext"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.press} 원문 열기`}
          >
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
          </a>
        )}
      </div>
    )
  }
  if (item.url) {
    return (
      <a className="fg-iar__main fg-iar__main--ext" href={item.url} target="_blank" rel="noopener noreferrer">
        {main}
        <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" className="fg-iar__icon" />
      </a>
    )
  }
  return <div className="fg-iar__main">{main}</div>
}

interface IssueArticlesTabProps {
  issue: IssueSubject
  onOpenNews: (id: string) => void
}

export function IssueArticlesTab({ issue, onOpenNews }: IssueArticlesTabProps) {
  const [sort, setSort] = useState<ArticleSort>('time')
  const [all, setAll] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const rows = articleRows(issue.articles, sort)
  const shown = all ? rows : rows.slice(0, ARTICLE_LIMIT)
  const rest = rows.length - shown.length
  const tally = mediaTally(issue.articles, issue.today)
  const showAll = () => {
    flushSync(() => setAll(true))
    listRef.current?.children[ARTICLE_LIMIT]?.querySelector<HTMLElement>('a, button')?.focus()
  }
  return (
    <div className="fg-grid fg-iar">
      <div className="fg-col">
        <section className="fg-section" aria-labelledby="fg-iar-title">
          <div className="fg-section__head fg-itl__head">
            <div className="fg-iflow__titles">
              <h2 id="fg-iar-title" className="fg-section__title">
                {`묶인 기사 ${rows.length}건`}
              </h2>
              <p className="fg-section__sub">{articlesSubtitle(issue.articles, issue.media, issue.today)}</p>
            </div>
            {rows.length > 1 && <Segment label="정렬" options={ARTICLE_SORTS} value={sort} onChange={setSort} />}
          </div>
          <ul ref={listRef} className="fg-iar__list" aria-label="묶인 기사">
            {shown.map((row) => (
              <li key={row.item.id}>
                <ArticleLine row={row} onOpenNews={onOpenNews} />
              </li>
            ))}
          </ul>
          {rest > 0 && (
            <Button className="fg-iar__more" onClick={showAll}>
              {`${rest}건 더 보기`}
            </Button>
          )}
          <p className="fg-itl__cap">{SOURCE_NOTE}</p>
        </section>
      </div>
      <aside className="fg-rail fg-isp__rail" aria-label="매체">
        <section className="fg-section fg-rail__wide" aria-labelledby="fg-iar-media">
          <div className="fg-iflow__titles">
            <h2 id="fg-iar-media" className="fg-section__title">
              {`보도한 매체 ${tally.total}곳`}
            </h2>
            <p className="fg-itl__note">{tally.caption}</p>
          </div>
          {tally.rows.length > 0 && (
            <ul className="fg-iar__media">
              {tally.rows.map((row) => (
                <li key={row.key}>
                  <b>{row.name}</b>
                  <span className="fg-cov__bar" aria-hidden="true">
                    <span className="fg-cov__fill" style={{ width: `${row.pct}%` }} />
                  </span>
                  <span className="fg-num">{`${row.count}건`}</span>
                </li>
              ))}
            </ul>
          )}
          {tally.rest && <p className="fg-itl__note">{tally.rest}</p>}
        </section>
        <Disclaimer />
      </aside>
    </div>
  )
}
