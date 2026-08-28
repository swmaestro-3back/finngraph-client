import type { NewsDetail } from '@/data/newsDetail'

const STEEL_NEWS: NewsDetail[] = [
  {
    id: 'tnews-steel-01',
    title: '중국 감산 논의 부각… 철강 테마 투자심리 개선',
    summary:
      '중국의 하반기 조강 생산 조절 논의가 시장에 전해지며 공급 과잉 완화 기대가 커졌다. 고로사 스프레드 회복 가능성이 거론되면서 철강 테마 전반의 투자심리가 개선되는 흐름이다. 열연 유통가격이 3분기 중 반등하는지가 다음 확인 지점으로 꼽힌다.',
    url: 'https://news.example.com/mock/steel-01',
    collectedAt: '2026-07-29T09:10:00+09:00',
  },
  {
    id: 'tnews-steel-02',
    title: '조선용 후판 가격 협상 인상 기류… 판재 업종 마진 기대',
    summary:
      '조선사와 철강사 간 후판 가격 협상이 소폭 인상 쪽으로 기울고 있다는 관측이 나온다. 후판 비중이 큰 판재 업체와 강관 수요가 겹친 업체의 실적 개선 기대가 커지는 배경이다. 수주 호황이 이어지는 조선 업황이 철강 수요의 하방을 받치고 있다는 평가다.',
    url: 'https://press.example.com/mock/steel-02',
    collectedAt: '2026-07-24T14:32:00+09:00',
  },
  {
    id: 'tnews-steel-03',
    title: '미국 철강 관세 체계 재검토 관측… 수출 비중 큰 종목 변동성',
    summary:
      '미국의 철강 수입 관세 체계가 재검토될 수 있다는 관측이 확산되고 있다. 쿼터 조정 방향에 따라 국내 강관·판재 수출 물량이 영향을 받을 수 있어 대미 수출 비중이 큰 종목의 변동성이 커졌다. 쿼터 확대 협상의 진전 여부가 변수로 남아 있다.',
    url: 'https://wire.example.net/mock/steel-03',
    collectedAt: '2026-07-18T11:05:00+09:00',
  },
  {
    id: 'tnews-steel-04',
    title: '전기로 전환 투자 확대 흐름… 저탄소 생산체제 경쟁',
    summary:
      '국내 철강업계 전반에서 전기로 기반 저탄소 생산체제로의 전환 투자가 확대되는 흐름이다. 탄소국경조정제도 시행을 앞두고 유럽향 수출 경쟁력을 방어하려는 움직임으로 읽힌다. 철스크랩 수요 확대 전망에 전기로 제강사도 함께 조명받고 있다.',
    url: 'https://daily.example.org/mock/steel-04',
    collectedAt: '2026-07-15T09:44:00+09:00',
  },
  {
    id: 'tnews-steel-05',
    title: '철광석 가격 약세… 원가 부담 완화에 철강 테마 강세',
    summary:
      '철광석 가격이 톤당 90달러 선까지 밀리며 국내 철강사의 원가 부담이 완화되는 국면이다. 판매가격 인하 압력보다 원료가 하락 속도가 가팔라 단기 마진 확대가 예상된다. 고로 비중이 큰 업체의 3분기 이익 추정치가 상향되는 분위기다.',
    url: 'https://news.example.com/mock/steel-05',
    collectedAt: '2026-07-08T12:15:00+09:00',
  },
  {
    id: 'tnews-steel-06',
    title: '수입 후판 반덤핑 조사 진행… 국내 유통가 반등 조짐',
    summary:
      '저가 수입 후판에 대한 반덤핑 조사가 진행되며 잠정 관세 부과 가능성이 거론된다. 수입재 유입이 둔화되면 국내 유통가격이 반등할 수 있다는 기대가 형성됐다. 저가 수입재와 경합해 온 중소 판재류 업체의 숨통이 트일 것이란 분석이다.',
    url: 'https://press.example.com/mock/steel-06',
    collectedAt: '2026-07-02T10:20:00+09:00',
  },
  {
    id: 'tnews-steel-07',
    title: '건설 착공 부진 지속… 봉형강 수요 회복 지연 우려',
    summary:
      '주택 착공 물량 감소가 이어지며 철근·형강 등 봉형강 수요 회복이 지연되고 있다. 전기로 제강사들은 감산 체제를 유지하며 재고 조정에 들어간 것으로 파악된다. 하반기 SOC 예산 집행이 수요의 변곡점이 될 것이란 전망 속에 단기 눈높이는 낮아지는 분위기다.',
    url: 'https://wire.example.net/mock/steel-07',
    collectedAt: '2026-06-25T15:40:00+09:00',
  },
  {
    id: 'tnews-steel-08',
    title: '신흥국 일관제철 프로젝트 논의… 장기 성장 동력 주목',
    summary:
      '고성장 신흥 철강 시장을 겨냥한 일관제철 합작 프로젝트 논의가 업계에서 거론되고 있다. 장기 성장 동력 확보라는 평가가 나오는 한편 초기 투자 부담을 두고는 신중론도 병존한다. 해외 증설이 국내 업황과 어떻게 맞물릴지가 관전 포인트다.',
    url: 'https://daily.example.org/mock/steel-08',
    collectedAt: '2026-06-19T10:07:00+09:00',
  },
  {
    id: 'tnews-steel-09',
    title: '북미 에너지 인프라 투자 확대… 강관 업종 수주 기대',
    summary:
      '북미 LNG 터미널과 송유관 등 에너지 인프라 투자가 확대되며 국내 강관 업종의 수주 기대가 이어지고 있다. 수출 물량이 늘어나는 가운데 고부가 유정용 강관(OCTG) 비중 확대로 수익성도 개선되는 흐름으로 읽힌다.',
    url: 'https://news.example.com/mock/steel-09',
    collectedAt: '2026-06-12T11:40:00+09:00',
  },
  {
    id: 'tnews-steel-10',
    title: '엔저 장기화에 일본산 열연 유입 증가… 판재류 가격 압박',
    summary:
      '엔화 약세가 이어지며 일본산 열연강판 수입이 전년 대비 크게 늘어난 것으로 집계됐다. 국내 판재류 유통가격이 눌리며 냉연·도금재 중심의 중소 업체 수익성에 부담이 되고 있다. 업계에서는 저가 수입재에 대한 무역 구제 조치 확대 요구가 나온다.',
    url: 'https://press.example.com/mock/steel-10',
    collectedAt: '2026-06-04T09:15:00+09:00',
  },
  {
    id: 'tnews-steel-11',
    title: '컬러강판 증설 마무리 국면… 프리미엄 건자재 경쟁',
    summary:
      '건축 내외장재용 컬러강판 라인 증설이 마무리 국면에 들어선 것으로 파악된다. 프리미엄 건자재 시장 공략으로 범용재 대비 높은 마진을 노리는 전략이 눈에 띈다. 가전용 수요 회복과 맞물려 하반기 실적 기여가 기대된다.',
    url: 'https://wire.example.net/mock/steel-11',
    collectedAt: '2026-05-27T13:25:00+09:00',
  },
  {
    id: 'tnews-steel-12',
    title: '철스크랩 가격 보합 전환… 전기로 제강 마진 개선 신호',
    summary:
      '국내 철스크랩 가격이 3개월 만에 하락을 멈추고 보합권에 들어섰다. 철근 유통가격 반등과 맞물리며 전기로 제강 롤마진이 바닥을 통과했다는 분석이 나온다. 다만 건설 수요 회복 없이는 반등 폭이 제한적일 것이란 신중론도 있다.',
    url: 'https://daily.example.org/mock/steel-12',
    collectedAt: '2026-05-19T08:50:00+09:00',
  },
]

