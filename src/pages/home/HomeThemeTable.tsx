import { ChevronRight } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { GapValue } from '@/components/fg/Gap'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { ThemeAverageLine } from '@/components/fg/ThemeAverageLine'
import type { ThemeRes } from '@/lib/apiTypes'
import { HUB_THEME_LIMIT, pickHubThemes, type HubIssueRef, type HubThemeIssues } from '@/lib/fg/hub'
import { issueTabPath } from '@/lib/fg/issuePage'
import { themePath } from '@/lib/fg/paths'
import { themeLeader, weightedChangeOf } from '@/lib/fg/themes'
import { useDelayed } from '@/lib/fg/useDelayed'
import { useMediaQuery } from '@/lib/fg/useMediaQuery'
import { fromState } from '@/lib/navigation'
import type { ApiState } from '@/lib/queries/useApi'
import type { HubSlot } from '@/lib/queries/useHubSlots'

const NARROW = '(max-width: 767px)'
const ORDER_NOTE = '오른 테마 다음 내린 테마'
const ISSUE_NOTE = '대표 이슈를 누르면 타임라인으로 이어져요'

type Issues = HubSlot<ReadonlyMap<number, HubThemeIssues>>

interface IssueCellProps {
  issues: Issues
  themeId: number
  state: unknown
}

function issueOf(issues: Issues, themeId: number): HubIssueRef | null {
  return issues.status === 'ready' ? (issues.data.get(themeId)?.top ?? null) : null
}

function IssueLink({ issues, themeId, state }: IssueCellProps) {
  if (issues.status === 'not-ready') return <GapValue gap={issues.gap} />
  if (issues.status === 'loading') return <Skeleton height={20} width="70%" />
  if (issues.status === 'error') return <span className="fg-htt__none">—</span>
  const issue = issueOf(issues, themeId)
  if (!issue) return <span className="fg-htt__none">나온 이슈가 없어요</span>
  return (
    <Link to={issueTabPath(issue.id, 'timeline')} state={state} className="fg-htt__issue" title={issue.title}>
      <i className="fg-dia" aria-hidden="true" />
      <span className="fg-htt__itext">{issue.title}</span>
      <span className="fg-htt__media fg-num">{`${issue.media}개 매체`}</span>
    </Link>
  )
}

interface RowProps {
  theme: ThemeRes
  issues: Issues
  state: unknown
}

function ThemeName({ theme, state }: Omit<RowProps, 'issues'>) {
  return (
    <Link to={themePath(theme.id)} state={state} className="fg-htt__name">
      {theme.name}
    </Link>
  )
}

