import { Link, useLocation } from 'react-router-dom'
import type { RelatedCompanyRes } from '@/lib/apiTypes'
import { fromState } from '@/lib/navigation'
import { segmentByCompanies, splitSentences } from '@/lib/newsSummary'

interface Props {
  summary: string
  stocks: RelatedCompanyRes[]
  onNavigate: () => void
}

/**
 * 문장마다 한 문단씩 띄우고, 관련 종목명은 노랑 형광펜으로 칠한다.
 * 초록은 이 앱에서 '상승'을 뜻해 쓰지 않는다.
 */
export function NewsSummary({ summary, stocks, onNavigate }: Props) {
  const { pathname } = useLocation()
  const tickerOf = new Map(stocks.map((s) => [s.companyName, s.ticker]))
  const names = stocks.map((s) => s.companyName)
  const sentences = splitSentences(summary)

  return (
    <div className="flex flex-col gap-4 text-[16px] leading-[1.8] text-foreground [text-wrap:pretty]">
      {sentences.map((sentence, i) => (
        <p key={i}>
          {segmentByCompanies(sentence, names).map((seg, j) => {
            if (seg.kind === 'text') return <span key={j}>{seg.text}</span>
            const ticker = tickerOf.get(seg.text) ?? null
            // 형광펜처럼 글자는 그대로 두고 배경만 노랑으로 칠한다 — 줄바꿈되어도 각 줄이 따로 칠해진다
            const box = 'rounded-[2px] bg-accent-warm-bg px-0.5 [box-decoration-break:clone]'
            return ticker === null ? (
              <span key={j} className={box}>
                {seg.text}
              </span>
            ) : (
              <Link
                key={j}
                to={`/stock/${ticker}`}
                state={fromState(pathname)}
                onClick={onNavigate}
                className={`${box} transition-colors hover:bg-accent-warm/25`}
              >
                {seg.text}
              </Link>
            )
          })}
        </p>
      ))}
    </div>
  )
}
