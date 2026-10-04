import { Badge } from '@/components/fg/Badge'
import { ThemeStar } from '@/components/fg/ThemeActions'
import { ThemeIndexRetry } from '@/components/fg/ThemeIndexRetry'
import { ThemeRatio } from '@/components/fg/ThemeRatio'
import type { ThemeIndexRes, ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { formatChange, formatCompactKrw } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { marketMix, volumeRatioNote } from '@/lib/fg/themeDetail'
import { weightedChangeOf } from '@/lib/fg/themes'
import { cn } from '@/lib/utils'

const PERIODS = [
  { key: 'r1w', label: '1주' },
  { key: 'r1m', label: '1달' },
  { key: 'r3m', label: '3달' },
] as const

interface ThemeDetailHeaderProps {
  theme: ThemeRes
  basis: string | null
  index: ThemeIndexRes | null
  indexFailed: boolean
  onRetryIndex: () => void
  stocks: readonly ThemeStockRes[] | null
}

export function ThemeDetailHeader({ theme, basis, index, indexFailed, onRetryIndex, stocks }: ThemeDetailHeaderProps) {
  const change = weightedChangeOf(theme)
  const mean = theme.meanChange ?? null
  const volumeNote = volumeRatioNote(theme.tradingValueRatio)
  return (
    <section className="fg-section fg-tdh fg-reveal" aria-labelledby="fg-tdh-name">
      <div className="fg-tdh__row">
        <div className="fg-tdh__main">
          <div className="fg-tdh__id">
            <h1 id="fg-tdh-name" className="fg-tdh__name">
              {theme.name}
            </h1>
            <Badge>{theme.stockCount}종목</Badge>
          </div>
          <div className="fg-tdh__price">
            <span className={cn('fg-tdh__now', change !== null && toneClass(change))}>
              {change === null ? '—' : formatChange(change)}
            </span>
            {basis && <span className="fg-tdh__at">{basis}</span>}
          </div>
          <span className="fg-tdh__mean">
            시가총액 가중 등락률이에요
            {mean !== null && (
              <>
                {' · 단순평균 '}
                <b>{formatChange(mean)}</b>
              </>
            )}
          </span>
          {indexFailed ? (
            <ThemeIndexRetry message="기간 수익률을 불러오지 못했어요" onRetry={onRetryIndex} />
          ) : (
            <div className="fg-tdh__chips" role="group" aria-label="테마 지수 기간 수익률">
              {PERIODS.map(({ key, label }) => {
                const value = index?.[key] ?? null
                return (
                  <span key={key} className="fg-tdh__chip">
                    {label}
                    <b className={value === null ? undefined : toneClass(value)}>
                      {value === null ? '—' : formatChange(value)}
                    </b>
                  </span>
                )
              })}
            </div>
          )}
          <ThemeRatio
            up={theme.upCount ?? 0}
            down={theme.downCount ?? 0}
            flat={theme.flatCount ?? 0}
            large
            className="fg-tdh__ratio"
          />
          {theme.description && <p className="fg-tdh__sum">{theme.description}</p>}
        </div>
        <div className="fg-tdh__side">
          <div className="fg-tdh__acts">
            <span className="fg-tdh__star">
              <ThemeStar theme={theme} />
            </span>
          </div>
          <dl className="fg-tdh__stats">
            <div>
              <dt>시가총액 합</dt>
              <dd>{formatCompactKrw(theme.marketCap)}</dd>
              <small>{theme.stockCount}종목 합</small>
            </div>
            <div>
              <dt>거래대금</dt>
              <dd>{formatCompactKrw(theme.tradingValue)}</dd>
              {volumeNote && <small>{volumeNote}</small>}
            </div>
            <div>
              <dt>종목 수</dt>
              <dd>{theme.stockCount}개</dd>
              {stocks && stocks.length > 0 && <small>{marketMix(stocks)}</small>}
            </div>
          </dl>
        </div>
      </div>
    </section>
  )
}
