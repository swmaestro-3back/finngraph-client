/**
 * d3(SVG) 렌더링 전용 색 토큰.
 *
 * DOM 요소는 Tailwind 유틸(`text-foreground`, `border-border` …)을 쓰고,
 * 여기 값은 자바스크립트 문자열이 필요한 d3 `.attr("fill" | "stroke", …)`에만 사용한다.
 * 값은 hex가 아니라 index.css 변수 참조다 — SVG 표현 속성도 var()를 해석하므로
 * 색을 바꿀 때 index.css 한 곳만 고치면 된다.
 */
export const T = {
  /** 캔버스 종이색 — 페이지 배경보다 한 단계 가라앉은 면. 라벨 외곽선도 이 색이라 글자 뒤 간선만 가린다 */
  canvas: 'var(--graph-canvas)',
  /** 노드 테두리 — 종이보다 밝은 페이지 배경색이라 점이 오려 붙인 것처럼 떠 보인다 */
  paper: 'var(--background)',
  hairline: 'var(--border)',
  /** 필터로 흐려진 요소용 보더 */
  hairlineSoft: 'var(--surface-inset)',
  ink: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  /** 간선 기본색 — 중립 회색. 색은 호버·선택 때만 켜고 평소엔 종이 위 연필선처럼 물러난다 */
  edge: 'var(--graph-edge)',
} as const