function TableRow({ theme, issues, state }: RowProps) {
  const change = weightedChangeOf(theme)
  const leader = themeLeader(theme)
  return (
    <tr>
      <th scope="row">
        <ThemeName theme={theme} state={state} />
      </th>
      <td className="fg-htt__num">
        <span className="fg-htt__numstack">
          {change === null ? '—' : <ChangeText value={change} />}
          <ThemeAverageLine theme={theme} className="fg-htt__avg" />
        </span>
      </td>
      <td className="fg-htt__num fg-htt__ratio">
        <span className="fg-up">{theme.upCount ?? 0}</span>
        {' / '}
        <span className="fg-down">{theme.downCount ?? 0}</span>
      </td>
      <td className="fg-htt__num">
        {leader && leader.change !== null ? (
          <span className="fg-htt__lead">
            <span className="fg-lg">
              <CompanyLogo name={leader.name} size={24} />
              <span>{leader.name}</span>
            </span>
            <ChangeText value={leader.change} />
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="fg-htt__cell">
        <IssueLink issues={issues} themeId={theme.id} state={state} />
      </td>
    </tr>
  )
}

function ListRow({ theme, issues, state }: RowProps) {
  const change = weightedChangeOf(theme)
  const leader = themeLeader(theme)
  const showIssue = issues.status !== 'not-ready' && issues.status !== 'error'
  return (
    <li className="fg-htt__item">
      <span className="fg-htt__top">
        <span className="fg-htt__who">
          <ThemeName theme={theme} state={state} />
          <span className="fg-htt__sub fg-num">
            {leader && (
              <>
                주도주{' '}
                <span className="fg-lg fg-lg--s">
                  <CompanyLogo name={leader.name} size={16} />
                  {leader.name}
                </span>
                {' · '}
              </>
            )}
            {`상승 ${theme.upCount ?? 0} · 하락 ${theme.downCount ?? 0}`}
          </span>
        </span>
        <span className="fg-htt__chgwrap">
          <span className="fg-htt__chg fg-num">{change === null ? '—' : <ChangeText value={change} />}</span>
          <ThemeAverageLine theme={theme} className="fg-htt__avg" />
        </span>
      </span>
      {showIssue && <IssueLink issues={issues} themeId={theme.id} state={state} />}
    </li>
  )
}

interface HomeThemeTableProps {
  hot: ApiState<ThemeRes[] | null>
  issues: Issues
  basis: string | null
}

export function HomeThemeTable({ hot, issues, basis }: HomeThemeTableProps) {
  const { pathname, search } = useLocation()
  const narrow = useMediaQuery(NARROW)
  const themes = useMemo(() => (hot.data ? pickHubThemes(hot.data) : null), [hot.data])
  const skeleton = useDelayed(themes === null && !hot.error)
  const state = fromState(`${pathname}${search}`)
  const ready = issues.status === 'ready'
  const caption = [ORDER_NOTE, !narrow && ready ? ISSUE_NOTE : null, basis].filter(Boolean).join(' · ')

  let body: ReactNode
  if (hot.error && themes === null) {
    body = (
      <StateBlock
        kind="error"
        title="데이터를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={hot.refetch}>
            다시 시도
          </Button>
        }
      />
    )
  } else if (themes === null) {
    body = skeleton ? (
      <div className="fg-htt__skel" aria-hidden="true">
        {Array.from({ length: HUB_THEME_LIMIT }, (_, i) => (
          <Skeleton key={i} height={40} />
        ))}
      </div>
    ) : (
      <div className="fg-htt__skel" />
    )
  } else if (themes.length === 0) {
    body = (
      <StateBlock kind="empty" title="움직인 테마를 아직 고르지 못했어요" description="시세가 충분히 모이면 여기에 보여 드려요" />
    )
  } else if (narrow) {
    body = (
      <ul className="fg-htt__list">
        {themes.map((theme) => (
          <ListRow key={theme.id} theme={theme} issues={issues} state={state} />
        ))}
      </ul>
    )
  } else {
    body = (
      <div className="fg-table-wrap fg-htt__wrap" role="region" aria-label="오늘 움직인 테마 표" tabIndex={0}>
        <table className="fg-htt__table">
          <thead>
            <tr>
              <th scope="col">테마</th>
              <th scope="col" className="fg-htt__num">
                등락률
              </th>
              <th scope="col" className="fg-htt__num">
                상승 / 하락
              </th>
              <th scope="col" className="fg-htt__num">
                주도주
              </th>
              <th scope="col">
                <span className="fg-htt__ihead">
                  대표 이슈
                  {issues.status === 'not-ready' && <span className="fg-htt__gap">준비 중</span>}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {themes.map((theme) => (
              <TableRow key={theme.id} theme={theme} issues={issues} state={state} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className="fg-section fg-hsec fg-htt" aria-labelledby="fg-themes-h">
      <div className="fg-hsec__head">
        <div className="fg-hsec__titles">
          <h2 id="fg-themes-h" className="fg-hsec__title">
            오늘 움직인 테마
          </h2>
          <span className="fg-hsec__cap fg-num">{caption}</span>
        </div>
        <Link to="/themes" className="fg-hsec__link">
          {narrow ? '전체' : '테마 전체 보기'}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>
      {body}
      {issues.status === 'error' && themes && themes.length > 0 && (
        <p className="fg-htt__fail" role="status">
          <span>대표 이슈를 불러오지 못했어요</span>
          <RetryText subject="대표 이슈" onRetry={issues.retry} />
        </p>
      )}
    </section>
  )
}
