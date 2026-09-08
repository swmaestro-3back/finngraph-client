import { ExternalLink, Share2 } from 'lucide-react'
import { CATEGORY_LABELS, nodeCategory, nodeColor, type GraphNode } from '@/data/graphTypes'
import { eventInfo, eventPeriod } from '@/lib/graphEvent'
import { EntityChip, Section, TypeBadge } from '@/components/graph/DetailParts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const MAX_KEYWORDS = 8

interface Props {
  node: GraphNode
  /** 그래프에 있는 기업을 이름으로 찾는다 — 이벤트의 companies는 문자열이라 이름으로만 맞춘다 */
  nodesByLabel: Map<string, GraphNode>
  onNodeSelect?: (node: GraphNode) => void
  /** 이벤트 렌즈 hop 2로 — 이 이벤트를 공유하는 다른 기업을 본다. 이미 그 안이면 넘어오지 않는다 */
  onShowSharing?: () => void
  /** 대표 뉴스를 모달로 — 뉴스 id 체계가 다르면 넘어오지 않는다 */
  onOpenNews?: (newsId: string) => void
}

/**
 * 이벤트(뉴스 클러스터) 상세. 기업 패널과 달리 재중심 버튼이 없다 — 이벤트를 중심으로 조회하는 엔드포인트가 없다.
 * 대신 [이 이벤트를 공유하는 기업]이 파급 탐색의 입구다.
 */
export function EventDetail({ node, nodesByLabel, onNodeSelect, onShowSharing, onOpenNews }: Props) {
  const info = eventInfo(node)
  const period = eventPeriod(info.firstPublishedAt, info.lastPublishedAt)
  const keywords = info.keywords.slice(0, MAX_KEYWORDS)

  return (
    <>
      <div className="mb-4">
        <TypeBadge color={nodeColor(node)}>{CATEGORY_LABELS[nodeCategory(node)]}</TypeBadge>
      </div>

      <h2 className="mt-0 mb-2 text-xl leading-[1.3] font-semibold tracking-[-0.4px] text-foreground">
        {node.label}
      </h2>
      {(info.memberCount != null || period) && (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-2 font-mono text-caption text-muted-foreground">
          {info.memberCount != null && <span>뉴스 {info.memberCount}건</span>}
          {period && <span>{period}</span>}
        </div>
      )}

      {(onShowSharing || (onOpenNews && info.representativeNewsId != null)) && (
        <div className="mb-5 flex flex-wrap gap-2">
          {onShowSharing && (
            <Button size="sm" className="flex-1" onClick={onShowSharing}>
              <Share2 data-icon="inline-start" />
              이 이벤트를 공유하는 기업
            </Button>
          )}
          {onOpenNews && info.representativeNewsId != null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenNews(String(info.representativeNewsId))}
            >
              대표 뉴스 보기
              <ExternalLink data-icon="inline-end" />
            </Button>
          )}
        </div>
      )}

      {keywords.length > 0 && (
        <Section title="키워드">
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((k) => (
              <Badge key={k} variant="secondary">
                {k}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {info.companies.length > 0 && (
        <Section title={`언급 기업 (${info.companies.length})`} meta="그래프에 있는 기업은 눌러서 선택">
          <div className="flex flex-wrap gap-1.5">
            {info.companies.map((name) => {
              const hit = nodesByLabel.get(name)
              return (
                <EntityChip
                  key={name}
                  label={name}
                  color={hit ? nodeColor(hit) : undefined}
                  onClick={hit && onNodeSelect ? () => onNodeSelect(hit) : undefined}
                />
              )
            })}
          </div>
        </Section>
      )}
    </>
  )
}
