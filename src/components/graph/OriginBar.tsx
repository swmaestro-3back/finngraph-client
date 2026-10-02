import { useState } from 'react'
import { Search } from 'lucide-react'
import type { GraphFocus, GraphNode } from '@/data/graphTypes'
import { NodeMark } from '@/components/graph/DetailParts'
import { SearchBar } from '@/components/search/SearchBar'
import type { SearchableStock, SearchableTheme } from '@/lib/searchResults'

interface Props {
  /** 지금 조회의 중심 노드 — 응답에서 찾지 못했으면 없다 */
  center?: GraphNode
  stocks: readonly SearchableStock[]
  themes: readonly SearchableTheme[]
  /** 다른 종목·테마를 고르면 그것을 새 원점으로 그래프를 다시 그린다 */
  onSelect: (focus: GraphFocus) => void
}

/**
 * 원점 바 — 평소에는 지금 그래프의 중심이 무엇인지 보여주고, 누르면 그 자리에서 다른 종목·테마를 찾는다.
 * 주소창과 같다: 값이 곧 현재 위치다. 헤더의 종목 검색(종목 상세로 간다)과는 생김새부터 다르다.
 * 위치는 부모가 잡는다 — 렌즈·범위·Hop과 한 줄에 놓인다.
 */
export function OriginBar({ center, stocks, themes, onSelect }: Props) {
  const [searching, setSearching] = useState(false)

  if (searching || !center) {
    return (
      <div
        className="flex h-10.5 w-72 max-w-full items-center [&>div]:w-full [&_input]:bg-background"
        // 포커스가 검색창 밖으로 나가면(선택 완료 포함) 다시 중심 표시로 돌아간다
        onBlur={(e) => {
          if (center && !e.currentTarget.contains(e.relatedTarget)) setSearching(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && center) setSearching(false)
        }}
      >
        <SearchBar
          stocks={stocks}
          themes={themes}
          onSelect={onSelect}
          placeholder="다른 종목 · 테마로 바꾸기"
          autoFocus={searching}
        />
      </div>
    )
  }

  const ticker = center.data.ticker
  return (
    <button
      type="button"
      onClick={() => setSearching(true)}
      aria-label={`중심 ${center.label} — 다른 종목이나 테마로 바꾸기`}
      className="flex h-10.5 max-w-full cursor-pointer items-center gap-2 rounded-lg border border-border bg-background/90 pr-3 pl-2 shadow-soft backdrop-blur hover:border-border-strong"
    >
      <NodeMark node={center} size={22} />
      <span className="min-w-0 truncate text-body font-semibold text-foreground">{center.label}</span>
      <span className="shrink-0 font-mono text-caption text-muted-foreground">
        {ticker ?? '테마'}
      </span>
      <Search className="ml-1.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
    </button>
  )
}
