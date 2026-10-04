import { CircleAlert, RotateCw } from 'lucide-react'
import { IpoAfterListingSection } from '@/components/calendar/ipo/IpoAfterListingSection'
import { IpoCompanySection } from '@/components/calendar/ipo/IpoCompanySection'
import { IpoDetailHeader } from '@/components/calendar/ipo/IpoDetailHeader'
import { IpoOfferingSection } from '@/components/calendar/ipo/IpoOfferingSection'
import { IpoSourceFooter } from '@/components/calendar/ipo/IpoSourceFooter'
import { IpoTimelineSection } from '@/components/calendar/ipo/IpoTimelineSection'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { IpoRes } from '@/lib/apiTypes'
import { afterListingState, type IpoDetailTarget } from '@/lib/ipoDetail'
import { useIpoDetail } from '@/lib/queries/useIpoDetail'
import { cn } from '@/lib/utils'

const PULSE = 'animate-pulse rounded-lg bg-muted motion-reduce:animate-none'

interface IpoDetailBodyProps {
  target: IpoDetailTarget
  fallback: IpoRes | null
  from: string
  today: string
  onClose: () => void
}

export function IpoDetailBody({ target, fallback, from, today, onClose }: IpoDetailBodyProps) {
  const { data, loading, error, refetch } = useIpoDetail(target)
  const name = fallback?.name ?? '공모주'

  if (error && !loading) {
    const notFound = error.isNotFound
    return (
      <div className="px-6 pt-7 pb-10 sm:px-8">
        <DialogTitle className="pr-8 text-title font-medium tracking-[-0.5px] text-foreground">
          {notFound ? '공모 정보를 찾을 수 없습니다' : name}
        </DialogTitle>
        <DialogDescription className="sr-only">공모 정보 조회 실패</DialogDescription>
        <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <p className="text-body text-muted-foreground break-keep">
            {notFound
              ? '철회됐거나 더 이상 조회되지 않는 공모입니다.'
              : error.isRetryable
                ? '일시적으로 공모 정보를 불러올 수 없습니다.'
                : '공모 정보를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.'}
          </p>
          {!notFound && error.isRetryable ? (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RotateCw data-icon="inline-start" />
              다시 시도
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onClose}>
              닫기
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!data || loading) {
    return (
      <div aria-busy="true" className="px-6 pt-7 pb-10 sm:px-8">
        <DialogTitle className="pr-8 text-title font-medium tracking-[-0.5px] text-foreground">{name}</DialogTitle>
        <DialogDescription className="mt-1 text-caption text-muted-foreground">공모 정보를 불러오는 중</DialogDescription>
        <div className={cn('mt-4 h-6 w-40', PULSE)} />
        <div className="my-6 border-t border-border" />
        <div className={cn('h-28', PULSE)} />
        <div className={cn('mt-4 h-40', PULSE)} />
      </div>
    )
  }

  return (
    <div className="min-h-0 overflow-y-auto">
      <IpoDetailHeader detail={data} from={from} today={today} onNavigate={onClose} />
      <div className="border-t border-border lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 [&>section:first-child]:border-t-0">
          <IpoTimelineSection detail={data} today={today} />
          <IpoOfferingSection detail={data} />
        </div>
        <div className="min-w-0 lg:border-l lg:border-border lg:[&>section:first-child]:border-t-0">
          <IpoCompanySection company={data.company} />
          {afterListingState(data) !== 'hidden' && <IpoAfterListingSection detail={data} />}
        </div>
      </div>
      <IpoSourceFooter detail={data} />
    </div>
  )
}