const BATTERY_MATERIAL_NEWS: NewsDetail[] = [
  {
    id: 'tnews-batt-01',
    title: '전고체 배터리 상용화 기대 확산… 소재 테마 강세',
    summary:
      '차세대 전고체 배터리 양산 로드맵을 둘러싼 기대가 확산되며 관련 소재 테마가 강세를 보였다. 황화물계 전해질 원료와 실리콘 음극재 밸류체인이 수혜 후보로 거론된다. 차세대 전지 연구개발 예산 확대 논의도 재료로 작용했다.',
    url: 'https://news.example.com/mock/batt-01',
    collectedAt: '2026-07-30T10:22:00+09:00',
  },
  {
    id: 'tnews-batt-02',
    title: '전구체 수직계열화 투자 본격화… 비철·소재 경계 흐려져',
    summary:
      '이차전지 전구체 생산을 겨냥한 신규 설비 투자가 본격화되며 비철금속과 배터리 소재의 경계가 흐려지고 있다. 니켈 제련에서 황산니켈·전구체로 이어지는 수직계열화가 경쟁력으로 꼽힌다. 비중국 공급망 수요가 투자 배경으로 지목된다.',
    url: 'https://press.example.com/mock/batt-02',
    collectedAt: '2026-07-23T10:33:00+09:00',
  },
  {
    id: 'tnews-batt-03',
    title: '리튬 가격 반등 조짐… 소재 재고평가손 우려 완화',
    summary:
      '탄산리튬 가격이 6개월 만에 반등 조짐을 보이며 양극재 업계의 재고자산 평가손실 우려가 완화되고 있다. 판가·원가 래깅 구조상 리튬 가격 안정은 소재 마진의 선행 지표로 읽힌다. 소재 업종의 실적 하향 사이클이 마무리 국면에 들어섰다는 분석이 나온다.',
    url: 'https://wire.example.net/mock/batt-03',
    collectedAt: '2026-07-16T14:30:00+09:00',
  },
  {
    id: 'tnews-batt-04',
    title: '유럽 전기차 판매 둔화 지속… 배터리 소재 수출 감소',
    summary:
      '유럽 주요국의 전기차 보조금 축소 여파로 배터리 소재 수출이 두 달 연속 감소한 것으로 집계됐다. 분리막·전해액 등 중간 소재의 출하 조정이 이어지며 전해질 원료 업체의 가동률도 낮아졌다. 업계는 북미 물량 확대로 유럽 부진을 상쇄한다는 구상이다.',
    url: 'https://daily.example.org/mock/batt-04',
    collectedAt: '2026-07-09T11:21:00+09:00',
  },
  {
    id: 'tnews-batt-05',
    title: '북미 동박 라인 가동 준비… 현지 공급망 요건 충족',
    summary:
      '북미 현지 동박 생산 라인의 상업 가동 준비가 마무리 단계에 들어선 것으로 파악된다. 셀 메이커 인증을 거치며 현지 공급망 요건을 충족한 물량 확대가 예상된다. 하이니켈 배터리향 초극박 비중을 높여 수익성을 방어하는 흐름이다.',
    url: 'https://news.example.com/mock/batt-05',
    collectedAt: '2026-07-01T09:05:00+09:00',
  },
  {
    id: 'tnews-batt-06',
    title: '대형 원통형 배터리 채택 확대… 부품·집전체 수요 증가',
    summary:
      '대형 원통형 배터리 채택이 늘며 국내 부품 업종의 수주 기대가 이어지고 있다. 원통형 캔·탭 부품과 집전체용 니켈도금강판 수요가 늘어 신규 라인 증설 논의가 나온다. 전동공구·ESS로 적용처가 넓어지는 점도 긍정적이다.',
    url: 'https://press.example.com/mock/batt-06',
    collectedAt: '2026-06-24T16:12:00+09:00',
  },
  {
    id: 'tnews-batt-07',
    title: '해외우려기업 기준 구체화… 탈중국 원료 조달 과제 부각',
    summary:
      '북미 보조금 제도의 해외우려기업(FEOC) 기준이 구체화되며 중국산 소재 배제 요건이 뚜렷해지는 흐름이다. 반사 수혜 기대와 함께 흑연·전해질 원료의 탈중국 조달이 현실적 과제로 떠올랐다. 국내 정제·가공 설비 투자 필요성이 커지고 있다.',
    url: 'https://wire.example.net/mock/batt-07',
    collectedAt: '2026-06-17T10:50:00+09:00',
  },
  {
    id: 'tnews-batt-08',
    title: 'ESS 수요 고성장… LFP 소재 국산화 논의 확대',
    summary:
      '전력망용 에너지저장장치(ESS) 수요가 늘며 LFP 배터리 소재 국산화 논의가 확대되고 있다. 양극재·전해액 라인 전환 검토가 이어지고 부품 업체의 ESS 모듈 공급도 늘어나는 흐름이다. 데이터센터 전력 수요가 성장의 또 다른 축으로 지목된다.',
    url: 'https://daily.example.org/mock/batt-08',
    collectedAt: '2026-06-10T11:23:00+09:00',
  },
  {
    id: 'tnews-batt-09',
    title: 'CNT 도전재 채택 확대… 음극 첨가제 수요 증가',
    summary:
      '실리콘 음극재 확산과 함께 탄소나노튜브(CNT) 도전재 채택이 빠르게 늘고 있다. 분산액 생산능력 확대 계획이 잇따르며 관련 소재 수요 전망이 상향되는 분위기다. 단결정 양극재와 함께 차세대 배터리 성능 개선의 핵심 소재로 꼽힌다.',
    url: 'https://news.example.com/mock/batt-09',
    collectedAt: '2026-06-02T14:05:00+09:00',
  },
  {
    id: 'tnews-batt-10',
    title: '폐배터리 재활용 제도 정비 논의… 원료 회수 경쟁 부각',
    summary:
      '사용후 배터리 유통·재활용 제도 정비 논의가 이어지며 리사이클링 시장의 기반이 마련되는 흐름이다. 블랙매스에서 리튬·니켈을 회수하는 습식 제련 기술의 선점 경쟁이 관심을 받는다. 재활용 원료 의무 비율 규제도 수요를 뒷받침한다.',
    url: 'https://press.example.com/mock/batt-10',
    collectedAt: '2026-05-22T10:30:00+09:00',
  },
]

