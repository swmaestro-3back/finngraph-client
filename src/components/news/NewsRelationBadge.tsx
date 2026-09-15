import { Badge } from '@/components/ui/badge'

/**
 * 트리플 추출 결과 관계가 있는 뉴스에만 붙는 표식 — 상세 모달에서 관계망을 볼 수 있다는 뜻.
 * 그래프 간선 상세의 뉴스·공시 출처 뱃지와 같은 틀(각진 아웃라인 + 연한 채움)이고, 색만 초록으로 구분한다.
 */
export function NewsRelationBadge({ tripleExtracted }: { tripleExtracted: boolean | null }) {
  if (tripleExtracted !== true) return null
  return (
    <Badge
      variant="outline"
      className="h-5 shrink-0 rounded-sm border-trend-positive/25 bg-trend-positive/8 px-2 text-caption font-semibold tracking-[0.2px] text-trend-positive/85"
    >
      분석
    </Badge>
  )
}
