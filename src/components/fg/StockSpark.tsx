import { Skeleton } from '@/components/fg/Skeleton'
import { formatChange } from '@/lib/format'
import { formatPriceWon } from '@/lib/fg/format'
import type { SparkModel } from '@/lib/fg/stockQuote'
import { monthDayLabel } from '@/lib/fg/themeCharts'
import { cn } from '@/lib/utils'

interface StockSparkProps {
  spark: SparkModel | null
  loading: boolean
}

export function StockSpark({ spark, loading }: StockSparkProps) {
  if (loading) return <Skeleton height={79} />
  if (!spark) return null
  const year = Number(spark.last.date.slice(0, 4))
  const from = monthDayLabel(spark.first.date, year)
  const to = monthDayLabel(spark.last.date, year)
  const aria = `최근 3달 종가, ${from} ${formatPriceWon(spark.first.close)}에서 ${to} ${formatPriceWon(spark.last.close)}, ${formatChange(spark.move)}`
  return (
    <div className={cn('fg-spark', spark.move < 0 && 'fg-spark--down')}>
      <span className="fg-spark__head">
        <span>최근 3달</span>
        <span>
          {from} ~ {to}
        </span>
      </span>
      <span className="fg-spark__box">
        <svg viewBox="0 0 300 56" preserveAspectRatio="none" role="img" aria-label={aria}>
          <path className="fg-spark__area" d={spark.area} />
          <path className="fg-spark__line" d={spark.line} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="fg-spark__dot" style={{ left: '100%', top: `${spark.dotTop.toFixed(1)}%` }} aria-hidden="true" />
      </span>
    </div>
  )
}