const THEME_NEWS_POOLS: Record<string, NewsDetail[]> = {
  철강: STEEL_NEWS,
  '2차전지-소재부품': BATTERY_MATERIAL_NEWS,
}

export function getThemeNewsPool(themeId: string): NewsDetail[] | null {
  return THEME_NEWS_POOLS[themeId] ?? null
}

export const ALL_THEME_NEWS: NewsDetail[] = Object.values(THEME_NEWS_POOLS).flat()

export const THEME_NEWS_KINDS: Record<string, '호재' | '악재'> = {
  'tnews-steel-01': '호재',
  'tnews-steel-02': '호재',
  'tnews-steel-03': '악재',
  'tnews-steel-04': '호재',
  'tnews-steel-05': '호재',
  'tnews-steel-06': '호재',
  'tnews-steel-07': '악재',
  'tnews-steel-08': '호재',
  'tnews-steel-09': '호재',
  'tnews-steel-10': '악재',
  'tnews-steel-11': '호재',
  'tnews-steel-12': '호재',
  'tnews-batt-01': '호재',
  'tnews-batt-02': '호재',
  'tnews-batt-03': '호재',
  'tnews-batt-04': '악재',
  'tnews-batt-05': '호재',
  'tnews-batt-06': '호재',
  'tnews-batt-07': '악재',
  'tnews-batt-08': '호재',
  'tnews-batt-09': '호재',
  'tnews-batt-10': '호재',
}
