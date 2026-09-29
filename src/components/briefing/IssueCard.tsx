import { ArrowUpRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { CitationBadges } from '@/components/briefing/CitationBadges'
import { LockedBlock } from '@/components/briefing/LockedBlock'
import type { BriefingIssueRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash, formatDateTime, formatRelativeTime, pressOf } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface IssueCardProps {
  issue: BriefingIssueRes
  locked: boolean
}

function timeRange(first: string, last: string): string {
  const a = formatDateTime(first)
  const b = formatDateTime(last)
  return a === b ? a : `${a} ~ ${b.slice(-5)}`
}

export function IssueCard({ issue, locked }: IssueCardProps) {
  const { pathname } = useLocation()
  return (
    <article className="card-surface flex flex-col gap-3 p-5">
      <header className="flex flex-col gap-1.5">
        <h3 className="text-body font-semibold leading-snug text-foreground [text-wrap:balance]">{issue.title}</h3>
        <p className="text-caption text-muted-foreground">
          기사 <span className="font-mono tabular-nums">{issue.newsCount}</span>건
          <span aria-hidden className="mx-1.5 text-foreground-tertiary">·</span>
          <span className="font-mono tabular-nums">{timeRange(issue.firstPublishedAt, issue.lastPublishedAt)}</span>
        </p>
        {issue.keywords.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {issue.keywords.map((k) => (
              <li key={k} className="rounded-sm bg-surface-inset px-1.5 py-0.5 text-micro text-foreground-secondary">
                {k}
              </li>
            ))}
          </ul>
        )}
      </header>

      {issue.stocks.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {issue.stocks.map((s) => (
            <li key={s.ticker}>
              <Link
                to={`/stock/${s.ticker}`}
                state={fromState(pathname)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-caption font-medium text-foreground hover:bg-muted"
              >
                {s.name}
                <span className={cn('font-mono tabular-nums', changeColorClass(s.change ?? 0))}>
                  {formatChangeOrDash(s.change)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-surface-inset pt-3">
        {locked ? (
          <LockedBlock title="해설은 로그인 후 볼 수 있어요" lines={3} />
        ) : issue.commentary ? (
          <ul className="flex flex-col gap-2">
            {issue.commentary.sentences.map((s, i) => (
              <li key={i} className="text-body leading-[1.7] text-foreground">
                {s.text}
                <CitationBadges citations={s.citations} className="ml-1.5" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-caption text-muted-foreground">검증을 통과한 해설이 없습니다.</p>
        )}
      </div>

      <ul className="flex flex-col gap-1 border-t border-surface-inset pt-3">
        {issue.articles.map((a) => (
          <li key={a.newsId} className="flex items-baseline gap-2 text-caption">
            <span className="shrink-0 font-mono tabular-nums text-foreground-tertiary">
              {a.publishedAt ? formatRelativeTime(a.publishedAt) : ''}
            </span>
            {a.url ? (
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-baseline gap-1 text-foreground-secondary hover:text-foreground"
              >
                <span className="truncate">{a.title}</span>
                <span className="shrink-0 text-foreground-tertiary">{pressOf(a.url)}</span>
                <ArrowUpRight className="size-3 shrink-0 self-center" />
              </a>
            ) : (
              <span className="truncate text-foreground-secondary">{a.title}</span>
            )}
          </li>
        ))}
      </ul>
    </article>
  )
}
