import { useMemo, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import {
  CATEGORY_LABELS,
  PREDICATE_LABELS,
  endId,
  nodeCategory,
  nodeColor,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import {
  ChangeText,
  LEDGER_ROW,
  MoreButton,
  NodeMark,
  RowAction,
  RowSkeleton,
  Section,
} from '@/components/graph/DetailParts'
import {
  groupNewsByDay,
  itemsLine,
  latestMentions,
  monthlyCounts,
  rankItems,
  type EvidenceDay,
  type EvidenceNews,
} from '@/lib/edgeEvidence'
import { formatShortDate } from '@/lib/format'
import { formatPeriod } from '@/lib/linkCard'
import { useNewsBriefs } from '@/lib/queries/useNewsBriefs'
import { cn } from '@/lib/utils'

interface Props {
  link: GraphLink
  source: GraphNode
  target: GraphNode
  /** 같은 두 기업 사이의 다른 관계 — 반대 방향 공급, 인수와 공급이 함께 있는 경우 */
  siblings: GraphLink[]
  /** 양 끝 기업을 누르면 그 노드로 선택을 옮긴다 — 거기서 재중심으로 이어진다 */
  onNodeSelect?: (node: GraphNode) => void
  onLinkSelect?: (link: GraphLink) => void
  /** 근거 기사를 누르면 상세 모달로 — KG 근거 뉴스는 전부 삼중항 추출분이라 미분석 케이스가 없다 */
  onOpenNews?: (newsId: string) => void
}

const DART_VIEWER = 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo='

/** 제목을 불러올 기사 상한 — 일괄 조회가 없어 기사마다 한 번씩 부른다 */
const MAX_NEWS = 12
const MAX_ITEMS = 5
/** 처음에 펼쳐 두는 날짜 묶음 수 */
const MAX_DAYS = 3
/** 월별 막대를 그리는 기간 상한 — 이보다 길면 막대가 실처럼 가늘어진다 */
const MAX_MONTHS = 12

/**
 * 간선 상세. 위에서부터 누가 누구에게(레일) → 무엇을(품목 순위) → 언제(월별 언급) → 근거(기사·공시) 순으로 읽힌다.
 * 품목·건수·기간은 kg-api가 관계에 실어 보낸 것을 그대로 쓰고, 기사 제목만 메인 백엔드에서 따로 불러온다.
 * 이벤트 간선(HAS_EVENT)은 선택되지 않으므로 여기 오지 않는다.
 */
export function EdgeDetail({
  link,
  source,
  target,
  siblings,
  onNodeSelect,
  onLinkSelect,
  onOpenNews,
}: Props) {
  const color = nodeColor(source)
  const newsCount = link.news_mention_count ?? link.news?.length ?? 0
  const disclosureCount = link.disclosure_count ?? link.disclosures?.length ?? 0
  // 0건인 종류는 말하지 않는다 — "공시 0건"은 없는 것을 알리는 노이즈다
  const countMeta = [
    newsCount > 0 && `뉴스 ${newsCount}건`,
    disclosureCount > 0 && `공시 ${disclosureCount}건`,
  ]
    .filter(Boolean)
    .join(' · ')

  const items = useMemo(() => rankItems(link), [link])
  const maxItemCount = Math.max(1, ...items.map((i) => i.count))

  const mentions = useMemo(() => latestMentions(link, MAX_NEWS), [link])
  const { briefs, loading } = useNewsBriefs(mentions.map((m) => m.id))
  const news: EvidenceNews[] = mentions.map((m) => {
    const brief = briefs.get(m.id)
    return { id: m.id, title: brief?.title ?? null, publishedAt: brief?.publishedAt ?? null, item: m.item }
  })
  // 선택을 옮긴 직후에는 이전 간선의 결과가 남아 있다 — 이 간선의 제목이 하나라도 비어 있으면 아직 오는 중이다
  const titlesPending = loading && news.some((n) => n.title === null)
  const days = groupNewsByDay(news)

  // 월별 막대는 모든 근거 기사의 날짜를 알 때만 — 일부만 불러왔으면 빈 달이 거짓말이 된다
  const months = monthlyCounts(news.map((n) => n.publishedAt))
  const showMonths =
    !titlesPending &&
    newsCount <= mentions.length &&
    months.length >= 2 &&
    months.length <= MAX_MONTHS
  const maxMonthCount = Math.max(1, ...months.map((m) => m.count))
  const period = formatPeriod(link.first_mentioned_at, link.last_mentioned_at)

  const disclosures = useMemo(() => {
    const byId = new Map<string, string | null>()
    link.disclosures?.forEach((d) => {
      if (!byId.has(d.rcept_no)) byId.set(d.rcept_no, d.item)
    })
    return [...byId].map(([rceptNo, item]) => ({ rceptNo, item }))
  }, [link])

  return (
    <>
      {/* 캔버스의 간선을 세워 놓은 레일 — 선 색도 켜진 간선과 같은 출발 기업 색이다 */}
      <div className="mb-5">
        <Party node={source} onSelect={onNodeSelect} />
        <div className="flex items-center gap-2.5">
          <span className="flex w-6 shrink-0 justify-center">
            <span className="h-7 w-0.5 rounded-full" style={{ background: color }} />
          </span>
          <span className="flex items-center gap-1 text-caption text-muted-foreground">
            <ArrowDown className="size-3.5" strokeWidth={2} />
            <span className="font-semibold text-foreground">{PREDICATE_LABELS[link.type]}</span>
            {countMeta && <span>{countMeta}</span>}
          </span>
        </div>
        <Party node={target} onSelect={onNodeSelect} />
      </div>

      {link.reason && (
        <Section title="편입 사유">
          <p className="m-0 text-body leading-relaxed text-foreground">{link.reason}</p>
        </Section>
      )}

      {items.length > 0 && (
        <Section title="공급 제품" meta="언급 기사">
          <ul className="m-0 list-none space-y-1.5 p-0">
            {items.slice(0, MAX_ITEMS).map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-body',
                    item.generic ? 'text-muted-foreground' : 'text-foreground',
                  )}
                  title={item.text}
                >
                  {item.text}
                </span>
                <span className="flex w-12 shrink-0">
                  <span
                    className={cn('h-1 rounded-full', item.generic && 'bg-border')}
                    style={{
                      width: `${(item.count / maxItemCount) * 100}%`,
                      background: item.generic ? undefined : color,
                    }}
                  />
                </span>
                <span className="w-4 shrink-0 text-right font-mono text-caption text-foreground">
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
          {items.length > MAX_ITEMS && (
            <p className="mt-1.5 mb-0 text-caption text-muted-foreground">
              외 {items.length - MAX_ITEMS}개 제품
            </p>
          )}
        </Section>
      )}

      {showMonths && (
        <Section title="언급 시기" meta={period}>
          <div className="flex h-9 items-end gap-1">
            {months.map((m) => (
              <div key={m.key} className="flex h-full flex-1 items-end" title={`${m.month}월 ${m.count}건`}>
                <div
                  className={cn('w-full rounded-sm', m.count === 0 && 'bg-border')}
                  style={
                    m.count === 0
                      ? { height: 1 }
                      : { height: `${Math.max(12, (m.count / maxMonthCount) * 100)}%`, background: color }
                  }
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 font-mono text-micro text-muted-foreground">
            {months.map((m) => (
              <span key={m.key} className="flex-1 text-center">
                {m.month}월
              </span>
            ))}
          </div>
        </Section>
      )}

      {mentions.length > 0 && (
        <Section title="출처 기사" meta={showMonths ? '최신순' : (period ?? '최신순')}>
          {titlesPending ? (
            <RowSkeleton rows={Math.min(3, mentions.length)} />
          ) : (
            <EvidenceDays key={link.id} days={days} onOpenNews={onOpenNews} />
          )}
          {newsCount > mentions.length && (
            <p className="mt-2 mb-0 text-caption text-muted-foreground">
              최근 {mentions.length}건만 보여줍니다. 전체 {newsCount}건.
            </p>
          )}
        </Section>
      )}

      {disclosures.length > 0 && (
        <Section title="출처 공시" meta="DART 원문">
          <ul className="m-0 list-none p-0">
            {disclosures.map((d) => (
              <li key={d.rceptNo} className="border-t border-border py-2.5">
                <a
                  href={`${DART_VIEWER}${d.rceptNo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-body leading-snug text-foreground hover:underline"
                >
                  {d.item ?? '공시 항목 정보 없음'}
                </a>
                <div className="mt-0.5 font-mono text-caption text-muted-foreground">
                  접수번호 {d.rceptNo}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {siblings.length > 0 && onLinkSelect && (
        <Section title="두 기업 사이 다른 관계">
          <ul className="m-0 list-none p-0">
            {siblings.map((s) => {
              const forward = endId(s.source) === source.id
              const from = forward ? source : target
              const to = forward ? target : source
              const what = itemsLine(s)
              return (
                <li key={s.id} className={LEDGER_ROW}>
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 truncate text-body text-foreground">
                      {from.label} → {to.label}
                    </span>
                    <span className="shrink-0 text-caption font-semibold text-foreground">
                      {PREDICATE_LABELS[s.type]}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-caption text-foreground">
                      {s.mentioned_count}
                    </span>
                  </div>
                  {what && <p className="m-0 mt-0.5 truncate text-caption text-muted-foreground">{what}</p>}
                  <RowAction
                    label={`${from.label}에서 ${to.label}로 ${PREDICATE_LABELS[s.type]} 관계 보기`}
                    onClick={() => onLinkSelect(s)}
                  />
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </>
  )
}

/** 레일의 한쪽 끝 — 기업(또는 테마) 한 줄. 누르면 그 노드로 선택이 옮겨간다 */
function Party({
  node,
  onSelect,
}: {
  node: GraphNode
  onSelect?: (node: GraphNode) => void
}) {
  const body = (
    <>
      <NodeMark node={node} />
      <span className="min-w-0 flex-1 truncate text-left text-body font-semibold text-foreground">
        {node.label}
      </span>
      <span className="shrink-0 text-caption text-muted-foreground">
        {CATEGORY_LABELS[nodeCategory(node)]}
      </span>
      <ChangeText value={node.data.quote?.change} className="shrink-0 text-caption" />
    </>
  )
  if (!onSelect) return <div className="flex items-center gap-2.5 py-1.5">{body}</div>
  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted"
    >
      {body}
    </button>
  )
}

/** 날짜별 근거 기사 — 처음 몇 날만 펼치고 나머지는 [기사 N건 더 보기] */
function EvidenceDays({
  days,
  onOpenNews,
}: {
  days: EvidenceDay[]
  onOpenNews?: (newsId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const shown = open ? days : days.slice(0, MAX_DAYS)
  const rest = days.slice(shown.length).reduce((sum, d) => sum + d.news.length, 0)
  return (
    <>
      <ul className="m-0 list-none p-0">
        {shown.map((day) => (
          <EvidenceDayRow key={day.date ?? 'undated'} day={day} onOpenNews={onOpenNews} />
        ))}
      </ul>
      {rest > 0 && <MoreButton onClick={() => setOpen(true)}>{`기사 ${rest}건 더 보기`}</MoreButton>}
    </>
  )
}

/** 하루치 기사 — 한 사건을 여러 매체가 받아쓴 날은 첫 기사만 보이고 나머지는 접는다 */
function EvidenceDayRow({
  day,
  onOpenNews,
}: {
  day: EvidenceDay
  onOpenNews?: (newsId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const shown = open ? day.news : day.news.slice(0, 1)
  const rest = day.news.length - shown.length
  return (
    <li className="flex gap-2.5 border-t border-border py-2.5">
      <span className="w-9 shrink-0 pt-px font-mono text-caption text-muted-foreground">
        {formatShortDate(day.date)}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {shown.map((n) => (
          <div key={n.id}>
            {onOpenNews ? (
              <button
                type="button"
                onClick={() => onOpenNews(n.id)}
                className="block w-full cursor-pointer text-left text-body leading-snug text-foreground hover:underline"
              >
                {n.title ?? '제목을 불러오지 못한 기사'}
              </button>
            ) : (
              <p className="m-0 text-body leading-snug text-foreground">
                {n.title ?? '제목을 불러오지 못한 기사'}
              </p>
            )}
            {n.item && <div className="mt-0.5 text-caption text-muted-foreground">{n.item}</div>}
          </div>
        ))}
        {rest > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer text-caption text-muted-foreground hover:text-foreground hover:underline"
          >
            같은 날 기사 {rest}건 더
          </button>
        )}
      </div>
    </li>
  )
}
