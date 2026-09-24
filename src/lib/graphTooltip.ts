// 그래프 캔버스 호버 툴팁의 내용·위치 갱신.
// d3가 그린 SVG 요소 위에서 커서를 따라다녀야 해서 React 상태가 아니라 DOM을 직접 만진다.

/** 간선 제목 — 출발 [관계 →] 도착. 태그 색은 켜진 간선과 같은 출발 기업의 시장 색 */
export interface LinkTitle {
  from: string
  relation: string
  to: string
}

export interface TooltipContent {
  /** 첫 줄 — 노드는 이름(앞에 색 점), 간선은 출발·관계 태그·도착 */
  title: string | LinkTitle
  /** 노드 점 색 또는 관계 태그 색 */
  color: string
  /** 나머지 줄 — 마지막 줄만 흐리게(근거·분류처럼 부차 정보) */
  lines: string[]
}

/** 세 줄 상한의 카드 — 제목 / 본문 줄 / 흐린 마지막 줄. 빈 줄은 건너뛴다 */
export function renderTooltip(el: HTMLDivElement, content: TooltipContent) {
  el.textContent = ''

  const title = document.createElement('div')
  title.className = 'flex flex-wrap items-center gap-1.5 font-semibold text-foreground'
  if (typeof content.title === 'string') {
    const dot = document.createElement('span')
    dot.className = 'inline-block size-2 shrink-0 rounded-full'
    dot.style.background = content.color
    const text = document.createElement('span')
    text.textContent = content.title
    title.append(dot, text)
  } else {
    const from = document.createElement('span')
    from.textContent = content.title.from
    // 관계 태그 — 범주(공급·인수·투자)라 글자보다 태그가 먼저 읽힌다. 화살표까지 안에 넣어 방향도 태그가 말한다
    const tag = document.createElement('span')
    tag.className = 'inline-flex items-center gap-0.5 rounded px-1.5 py-px text-[11px] font-medium'
    tag.style.color = content.color
    tag.style.background = `${content.color}1f`
    tag.textContent = `${content.title.relation} →`
    const to = document.createElement('span')
    to.textContent = content.title.to
    title.append(from, tag, to)
  }
  el.append(title)

  const lines = content.lines.filter((line) => line.trim() !== '')
  lines.forEach((text, i) => {
    const line = document.createElement('div')
    const isLast = i === lines.length - 1
    line.className = isLast ? 'mt-0.5 text-muted-foreground' : 'mt-0.5 text-foreground'
    line.textContent = text
    el.append(line)
  })
}

export function showTooltip(el: HTMLDivElement | null, event: MouseEvent, content: TooltipContent) {
  if (!el) return
  renderTooltip(el, content)
  moveTooltip(el, event)
  el.style.opacity = '1'
}

/**
 * 커서 옆에 놓는다 — 좌표는 캔버스 컨테이너(offsetParent) 기준이다.
 * fixed + pageX/Y 는 transform 이 걸린 조상(모달 DialogContent) 안에서는 그 조상 기준으로 잡혀 엉뚱한 곳에 그려지므로,
 * 툴팁을 absolute 로 두고 컨테이너의 화면 좌표를 빼서 계산한다. 오른쪽·아래가 모자라면 커서 반대편으로 뒤집는다.
 */
export function moveTooltip(el: HTMLDivElement | null, event: MouseEvent) {
  placeTooltip(el, event.clientX, event.clientY)
}

/** 화면 좌표(clientX/Y) 옆에 놓는다 */
export function placeTooltip(el: HTMLDivElement | null, clientX: number, clientY: number) {
  if (!el) return
  const host = el.offsetParent as HTMLElement | null
  const rect = host?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  const x = clientX - rect.left
  const y = clientY - rect.top
  const w = el.offsetWidth
  const h = el.offsetHeight
  const left = x + TOOLTIP_GAP + w > rect.width ? x - TOOLTIP_GAP - w : x + TOOLTIP_GAP
  const top = y - TOOLTIP_RISE + h > rect.height ? y - TOOLTIP_GAP - h : y - TOOLTIP_RISE
  el.style.left = `${Math.max(0, left)}px`
  el.style.top = `${Math.max(0, top)}px`
}

/** 커서와 툴팁 사이 간격, 그리고 커서보다 살짝 위로 띄우는 높이 */
const TOOLTIP_GAP = 12
const TOOLTIP_RISE = 8

export function hideTooltip(el: HTMLDivElement | null) {
  if (el) el.style.opacity = '0'
}
