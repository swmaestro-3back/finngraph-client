// 그래프 캔버스 호버 툴팁의 내용·위치 갱신.
// d3가 그린 SVG 요소 위에서 커서를 따라다녀야 해서 React 상태가 아니라 DOM을 직접 만진다.

/** 제목 + 색이 있는 부제를 넣고 커서 옆에 띄운다 */
export function showTooltip(
  el: HTMLDivElement | null,
  event: MouseEvent,
  title: string,
  subtitle: string,
  subtitleColor: string,
) {
  if (!el) return
  el.textContent = ''
  const strong = document.createElement('strong')
  strong.textContent = title
  const span = document.createElement('span')
  span.style.color = subtitleColor
  span.textContent = subtitle
  el.append(strong, document.createElement('br'), span)
  moveTooltip(el, event)
  el.style.opacity = '1'
}

export function moveTooltip(el: HTMLDivElement | null, event: MouseEvent) {
  if (!el) return
  el.style.left = `${event.pageX + 12}px`
  el.style.top = `${event.pageY - 8}px`
}

export function hideTooltip(el: HTMLDivElement | null) {
  if (el) el.style.opacity = '0'
}
