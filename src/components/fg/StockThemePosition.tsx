import { ChevronDown } from 'lucide-react'
import { Skeleton } from '@/components/fg/Skeleton'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import type { StockThemeCompareRes, StockThemeRes } from '@/lib/apiTypes'
import { positionRows } from '@/lib/fg/stockDetail'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import { josa } from '@/lib/josa'

const SKELETON_ROWS = 7

interface ThemePickerProps {
  themes: readonly StockThemeRes[]
  themeId: number
  onPick: (id: number) => void
}

function ThemePicker({ themes, themeId, onPick }: ThemePickerProps) {
  return (
    <label className="fg-stp__pick">
      <span className="fg-sr">비교 테마</span>
      <select value={themeId} onChange={(event) => onPick(Number(event.target.value))}>
        {themes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {`${theme.name} · ${theme.stockCount}종목`}
          </option>
        ))}
      </select>
      <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
    </label>
  )
}

function PositionList({ compare }: { compare: StockThemeCompareRes }) {
  const rows = positionRows(compare.metrics)
  const basisDate = compare.valuationDate ?? compare.baseDate
  if (rows.every((row) => row.rank === null)) {
    return (
      <p className="fg-stp__empty">
        {`${compare.themeName}${josa(compare.themeName, '은/는')} ${compare.memberCount}종목뿐이라 순위를 매기지 않아요 · 다른 테마를 골라 보세요`}
      </p>
    )
  }
  return (
    <>
      <ul className="fg-stp__list">
        {rows.map((row) => (
          <li key={row.key} className="fg-stp__row">
            <span className="fg-stp__label">
              {row.label}
              {row.lowFirst && <small>낮은 순</small>}
            </span>
            {row.rank === null ? (
              <span className="fg-stp__note">{row.note}</span>
            ) : (
              <>
                <span className="fg-stp__rank fg-num">
                  <span className="fg-sr">{`${row.count}종목 중 ${row.rank}위`}</span>
                  <span aria-hidden="true">
                    <b>{`${row.rank}위`}</b>
                    {`/${row.count}`}
                  </span>
                </span>
                <span className="fg-stp__bar" aria-hidden="true">
                  <span className="fg-stp__mid" />
                  {row.position !== null && (
                    <span className="fg-w52__dot" style={{ left: `${(row.position * 100).toFixed(1)}%` }} />
                  )}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <span className="fg-stp__cap">
        {`${compare.themeName} ${compare.memberCount}종목 안 순위예요 · 왼쪽일수록 앞이고 가운데 선이 중앙값이에요 · 값이 없는 종목은 빼고 셌어요`}
        {basisDate && ` · ${monthDayLabel(basisDate, Number(basisDate.slice(0, 4)))} 기준`}
      </span>
    </>
  )
}

interface StockThemePositionProps {
  themes: readonly StockThemeRes[] | null
  themeId: number
  onPickTheme: (id: number) => void
  compare: StockThemeCompareRes | null
  onRetry: (() => void) | null
}

export function StockThemePosition({ themes, themeId, onPickTheme, compare, onRetry }: StockThemePositionProps) {
  let body
  if (onRetry) body = <ThemeIndexRetry message="테마 안 위치를 불러오지 못했어요" onRetry={onRetry} />
  else if (compare) body = <PositionList compare={compare} />
  else
    body = (
      <div className="fg-stp__list" aria-hidden="true">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} height={20} />
        ))}
      </div>
    )
  return (
    <section className="fg-section fg-stp" aria-labelledby="fg-stp-title" aria-busy={!compare && !onRetry}>
      <div className="fg-stp__head">
        <h2 id="fg-stp-title" className="fg-section__title">
          테마 안 위치
        </h2>
        {themes && themes.length > 1 && <ThemePicker themes={themes} themeId={themeId} onPick={onPickTheme} />}
      </div>
      {body}
    </section>
  )
}
