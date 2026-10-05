/** 등락률 포맷: +5.25% / −0.10% (U+2212 마이너스), 소수 2자리 */
export function formatChange(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}%`
  if (value < 0) return `−${Math.abs(value).toFixed(2)}%`
  return '0.00%'
}

/**
 * 콤마 구분 정수 금액 — 단위 환산이 끝난 값에 사용한다.
 *
 */
export function formatAmount(value: number): string {
  return Math.round(value).toLocaleString('ko-KR')
}

/** 현재가(원) */
export function formatPrice(value: number): string {
  return formatAmount(value)
}

/** 거래량(주) — 1만주 이상은 정수 만주(6,556만주), 미만은 주(3,200주) */
export function formatVolume(shares: number): string {
  if (shares >= 1e4) return `${formatAmount(shares / 1e4)}만주`
  return `${formatAmount(shares)}주`
}

export function changeColorClass(value: number): string {
  if (value > 0) return 'text-stock-up'
  if (value < 0) return 'text-stock-down'
  return 'text-foreground'
}

/**
 * 조 단위 숫자(AnnualFinancials 금액 필드)를 읽기 좋은 단위로 —
 * 1조 이상은 소수 첫째 자리 조(228.7조), 1조 미만은 정수 억(9,999억)
 */
export function formatTrillion(value: number | null): string {
  if (value === null) return '-'
  const eok = Math.round(value * 1e4)
  // 억으로 반올림해서 1조에 닿으면 조로 올린다 (9,999.6억 → 1.0조)
  if (Math.abs(eok) >= 1e4) return `${value.toFixed(1)}조`
  return `${eok.toLocaleString('ko-KR')}억`
}

export function formatPercent(value: number | null, digits = 2): string {
  if (value === null) return '-'
  return `${value.toFixed(digits)}%`
}

export function formatWon(value: number | null): string {
  if (value === null) return '-'
  return `${value.toLocaleString('ko-KR')}원`
}

export function formatSignedWon(value: number): string {
  if (value > 0) return `+${formatWon(value)}`
  if (value < 0) return `−${formatWon(Math.abs(value))}`
  return formatWon(0)
}

export function formatMultiple(value: number | null): string {
  if (value === null) return '-'
  return `${value.toFixed(2)}배`
}

export function toEok(won: number | null): number | null {
  return won === null ? null : won / 1e8
}

export function toMillion(won: number | null): number | null {
  return won === null ? null : won / 1e6
}

function compactKrw(won: number): string {
  const man = Math.round(won / 1e4)
  if (man < 1e4) return `${man.toLocaleString('ko-KR')}만`
  const eok = Math.round(won / 1e8)
  if (eok < 1e4) return `${eok.toLocaleString('ko-KR')}억`
  return `${(won / 1e12).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}조`
}

export function formatCompactKrw(won: number | null): string {
  if (won === null) return '—'
  if (won === 0) return '0'
  if (Math.abs(won) < 1e4) return '1만 미만'
  return won < 0 ? `−${compactKrw(-won)}` : compactKrw(won)
}

export function formatChangeOrDash(value: number | null): string {
  return value === null ? '—' : formatChange(value)
}

export function formatAmountOrDash(value: number | null): string {
  return value === null ? '—' : formatAmount(value)
}

export function formatPriceOrDash(value: number | null): string {
  return value === null ? '—' : formatPrice(value)
}

/** 상대 시각 — 하루 안이면 "3시간 전", 일주일 안이면 "5일 전", 그보다 오래면 "7월 22일" */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso)
  const minutes = Math.floor((Date.now() - then.getTime()) / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}일 전`
  return `${then.getMonth() + 1}월 ${then.getDate()}일`
}

const PRESS_BY_HOST: Record<string, string> = {
  'hankyung.com': '한국경제',
  'mk.co.kr': '매일경제',
  'yna.co.kr': '연합뉴스',
  'news.mt.co.kr': '머니투데이',
  'edaily.co.kr': '이데일리',
  'sedaily.com': '서울경제',
  'etnews.com': '전자신문',
  'newspim.com': '뉴스핌',
  'newsis.com': '뉴시스',
  'asiae.co.kr': '아시아경제',
  'fnnews.com': '파이낸셜뉴스',
  'biz.heraldcorp.com': '헤럴드경제',
  'thelec.kr': '디일렉',
  'n.news.naver.com': '네이버 뉴스',
  'etoday.co.kr': '이투데이',
  'ajunews.com': '아주경제',
  'metroseoul.co.kr': '메트로신문',
  'tokenpost.kr': '토큰포스트',
  'ebn.co.kr': 'EBN',
  'asiatime.co.kr': '아시아타임즈',
  'mt.co.kr': '머니투데이',
  'biz.chosun.com': '조선비즈',
  'biz.sbs.co.kr': 'SBS Biz',
  'inews24.com': '아이뉴스24',
  'dailian.co.kr': '데일리안',
  'view.asiae.co.kr': '아시아경제',
  'newstnt.com': '뉴스티앤티',
  'biztribune.co.kr': '비즈트리뷴',
  '4th.kr': '포쓰저널',
  'bizwork.co.kr': '비즈워크',
  'financialpost.co.kr': '파이낸셜포스트',
  'namdonews.com': '남도일보',
  'incheonilbo.com': '인천일보',
  'news.dealsitetv.com': 'DealSite경제TV',
  'ekn.kr': '에너지경제신문',
  'thereport.co.kr': '더리포트',
  'kukinews.com': '쿠키뉴스',
  'widedaily.com': '와이드경제',
  'cstimes.com': '컨슈머타임스',
  'newsdream.kr': '뉴스드림',
  'bntnews.co.kr': 'bntnews',
  'seoulwire.com': '더비즈',
  'sidae.com': '동행미디어 시대',
  'issuenbiz.com': '이슈앤비즈',
  'jeonmae.co.kr': '전국매일신문',
}

function pressHost(source: string): string | null {
  const text = source.trim()
  if (!text) return null
  try {
    const host = new URL(text.includes('://') ? text : `https://${text}`).hostname.toLowerCase()
    return host.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

export function pressName(
  source: string | null | undefined,
  names: Readonly<Record<string, string>> = PRESS_BY_HOST,
): string {
  const host = source ? pressHost(source) : null
  if (!host) return '출처 미상'
  return names[host] ?? host
}

/** 절대 시각 — 기사 입력 시각처럼 "2026. 09. 18. 09:11" (브라우저 시간대 기준). 파싱 실패면 빈 문자열 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}. ${two(d.getMonth() + 1)}. ${two(d.getDate())}. ${two(d.getHours())}:${two(d.getMinutes())}`
}

/**
 * 짧은 날짜 "08.24" — ISO 문자열의 날짜 부분을 그대로 읽는다(서버가 준 시간대 기준, 브라우저 시간대로 옮기지 않는다).
 * 올해가 아니면 "25.11.03"처럼 연도를 붙인다. 파싱 실패면 빈 문자열
 */
export function formatShortDate(iso: string | null | undefined): string {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  const [, y, m, d] = match
  return Number(y) === new Date().getFullYear() ? `${m}.${d}` : `${y.slice(2)}.${m}.${d}`
}

/** 짧은 날짜 + 시각 "09.29 13:56" — 시각이 없는 문자열이면 날짜만 */
export function formatShortDateTime(iso: string | null | undefined): string {
  const date = formatShortDate(iso)
  const time = iso?.match(/T(\d{2}:\d{2})/)?.[1]
  return date && time ? `${date} ${time}` : date
}
