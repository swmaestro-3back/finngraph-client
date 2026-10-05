import type { RefObject } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/fg/Badge'
import { Button, ButtonLink } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { SideSheet } from '@/components/fg/SideSheet'
import { formatChange } from '@/lib/format'
import { formatPriceWon, toneClass } from '@/lib/fg/format'
import { issuePath } from '@/lib/fg/paths'
import { issueBadge, reportedLabel, shortDate, tradingDayLabel, type PlacedIssue } from '@/lib/fg/stockIssues'

const SHEET_NOTE = '요약은 AI가 묶인 기사로 만든 참고 자료이며 투자 권유가 아니에요.'

interface IssuePreviewSheetProps {
  stockName: string
  issue: PlacedIssue | null
  steps: readonly PlacedIssue[]
  refYear: number
  sharePath: string
  returnFocusRef: RefObject<HTMLElement | null>
  onPick: (key: string) => void
  onClose: () => void
}

export function IssuePreviewSheet({
  stockName,
  issue,
  steps,
  refYear,
  sharePath,
  returnFocusRef,
  onPick,
  onClose,
}: IssuePreviewSheetProps) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`)
      toast.success('링크를 복사했어요', { description: sharePath })
    } catch {
      toast.error('링크를 복사하지 못했어요')
    }
  }
  return (
    <SideSheet
      open={issue !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      closeLabel="이슈 미리보기 닫기"
      returnFocusRef={returnFocusRef}
      title={issue?.title ?? ''}
      meta={
        issue && (
          <span className="fg-isheet__kicker">
            <Badge tone={issue.total > 1 ? 'issue' : 'neutral'}>{issueBadge(issue)}</Badge>
            <span>{`${issue.media}개 매체 보도 · 기사 ${issue.articles}건`}</span>
          </span>
        )
      }
    >
      {issue && (
        <>
          <span className="fg-isheet__when">{reportedLabel(issue, refYear)}</span>
          <div className="fg-isheet__sum">
            <Badge strong>AI 요약</Badge>
            <p>{issue.summary}</p>
          </div>
          {issue.change !== null && (
            <div className="fg-isheet__day fg-num">
              <span>{`${tradingDayLabel(issue)} ${stockName}`}</span>
              <b className={toneClass(issue.change)}>{formatChange(issue.change)}</b>
              <small>{`종가 ${formatPriceWon(issue.close)}`}</small>
            </div>
          )}
          {steps.length > 1 && (
            <div className="fg-isheet__sec">
              <span className="fg-isheet__label">{`이 흐름의 이슈 ${steps.length}개`}</span>
              <ol className="fg-isheet__steps">
                {steps.map((step) => {
                  const now = step.key === issue.key
                  return (
                    <li key={step.key} data-now={now ? 'true' : undefined}>
                      <button type="button" aria-current={now ? 'step' : undefined} onClick={() => onPick(step.key)}>
                        <span className="fg-isheet__date fg-num">{shortDate(step.date)}</span>
                        <span>{step.title}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
          {issue.with.length > 0 && (
            <div className="fg-isheet__sec">
              <span className="fg-isheet__label">함께 나온 종목</span>
              <span className="fg-isheet__with">
                {issue.with.map((name) => (
                  <span key={name} className="fg-lg">
                    <CompanyLogo name={name} size={24} />
                    <span>{name}</span>
                  </span>
                ))}
                {issue.more > 0 && <span className="fg-isheet__more">{`외 ${issue.more}`}</span>}
              </span>
            </div>
          )}
          <div className="fg-isheet__acts">
            <ButtonLink to={issuePath(issue.key)} variant="primary">
              이슈 페이지에서 보기
            </ButtonLink>
            <Button onClick={copy}>링크 복사</Button>
          </div>
          <Disclaimer text={SHEET_NOTE} className="fg-isheet__note" />
        </>
      )}
    </SideSheet>
  )
}
