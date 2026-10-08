import type { ReactNode, RefObject } from 'react'
import { DetailLoading } from '@/components/calendar/detail/DetailParts'
import { IpoAfterListingSection } from '@/components/calendar/ipo/IpoAfterListingSection'
import { IpoCompanySection } from '@/components/calendar/ipo/IpoCompanySection'
import { IpoDetailHeader, IpoDetailMeta } from '@/components/calendar/ipo/IpoDetailHeader'
import { IpoOfferingSection } from '@/components/calendar/ipo/IpoOfferingSection'
import { IpoSourceFooter } from '@/components/calendar/ipo/IpoSourceFooter'
import { IpoTimelineSection } from '@/components/calendar/ipo/IpoTimelineSection'
import { Button } from '@/components/fg/Button'
import { SideSheet } from '@/components/fg/SideSheet'
import { StateBlock } from '@/components/fg/StateBlock'
import type { IpoRes } from '@/lib/apiTypes'
import { afterListingState, type IpoDetailTarget } from '@/lib/ipoDetail'
import { useIpoDetail } from '@/lib/queries/useIpoDetail'

interface IpoDetailBodyProps {
  target: IpoDetailTarget
  fallback: IpoRes | null
  open: boolean
  from: string
  today: string
  returnFocusRef: RefObject<HTMLElement | null>
  onOpenChange: (open: boolean) => void
}

export function IpoDetailBody({ target, fallback, open, from, today, returnFocusRef, onOpenChange }: IpoDetailBodyProps) {
  const { data, loading, error, refetch } = useIpoDetail(target)
  const name = fallback?.name ?? '공모주'
  const onClose = () => onOpenChange(false)

  let title: string
  let meta: ReactNode = null
  let body: ReactNode

  if (error && !loading) {
    const notFound = error.isNotFound
    title = notFound ? '공모 정보를 찾을 수 없습니다' : name
    body = (
      <StateBlock
        kind="error"
        className="fg-cal-dstate"
        title={
          notFound
            ? '철회됐거나 더 이상 조회되지 않는 공모입니다.'
            : error.isRetryable
              ? '일시적으로 공모 정보를 불러올 수 없습니다.'
              : '공모 정보를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.'
        }
        action={
          !notFound && error.isRetryable ? (
            <Button size="sm" onClick={refetch}>
              다시 시도
            </Button>
          ) : (
            <Button size="sm" onClick={onClose}>
              닫기
            </Button>
          )
        }
      />
    )
  } else if (!data || loading) {
    title = name
    meta = <span className="fg-cal-dkick">공모 정보를 불러오는 중</span>
    body = <DetailLoading />
  } else {
    title = data.name
    meta = <IpoDetailMeta detail={data} />
    body = (
      <div className="fg-cal-detail">
        <IpoDetailHeader detail={data} from={from} today={today} onNavigate={onClose} />
        <IpoTimelineSection detail={data} today={today} />
        <IpoOfferingSection detail={data} />
        <IpoCompanySection company={data.company} />
        {afterListingState(data) !== 'hidden' && <IpoAfterListingSection detail={data} />}
        <IpoSourceFooter detail={data} />
      </div>
    )
  }

  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      meta={meta}
      closeLabel="공모주 상세 닫기"
      returnFocusRef={returnFocusRef}
      variant="modal"
    >
      {body}
    </SideSheet>
  )
}
