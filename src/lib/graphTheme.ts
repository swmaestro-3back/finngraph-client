/**
 * d3(SVG) 렌더링 전용 색 토큰.
 *
 * DOM 요소는 Tailwind 유틸(`text-foreground`, `border-border` …)을 쓰고,
 * 여기 값은 자바스크립트 문자열이 필요한 d3 `.attr("fill" | "stroke", …)`에만 사용한다.
 * 값은 index.css의 CSS 변수와 1:1 대응하므로 한쪽을 바꾸면 다른 쪽도 맞춰야 한다.
 */
export const T = {
  /** --background */
  canvas: '#ffffff',
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
} as const
