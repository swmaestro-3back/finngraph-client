/**
 * d3(SVG) 렌더링 전용 색 토큰.
 *
 * DOM 요소는 Tailwind 유틸(`text-foreground`, `border-border` …)을 쓰고,
 * 여기 값은 자바스크립트 문자열이 필요한 d3 `.attr("fill" | "stroke", …)`에만 사용한다.
 * 그래프 캔버스는 페이지 배경과 다른 연회색 종이 위에 그리므로 canvas/paper는 CSS 변수와 무관하고,
 * 나머지는 index.css의 CSS 변수와 1:1 대응한다.
 */
export const T = {
  /** 캔버스 종이색 — 라벨 외곽선도 이 색이라 글자 뒤 간선만 가린다 */
  canvas: '#f2f2f2',
  /** 노드 테두리 — 종이보다 밝은 흰색이라 점이 오려 붙인 것처럼 떠 보인다 */
  paper: '#ffffff',
  /** --border */
  hairline: '#dee1e6',
  /** 필터로 흐려진 요소용 보더 (--surface-inset) */
  hairlineSoft: '#eef0f3',
  /** --foreground */
  ink: '#0a0b0d',
  /** --muted-foreground */
  muted: '#7c828a',
  /** --primary */
  primary: '#0052ff',
  /** 간선 기본색 — 중립 회색. 색은 호버·선택 때만 켜고 평소엔 종이 위 연필선처럼 물러난다 */
  edge: '#a3a3a3',
} as const
