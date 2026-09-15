import { Badge } from '@/components/ui/badge'

/** 트리플 추출 결과 관계가 있는 뉴스에만 붙는 표식 — 상세 모달에서 관계망을 볼 수 있다는 뜻 */
export function NewsRelationBadge({ tripleExtracted }: { tripleExtracted: boolean | null }) {
  if (tripleExtracted !== true) return null
  return (
    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
      분석
    </Badge>
  )
}
