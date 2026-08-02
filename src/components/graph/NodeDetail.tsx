import { NODE_COLORS, ENTITY_LABELS, type GraphNode } from '@/data/graphTypes'
import { EntityChip, Section, TypeBadge } from '@/components/graph/DetailParts'

const MAX_CONNECTED = 16

interface Props {
  node: GraphNode
  connectedNodes: GraphNode[]
  onNodeSelect?: (node: GraphNode) => void
}

/** 엔티티(노드) 상세 */
export function NodeDetail({ node, connectedNodes, onNodeSelect }: Props) {
  const aliases = node.data.aliases ?? []
  const shown = connectedNodes.slice(0, MAX_CONNECTED)
  const rest = connectedNodes.length - shown.length

  return (
    <>
      <div className="mb-4">
        <TypeBadge color={NODE_COLORS[node.type]}>{ENTITY_LABELS[node.type]}</TypeBadge>
      </div>

      <h2 className="mt-0 mb-3 text-xl leading-[1.25] font-semibold tracking-[-0.4px] text-foreground">
        {node.label}
      </h2>

      {node.data.description && (
        <p className="mt-0 mb-4 text-[13px] leading-relaxed text-[#5b616e]">
          {node.data.description}
        </p>
      )}

      {aliases.length > 0 && (
        <Section title="다른 이름">
          <div className="flex flex-wrap gap-1.5">
            {aliases.map((alias) => (
              <EntityChip key={alias} label={alias} />
            ))}
          </div>
        </Section>
      )}

      {connectedNodes.length > 0 && (
        <Section title={`연결된 엔티티 (${connectedNodes.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {shown.map((cn) => (
              <EntityChip
                key={cn.id}
                label={cn.label}
                type={cn.type}
                onClick={onNodeSelect && (() => onNodeSelect(cn))}
              />
            ))}
            {rest > 0 && (
              <span className="self-center text-[11px] text-muted-foreground">+{rest}</span>
            )}
          </div>
        </Section>
      )}
    </>
  )
}
