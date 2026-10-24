/* "종목 검색했더니 엉뚱한 뉴스가 반" 을 보여주는 다이어그램.
   기존 증권 앱의 종목 뉴스 목록을 흉내 낸다: 8건 중 5건은 기업 A와 무관한 기사. */

const ROWS: { title: string; related: boolean }[] = [
  { title: "오늘 많이 본 종목 TOP 10", related: false },
  { title: "코스피, 외국인 순매수에 사흘 만에 상승 마감", related: false },
  { title: "기업 A, 신규 양극재 라인 가동 시작", related: true },
  { title: "기업 A 포함 2차전지 ETF, 이번 주 수익률은", related: false },
  { title: "기업 A–기업 D 합작법인 설립 공시", related: true },
  { title: "기업 A 신입 공채 모집 공고", related: false },
  { title: "기업 A, 자사주 500억 소각 결정", related: true },
  { title: "증권사 리포트 발간 일정 모아보기", related: false },
];

const W = 520;
const ROW_H = 52;
const TOP = 104;

export default function NoisyNewsFigure() {
  const unrelated = ROWS.filter((r) => !r.related).length;
  const H = TOP + ROWS.length * ROW_H + 72;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`기존 증권 앱에서 기업 A를 검색한 뉴스 목록. ${ROWS.length}건 중 ${unrelated}건이 기업 A와 관련 없는 기사다`}
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {/* 검색창 */}
      <rect x="24" y="24" width="472" height="46" rx="12" fill="var(--bg-subtle)" />
      <circle cx="49" cy="47" r="6.5" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" />
      <line x1="54" y1="52" x2="59" y2="57" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
      <text x="72" y="52" fontSize="16" fontWeight="700" fill="var(--text-primary)">
        기업 A
      </text>
      <text x="480" y="52" fontSize="13" fontWeight="500" textAnchor="end" fill="var(--text-tertiary)">
        종목 뉴스 {ROWS.length}건
      </text>

      {/* 뉴스 목록 */}
      {ROWS.map((row, i) => {
        const y = TOP + i * ROW_H;
        const cy = y + ROW_H / 2;
        return (
          <g key={row.title}>
            {i > 0 && (
              <line x1="24" y1={y} x2="496" y2={y} stroke="var(--border-divider)" strokeWidth="1" />
            )}
            {row.related ? (
              <>
                <circle cx="38" cy={cy} r="9" fill="var(--feedback-success)" opacity="0.14" />
                <path
                  d={`M33.5 ${cy} l3 3 l6 -6`}
                  fill="none"
                  stroke="var(--feedback-success)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <text x="60" y={cy + 5} fontSize="15" fontWeight="600" fill="var(--text-primary)">
                  {row.title}
                </text>
              </>
            ) : (
              <>
                <circle cx="38" cy={cy} r="9" fill="var(--feedback-error)" opacity="0.12" />
                <path
                  d={`M34.5 ${cy - 3.5} l7 7 M41.5 ${cy - 3.5} l-7 7`}
                  stroke="var(--feedback-error)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text
                  x="60"
                  y={cy + 5}
                  fontSize="15"
                  fontWeight="500"
                  fill="var(--text-tertiary)"
                  textDecoration="line-through"
                >
                  {row.title}
                </text>
                <rect x="418" y={cy - 12} width="78" height="24" rx="12" fill="var(--market-up-subtle)" />
                <text x="457" y={cy + 4.5} fontSize="12" fontWeight="700" textAnchor="middle" fill="var(--feedback-error)">
                  관련 없음
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* 하단 요약 */}
      <line x1="24" y1={TOP + ROWS.length * ROW_H} x2="496" y2={TOP + ROWS.length * ROW_H} stroke="var(--border-divider)" />
      <text x="24" y={H - 28} fontSize="14" fontWeight="600" fill="var(--text-secondary)">
        {ROWS.length}건 중{" "}
        <tspan fill="var(--feedback-error)" fontWeight="800">
          {unrelated}건
        </tspan>
        은 기업 A와 상관없는 뉴스
      </text>
    </svg>
  );
}
