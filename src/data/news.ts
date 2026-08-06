// 테마별 관련 뉴스 더미데이터 (design-specs/theme-dashboard.md §4)

export interface NewsItem {
  id: string
  title: string
  meta: string
}

const PRESS_POOL = [
  '한국경제', '매일경제', '연합뉴스', '머니투데이', '이데일리', '서울경제',
  '전자신문', '뉴스핌', '뉴시스', '아시아경제', '파이낸셜뉴스', '헤럴드경제',
]

// 철강 테마 큐레이션 (스크린샷 시안 헤드라인)
const STEEL_NEWS: NewsItem[] = [
  { id: 'steel-0', title: '중국 열연 수출 가격 추가 인하', meta: '매일경제 · 14:31' },
  { id: 'steel-1', title: '건설 착공 감소에 봉형강 수요 부진', meta: '이데일리 · 12:15' },
  { id: 'steel-2', title: '철광석 가격 약세 지속', meta: '뉴스핌 · 10:29' },
  { id: 'steel-3', title: '인도·영국 FTA 내달 15일 발효…협상 4년·체결 1년 만', meta: '연합뉴스 · 9일 전' },
  { id: 'steel-4', title: '김용범 "EU, 韓 철강 쿼터 요청 최대한 고려…주요국 대비 선방 기대"', meta: '한국경제 · 16일 전' },
  { id: 'steel-5', title: 'FT "한국이 세계경제 승자…AI와 재무장 흐름 올라타"', meta: '서울경제 · 19일 전' },
  { id: 'steel-6', title: '일본, 중국·한국·대만산 철강재 반덤핑 조사 착수', meta: '머니투데이 · 25일 전' },
  { id: 'steel-7', title: '美, 멕시코와 \'USMCA 재협상\' 일정 발표…캐나다는 언급 없어', meta: '뉴시스 · 30일 전' },
  { id: 'steel-8', title: '상의 "韓, 수출구조 내실 다져야…첨단 산업 기술 내재화 필요"', meta: '아시아경제 · 37일 전' },
  { id: 'steel-9', title: '[AI로 읽는 경제] ② 에너지 항로가 막히면 공장도 멈춘다', meta: '헤럴드경제 · 39일 전' },
]

const TEMPLATES: ((theme: string, topStock: string) => string)[] = [
  (t) => `${t} 관련주 일제히 강세… 외국인·기관 수급은 엇갈려`,
  (_t, s) => `[특징주] ${s}, 장중 급등세 이어가며 거래량 폭증`,
  (t) => `${t} 업황 바닥 통과 논쟁… 증권가 목표주가 줄상향`,
  (t) => `"${t} 수요 회복 초입" — 리포트에 관련주 들썩`,
  (t, s) => `${s}, 신규 수주 공시에 ${t} 테마 재부각`,
  (t) => `${t} 테마 수급 집중… 개인 순매수 상위 진입`,
  (t) => `정부, ${t} 산업 지원 방안 발표 예고`,
  (t, s) => `${s} 실적 서프라이즈… ${t} 전반 투자심리 개선`,
  (t) => `${t} 밸류에이션 부담 지적도… "단기 과열 유의"`,
  (t) => `글로벌 ${t} 시장 성장률 전망 상향 조정`,
]

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getThemeNews(themeId: string, themeName: string, topStock: string): NewsItem[] {
  if (themeId === '철강') return STEEL_NEWS

  const seed = hashString(themeId)
  const count = 10 + (seed % 5)
  const items: NewsItem[] = []
  let minutes = 14 * 60 + 31
  for (let i = 0; i < count; i++) {
    const template = TEMPLATES[(seed + i) % TEMPLATES.length]
    const press = PRESS_POOL[(seed + i * 7) % PRESS_POOL.length]
    let timeLabel: string
    if (minutes >= 9 * 60) {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      timeLabel = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    } else {
      timeLabel = `${Math.floor(i / 3) + 1}일 전`
    }
    minutes -= 25 + ((seed + i * 13) % 70)
    items.push({
      id: `${themeId}-${i}`,
      title: template(themeName, topStock),
      meta: `${press} · ${timeLabel}`,
    })
  }
  return items
}
