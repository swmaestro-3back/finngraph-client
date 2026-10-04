import { COLOR_SATURATION_PCT } from '@/lib/treemapColor'

export function ThemeLegend() {
  return (
    <div className="fg-tlegend fg-reveal">
      <span className="fg-tlegend__title">트리맵 보는 법</span>
      <span className="fg-tlegend__scale">
        <span className="fg-num fg-down">−{COLOR_SATURATION_PCT}%</span>
        <span className="fg-tlegend__bar" aria-hidden="true" />
        <span className="fg-num fg-up">+{COLOR_SATURATION_PCT}%</span>
      </span>
      <span>색 = 등락률, ±{COLOR_SATURATION_PCT}%에서 가장 진함</span>
      <span>칸 크기 = 등락률 크기 · ▲상승 ▼하락 종목 수</span>
    </div>
  )
}
