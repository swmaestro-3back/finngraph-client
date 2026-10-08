import { DATE_TICK_POSITIONS, slotCenter } from '@/lib/chartAxis'

export function AxisRules({
  selectedIndex,
  crosshairIndex,
  count,
}: {
  selectedIndex: number | null
  crosshairIndex: number | null
  count: number
}) {
  return (
    <>
      {selectedIndex !== null && (
        <div className="fg-candle__rule fg-candle__rule--pick" style={{ left: `${slotCenter(selectedIndex, count)}%` }} />
      )}
      {crosshairIndex !== null && (
        <div className="fg-candle__rule" style={{ left: `${slotCenter(crosshairIndex, count)}%` }} />
      )}
    </>
  )
}

export function DateTicks({ labels }: { labels: string[] }) {
  return (
    <div className="fg-candle__dates">
      {labels.map((label, k) => (
        <span key={k} className="fg-candle__date fg-num" style={{ left: `${DATE_TICK_POSITIONS[k]}%` }}>
          {label}
        </span>
      ))}
    </div>
  )
}
