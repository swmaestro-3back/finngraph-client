import type { RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { IssuePathLead } from '@/components/fg/EvidenceSheet'
import { GapValue } from '@/components/fg/Gap'
import { GapBar } from '@/components/fg/HiddenLinkList'
import { ArticleLine } from '@/components/fg/IssueArticlesTab'
import { ChangeText } from '@/components/fg/PriceChange'
import { RetryText } from '@/components/fg/RetryText'
import { SideSheet } from '@/components/fg/SideSheet'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import { StockWatchButton } from '@/components/fg/StockActions'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import { articleRows } from '@/lib/fg/issueArticles'
import type { IssueArticleItem } from '@/lib/fg/issueRecords'
import { stockSheetTitle, type NewsStockCard } from '@/lib/fg/issueStocks'
import { stockPath } from '@/lib/fg/paths'
import { fromState } from '@/lib/navigation'

interface IssueStockSheetProps {
  card: NewsStockCard | null
  lead: string
  total: number
  articles: readonly IssueArticleItem[] | null
  failed: boolean
  onRetry: () => void
  onRetryQuotes: (() => void) | null
  watched: boolean
  onToggleWatch: () => void
  onOpenNews: (id: string) => void
  returnFocusRef: RefObject<HTMLElement | null>
  onClose: () => void
}

function ArticleList({
  articles,
  failed,
  onRetry,
  onOpenNews,
}: Pick<IssueStockSheetProps, 'articles' | 'failed' | 'onRetry' | 'onOpenNews'>) {
  if (failed) {
    return (
      <StateBlock
        kind="error"
        title="기사 목록을 불러오지 못했어요"
        description="잠시 뒤 다시 시도해 주세요"
        action={
          <Button size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        }
      />
    )
  }
  if (articles === null) {
    return (
      <div className="fg-istk__skel" aria-hidden="true">
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
    )
  }
  if (articles.length === 0) return <p className="fg-istk__empty">이 종목이 나온 기사를 찾지 못했어요</p>
  return (
    <ul className="fg-iar__list fg-istk__arts" aria-label="이 종목이 나온 기사">
      {articleRows(articles, 'time').map((row) => (
        <li key={row.item.id}>
          <ArticleLine row={row} onOpenNews={onOpenNews} />
        </li>
      ))}
    </ul>
  )
}

export function IssueStockSheet({
  card,
  lead,
  total,
  articles,
  failed,
  onRetry,
  onRetryQuotes,
  watched,
  onToggleWatch,
  onOpenNews,
  returnFocusRef,
  onClose,
}: IssueStockSheetProps) {
  const { pathname, search } = useLocation()
  const count = card ? (articles?.length ?? card.articles) : 0
  return (
    <SideSheet
      open={card !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      closeLabel="기사 목록 닫기"
      returnFocusRef={returnFocusRef}
      title={card ? stockSheetTitle(card.name, count) : ''}
      meta={
        card && (
          <span className="fg-esheet__kicker fg-num">
            <Badge>뉴스에 나온 종목</Badge>
            <span>{count === total ? `묶인 기사 ${total}건 모두` : `묶인 기사 ${total}건 중 ${count}건`}</span>
          </span>
        )
      }
    >
      {card && (
        <>
          <div className="fg-rpath fg-istk__path" role="group" aria-label="이슈와 종목">
            <IssuePathLead title={lead}>
              <span className="fg-rpath__node">{card.name}</span>
            </IssuePathLead>
          </div>
          {card.role !== null ? (
            <div className="fg-istk__role">
              <span className="fg-esheet__label">뉴스 속 역할 · AI가 요약했어요</span>
              <p>{card.role}</p>
            </div>
          ) : (
            <p className="fg-istk__role fg-istk__role--gap">
              뉴스 속 역할 <GapValue gap="issues" />
            </p>
          )}
          <div className="fg-esheet__quotes">
            <span className="fg-esheet__label">이 종목이 나온 기사 · 최신순</span>
            <ArticleList articles={articles} failed={failed} onRetry={onRetry} onOpenNews={onOpenNews} />
          </div>
          <div className="fg-esheet__target fg-num">
            <div className="fg-esheet__trow">
              <span className="fg-esheet__who">
                <CompanyLogo name={card.name} size={24} />
                <b>{card.name}</b>
                <span>{marketLabel(card.market)}</span>
              </span>
              <span className="fg-esheet__px">
                {card.price === null && card.ticker && onRetryQuotes ? (
                  <RetryText subject={`${card.name} 시세`} onRetry={onRetryQuotes} />
                ) : (
                  <b>{card.price !== null ? formatPriceWon(card.price) : '—'}</b>
                )}
                {card.change !== null && <ChangeText value={card.change} />}
              </span>
            </div>
            <span className="fg-esheet__gap">
              <span>
                {card.newHigh ? '52주 최고' : '52주 최고 대비'}{' '}
                {card.newHigh ? <b>경신</b> : card.gapFromHigh !== null ? <b>{formatGapPct(card.gapFromHigh)}</b> : '—'}
              </span>
              {card.position !== null && <GapBar position={card.position} />}
            </span>
            <div className="fg-esheet__acts">
              {card.ticker ? (
                <ButtonLink to={stockPath(card.ticker)} state={fromState(`${pathname}${search}`)}>
                  종목 보기
                </ButtonLink>
              ) : (
                <Button disabled>종목 보기</Button>
              )}
              {card.ticker ? (
                <StockWatchButton stock={{ ticker: card.ticker, name: card.name }} />
              ) : (
                <Button aria-pressed={watched} onClick={onToggleWatch}>
                  {watched ? '관심 종목' : '관심 추가'}
                </Button>
              )}
            </div>
          </div>
          <Disclaimer className="fg-snote" />
        </>
      )}
    </SideSheet>
  )
}
