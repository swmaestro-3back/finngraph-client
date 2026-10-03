import { CircleAlert, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { ApiError } from '@/lib/api'

interface NotFoundCopy {
  title: string
  message: string
  /** 목록으로 돌아가는 링크 */
  action: { to: string; label: string }
}

interface ErrorStateProps {
  error: ApiError
  onRetry: () => void
  /** 상세 페이지 전용 — 404면 이 문구와 링크를, 그 외 오류면 '일시적인 오류' 제목을 붙인다 */
  notFound?: NotFoundCopy
}

/** 페이지 본문 자리에 놓는 조회 실패 상태 — 재시도가 의미 있는 오류(503·네트워크·타임아웃)에만 버튼을 낸다 */
export function ErrorState({ error, onRetry, notFound }: ErrorStateProps) {
  const notFoundCopy = notFound !== undefined && error.isNotFound ? notFound : null
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <CircleAlert className="size-8 text-muted-foreground" />
      {notFound && (
        <h1 className="text-lg font-medium text-foreground">
          {notFoundCopy ? notFoundCopy.title : '일시적인 오류'}
        </h1>
      )}
      <p className="text-body text-muted-foreground">
        {notFoundCopy
          ? notFoundCopy.message
          : error.isRetryable
            ? '일시적으로 데이터를 불러올 수 없습니다.'
            : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
      </p>
      {notFoundCopy ? (
        <Button variant="outline" size="sm" asChild>
          <Link to={notFoundCopy.action.to}>{notFoundCopy.action.label}</Link>
        </Button>
      ) : (
        error.isRetryable && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw data-icon="inline-start" />
            다시 시도
          </Button>
        )
      )}
    </div>
  )
}
