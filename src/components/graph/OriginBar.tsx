import { useState } from 'react'
import { Search } from 'lucide-react'
import type { GraphFocus, GraphNode } from '@/data/graphTypes'
import { NodeMark } from '@/components/graph/DetailParts'
import { SearchBar } from '@/components/search/SearchBar'
import { loadStocks } from '@/lib/queries/useStocksCached'
import { loadThemes } from '@/lib/queries/useThemesCached'
import type { SearchableStock, SearchableTheme } from '@/lib/searchResults'

interface Props {
  /** 지금 조회의 중심 노드 — 응답에서 찾지 못했으면 없다 */
  center?: GraphNode
  /** 다른 종목·테마를 고르면 그것을 새 원점으로 그래프를 다시 그린다 */
  onSelect: (focus: GraphFocus) => void
}

interface SearchData {
  stocks: readonly SearchableStock[]
  themes: readonly SearchableTheme[]
}

const NO_STOCKS: readonly SearchableStock[] = []
const NO_THEMES: readonly SearchableTheme[] = []

/**
 * 원점 바 — 평소에는 지금 그래프의 중심이 무엇인지 보여주고, 누르면 그 자리에서 다른 종목·테마를 찾는다.
 * 주소창과 같다: 값이 곧 현재 위치다. 헤더의 종목 검색(종목 상세로 간다)과는 생김새부터 다르다.
 * 위치는 부모가 잡는다 — 렌즈·범위·Hop과 한 줄에 놓인다.
 */
export function OriginBar({ center, onSelect }: Props) {
  const [searching, setSearching] = useState(false)
  // 검색 목록(전 종목·전 테마)은 검색창에 들어올 때 받는다 — 그래프만 보는 동안에는 받지 않는다. 헤더 검색과 같은 캐시를 탄다
  const [data, setData] = useState<SearchData | null>(null)
  const [failed, setFailed] = useState(false)
  const ensureData = () => {
    if (data) return
    Promise.all([loadStocks(), loadThemes()]).then(
      ([stocks, themes]) => {
        setData({ stocks, themes })
        setFailed(false)
      },
      () => setFailed(true),
    )
  }

  if (searching || !center) {
    return (
      <div
        data-guide="origin"
        className="flex h-10.5 w-72 max-w-full items-center md:h-11.5 md:w-80 [&>div]:w-full [&_input]:bg-background"
        // 포커스가 검색창 밖으로 나가면(선택 완료 포함) 다시 중심 표시로 돌아간다
        onBlur={(e) => {
          if (center && !e.currentTarget.contains(e.relatedTarget)) setSearching(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && center) setSearching(false)
        }}
      >
        <SearchBar
          stocks={data?.stocks ?? NO_STOCKS}
          themes={data?.themes ?? NO_THEMES}
          onSelect={onSelect}
          onFocus={ensureData}
          notice={failed ? '검색 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : null}
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
      data-guide="origin"
      onClick={() => setSearching(true)}
      aria-label={`중심 ${center.label} — 다른 종목이나 테마로 바꾸기`}
      className="fg-glass fg-gorigin flex h-10.5 max-w-full cursor-pointer items-center gap-2 pr-3.5 pl-1.5 md:h-11.5 md:gap-2.5 md:pr-4 md:pl-2"
    >
      <NodeMark node={center} size={24} />
      <span className="min-w-0 truncate text-body font-semibold text-foreground md:text-[15px]">{center.label}</span>
      <span className="shrink-0 font-mono text-caption text-muted-foreground md:text-xs">
        {ticker ?? '테마'}
      </span>
      <Search className="ml-1.5 size-4 shrink-0 text-muted-foreground md:size-[18px]" strokeWidth={2} />
    </button>
  )
}
