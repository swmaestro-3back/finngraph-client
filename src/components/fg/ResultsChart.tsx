import { useLayoutEffect, useRef, useState } from 'react'
import { MockBadge } from '@/components/fg/Gap'
import { Segment, type TabOption } from '@/components/fg/SegmentedTabs'
import {
  resultColumnLabel,
  resultReading,
  resultScale,
  resultsLead,
  type BarBox,
  type ResultPeriod,
  type ResultPoint,
} from '@/lib/fg/financials'

export const RESULTS_TITLE_ID = 'fg-sf-results'

interface ResultsChartProps {
  shown: readonly ResultPoint[]
  all: readonly ResultPoint[]
  period: ResultPeriod
  periods: readonly TabOption<ResultPeriod>[] | null
  mock: boolean
  onPeriod: (period: ResultPeriod) => void
}

function boxStyle(box: BarBox) {
  return { top: box.top, height: box.height }
}

export function ResultsChart({ shown, all, period, periods, mock, onPeriod }: ResultsChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const count = shown.length
  const on = hover !== null && hover < count ? hover : count - 1
  const scale = resultScale(shown)
  const lead = resultsLead(shown, all)
  const reading = resultReading(shown[on], all)
  const quarterly = period === 'quarter'

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [period])

  const pick = (next: ResultPeriod) => {
    setHover(null)
    onPeriod(next)
  }
  const clear = () => setHover(null)

  return (
    <section className="fg-section" aria-labelledby={RESULTS_TITLE_ID}>
      <div className="fg-section__head">
        <div className="fg-sf__heading">
          <span className="fg-sev__title">
            <h2 id={RESULTS_TITLE_ID} className="fg-section__title fg-sf__anchor" tabIndex={-1}>
              실적
            </h2>
            {mock && <MockBadge />}
          </span>
          {lead && (
            <p className="fg-section__sub">
              <b className="fg-sf__lead">{lead.lead}</b>
              {lead.tail && ` ${lead.tail}`}
            </p>
          )}
        </div>
        {periods && <Segment label="실적 기간" options={periods} value={period} onChange={pick} />}
      </div>
      <div className="fg-rcx__read fg-num" aria-live="polite">
        <span className="fg-rcx__when">{reading.when}</span>
        <span>
          <i className="fg-rcx__sw fg-rcx__sw--sales" aria-hidden="true" />
          매출액 <b>{reading.sales}</b>
        </span>
        <span>
          <i className="fg-rcx__sw fg-rcx__sw--op" aria-hidden="true" />
          영업이익 <b>{reading.op}</b>
        </span>
        <span>
          영업이익률 <b>{reading.margin}</b>
        </span>
        {reading.yoy && <span className="fg-rcx__yoy">{reading.yoy}</span>}
      </div>
      <div className="fg-rcx" ref={scrollRef}>
        <div
          className="fg-rcx__plot"
          style={{ gridTemplateColumns: `72px repeat(${count}, minmax(${quarterly ? 64 : 72}px, 1fr))` }}
          role="group"
          aria-label={`${quarterly ? '분기' : '연간'} 매출액과 영업이익 막대 차트. 막대에 포커스하면 그 기간의 값을 읽어 줘요`}
          onMouseLeave={clear}
        >
          <span className="fg-rcx__lab" aria-hidden="true">
            영업이익률
          </span>
          {shown.map((point, k) => (
            <button
              key={point.key}
              type="button"
              className="fg-rcx__col fg-num"
              data-on={k === on}
              aria-label={resultColumnLabel(point, all)}
              onMouseEnter={() => setHover(k)}
              onFocus={() => setHover(k)}
              onBlur={clear}
            >
              <span className="fg-rcx__bars" aria-hidden="true">
                {point.sales !== null && <i className="fg-rcx__bar fg-rcx__bar--sales" style={boxStyle(scale.box(point.sales))} />}
                {point.op !== null && <i className="fg-rcx__bar fg-rcx__bar--op" style={boxStyle(scale.box(point.op))} />}
              </span>
              <span className="fg-rcx__x" aria-hidden="true">
                <span>{point.label}</span>
                <span>{point.year}</span>
              </span>
              <span className="fg-rcx__m" aria-hidden="true">
                {resultReading(point, all).margin}
              </span>
            </button>
          ))}
          <span className="fg-rcx__zero" style={{ top: scale.zero }} aria-hidden="true" />
        </div>
      </div>
      <p className="fg-sf__foot">연결 기준(연결 재무제표가 없으면 별도) · 영업이익률은 매출액에서 영업이익이 차지하는 비율이에요</p>
    </section>
  )
}
