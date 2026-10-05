import { josa } from '@/lib/josa'
import type { DisclosuresFixture } from '@/lib/fg/disclosures'
import type { IssueFlowsFixture } from '@/lib/fg/stockIssues'
import type { LinkedCompany } from '@/lib/fg/stockLinks'

export const stockIssueFlowsFixture: IssueFlowsFixture = {
  anchor: '2026-10-02',
  flows: [
    {
      id: 'export',
      title: '반도체 장비 수출 규제',
      issues: [
        { date: '2026-09-12', title: '장비 수출 규제 검토 보도', media: 8, articles: 9, summary: '해외 정부가 반도체 장비 수출 규제를 검토한다는 보도가 처음 나왔어요.', with: ['솔빛장비'] },
        { date: '2026-09-24', title: '반도체 업계 대응 회의', media: 12, articles: 15, summary: '주요 반도체 회사들이 모여 장비 수급 대책과 국산 소재 활용 방안을 논의했어요.', with: ['다온전자', '솔빛장비'] },
        { date: '2026-10-01', title: '수출 규제 시행 일정 공개', media: 17, articles: 22, summary: '해외 정부가 반도체 장비 수출 규제를 11월 1일부터 시행한다고 발표했어요.', with: ['다온전자', '아라테크'] },
        { date: '2026-10-02', title: '반도체 장비 수출 규제, 국내 소재 공급망 재편', media: 23, articles: 31, summary: '규제 대상 장비를 쓰는 회사들이 해외 소재 대신 국산 소재 조달을 늘리겠다고 밝혔어요.', with: ['솔빛장비', '다온전자'], more: 4 },
      ],
    },
    {
      id: 'memory',
      title: '메모리 가격 반등',
      issues: [
        { date: '2026-07-02', title: '메모리 고정거래가격 석 달 만에 반등', media: 10, articles: 13, summary: 'D램 고정거래가격(기업끼리 대량으로 거래하는 가격)이 석 달 만에 올랐어요.', with: ['다온전자'] },
        { date: '2026-07-29', title: '메모리 고정거래가격 2개월 연속 상승', media: 14, articles: 18, summary: 'D램 고정거래가격이 두 달 연속 올랐다는 조사 결과가 나왔어요.', with: ['다온전자', '윤슬반도체'] },
        { date: '2026-08-31', title: 'D램 고정거래가격 3개월째 올라', media: 12, articles: 14, summary: 'D램 고정거래가격이 석 달째 올랐어요. 서버용 수요가 늘었다는 분석이 함께 나왔어요.', with: ['다온전자'] },
        { date: '2026-09-30', title: '4분기 D램 계약가 인상 협상 시작', media: 15, articles: 19, summary: '메모리 회사들이 4분기 D램 공급 가격을 올리는 협상을 시작했다고 보도됐어요.', with: ['다온전자', '윤슬반도체'] },
      ],
    },
    {
      id: 'hbm',
      title: 'HBM 공급',
      issues: [
        { date: '2026-07-15', title: '해외 고객사와 HBM 공급 협의', media: 6, articles: 7, summary: 'HBM(고대역폭 메모리) 공급을 두고 해외 고객사와 협의하고 있다고 보도됐어요.' },
        { date: '2026-09-18', title: 'HBM 공급 계약 막바지 협상', media: 13, articles: 16, summary: 'HBM 공급 계약이 막바지 협상 단계라는 보도가 나왔어요. 회사는 확정된 바 없다고 밝혔어요.' },
      ],
    },
    {
      id: 'buyback',
      title: '자사주 매입',
      issues: [{ date: '2026-09-08', title: '1조 원 규모 자사주 매입 결정', media: 7, articles: 9, summary: '1조 원 규모의 자사주를 사들이기로 했어요. 12월까지 나눠서 사요.' }],
    },
    {
      id: 'plant',
      title: '평택 2공장 증설',
      issues: [
        { date: '2026-06-05', title: '평택 2공장 증설 검토', media: 5, articles: 6, summary: '평택 2공장 증설을 검토한다는 보도가 나왔어요.' },
        { date: '2026-09-03', title: '평택 2공장 D램 라인 증설 착수', media: 9, articles: 11, summary: '평택 2공장에 D램 생산라인을 늘리는 공사를 시작했어요. 투자 규모는 2조 4,000억 원이에요.' },
      ],
    },
    {
      id: 'q2',
      title: '2분기 실적',
      issues: [{ date: '2026-08-20', title: '2분기 실적, 시장 기대 웃돌아', media: 11, articles: 14, summary: '2분기 영업이익이 1조 1,200억 원으로 시장 예상보다 많았어요.' }],
    },
    {
      id: 'us',
      title: '미국 공장 설립 검토',
      issues: [
        { date: '2026-08-05', title: '미국 텍사스 공장 설립 검토 보도', media: 9, articles: 10, summary: '미국 텍사스에 새 공장을 짓는 방안을 검토한다는 보도가 나왔어요.' },
        { date: '2026-08-12', title: '미국 공장 부지 후보 3곳으로 좁혀', media: 6, articles: 7, summary: '미국 공장 부지 후보를 3곳으로 좁혔다고 보도됐어요.' },
      ],
    },
    {
      id: 'wage',
      title: '임금 협상',
      issues: [
        { date: '2026-07-08', title: '노사 임금 협상 시작', media: 4, articles: 5, summary: '올해 임금 협상이 시작됐어요.' },
        { date: '2026-07-22', title: '임금 협상 잠정 합의', media: 6, articles: 7, summary: '노사가 임금 협상에 잠정 합의했어요.' },
      ],
    },
    {
      id: 'policy',
      title: '소재 국산화 지원책',
      issues: [{ date: '2026-06-18', title: '반도체 소재 국산화 지원책 발표', media: 7, articles: 9, summary: '정부가 반도체 소재 국산화를 돕는 지원 예산과 세액공제 확대안을 발표했어요.', with: ['다솔머티리얼'], more: 2 }],
    },
    {
      id: 'dividend',
      title: '분기 배당',
      issues: [{ date: '2026-05-21', title: '1분기 배당 결정', media: 3, articles: 3, summary: '1분기 배당금을 1주에 344원으로 정했어요.' }],
    },
    {
      id: 'q1',
      title: '1분기 실적',
      issues: [{ date: '2026-04-28', title: '1분기 실적 발표', media: 10, articles: 12, summary: '1분기 영업이익이 7,800억 원으로 1년 전보다 줄었어요.' }],
    },
    {
      id: 'q4',
      title: '4분기 실적',
      issues: [{ date: '2026-01-29', title: '4분기 실적, 시장 예상 밑돌아', media: 12, articles: 15, summary: '4분기 영업이익이 9,500억 원으로 시장 예상보다 적었어요.' }],
    },
    {
      id: 'ces',
      title: '차세대 메모리 공개',
      issues: [{ date: '2026-01-07', title: '차세대 저전력 D램 공개', media: 8, articles: 9, summary: '전시회에서 차세대 저전력 D램을 처음 공개했어요.' }],
    },
    {
      id: 'downturn',
      title: '메모리 감산',
      issues: [
        { date: '2025-11-12', title: '메모리 감산 연장 결정', media: 11, articles: 13, summary: '메모리 생산을 줄이는 기간을 연말까지 늘리기로 했어요.', with: ['다온전자'] },
        { date: '2025-12-03', title: 'D램 가격 하락에 4분기 이익 감소 우려', media: 14, articles: 17, summary: 'D램 가격이 계속 내려 4분기 이익이 줄 수 있다는 전망이 나왔어요.', with: ['다온전자', '윤슬반도체'] },
      ],
    },
  ],
}

export const tradingRatioFixture = 1.4

const DART = 'https://dart.fss.or.kr/'
const ARTICLE = 'https://news.test/finngraph-mock'

export const stockDisclosuresFixture: DisclosuresFixture = {
  anchor: '2026-10-02',
  listUrl: DART,
  items: [
    { date: '2026-10-01', title: '단일판매·공급계약 체결', summary: '가람전자 · 1조 8,400억 원 · 매출액 대비 7.5%', url: DART },
    { date: '2026-09-08', title: '자기주식 취득 결정', summary: '1조 원 · 12월 31일까지', url: DART },
    { date: '2026-09-03', title: '신규시설투자 등', summary: '평택 2공장 D램 라인 · 2조 4,000억 원', url: DART },
    { date: '2026-08-20', title: '영업(잠정)실적(공정공시)', summary: '2분기 영업이익 1조 1,200억 원', url: DART },
    { date: '2026-05-21', title: '현금·현물배당 결정', summary: '1주당 344원 · 1분기', url: DART },
  ],
}

export function linkedCompaniesFixture(name: string): LinkedCompany[] {
  const ga = josa(name, '이/가')
  const gwa = josa(name, '와/과')
  const neun = josa(name, '은/는')
  return [
    {
      id: 'nuri', code: null, name: '누리소재', market: 'KOSDAQ', price: 41050, change: 0.94, gapFromHigh: -12.3, position: 0.689,
      type: 'supply', relation: `${name}의 소재 공급사`, tag: '감광액 공급', title: `누리소재는 ${name}의 소재 공급사예요`,
      hops: [{ edge: 'supply', node: '누리소재' }], strength: 3, confirmed: true,
      evidence: [
        { kind: 'news', quote: `누리소재는 ${name} 생산라인에 감광액을 공급하는 주요 협력사다.`, source: '예시경제', date: '10.01', url: ARTICLE },
        { kind: 'news', quote: `${name}${ga} 국산 소재 비중을 늘리면 누리소재의 공급 물량도 함께 늘 수 있다는 분석이 나왔다.`, source: '예시산업신문', date: '10.02', url: ARTICLE },
        { kind: 'disclosure', quote: `단일판매·공급계약 체결 — 계약 상대방 ${name}, 계약금액 412억 원`, source: '전자공시', date: '08.14', url: DART },
      ],
    },
    {
      id: 'neulbom', code: null, name: '늘봄화학', market: 'KOSDAQ', price: 15240, change: -0.65, gapFromHigh: -19.4, position: 0.41,
      type: 'supply', relation: `${name}의 세정액 공급사`, tag: '세정액 공급', title: `늘봄화학은 ${name}의 세정액 공급사예요`,
      hops: [{ edge: 'supply', node: '늘봄화학' }], strength: 2, confirmed: false,
      evidence: [
        { kind: 'news', quote: `늘봄화학은 ${name}에 반도체 세정액을 공급한다.`, source: '예시산업신문', date: '09.12', url: ARTICLE },
        { kind: 'news', quote: '세정액 국산화 논의가 업계에서 다시 나오고 있다.', source: '예시일보', date: '10.01', url: ARTICLE },
      ],
    },
    {
      id: 'ongyeol', code: null, name: '온결가스', market: 'KOSDAQ', price: 19600, change: 0.51, gapFromHigh: -14.0, position: 0.55,
      type: 'supply', relation: `${name}${gwa} 공급 협의 중`, tag: '특수가스 · 협의 중', title: `온결가스는 ${name}${gwa} 특수가스 공급을 협의하고 있어요`,
      hops: [{ edge: 'supply', node: '온결가스' }], strength: 1, confirmed: false,
      evidence: [
        { kind: 'news', quote: `온결가스가 ${name} 신규 라인에 특수가스를 공급하는 방안을 협의하고 있다.`, source: '예시IT뉴스', date: '09.27', url: ARTICLE },
      ],
    },
    {
      id: 'saegyeol', code: null, name: '새결소재', market: 'KOSDAQ', price: 4215, change: 0.12, gapFromHigh: -27.7, position: 0.24,
      type: 'supply', relation: '누리소재의 원료 공급사', tag: '감광액 원료 공급', title: '새결소재는 누리소재의 원료 공급사예요',
      hops: [{ edge: 'supply', node: '누리소재' }, { edge: 'supply', node: '새결소재' }], strength: 1, confirmed: false,
      evidence: [
        { kind: 'news', quote: '새결소재는 누리소재에 감광액 원료를 공급한다.', source: '예시산업신문', date: '07.22', url: ARTICLE },
      ],
    },
    {
      id: 'garam', code: null, name: '가람전자', market: 'KOSPI', price: 128500, change: 0.39, gapFromHigh: -8.9, position: 0.704,
      type: 'customer', relation: `${name}의 고객사`, tag: '메모리 구매', title: `가람전자는 ${name}의 고객사예요`,
      hops: [{ edge: 'customer', node: '가람전자' }], strength: 2, confirmed: true,
      evidence: [
        { kind: 'news', quote: `가람전자는 ${name} 메모리를 가장 많이 사는 고객사 가운데 하나다.`, source: '예시IT뉴스', date: '09.30', url: ARTICLE },
        { kind: 'disclosure', quote: `사업보고서 주요 매입처 — ${name}(매입 비중 21%)`, source: '전자공시', date: '03.20', url: DART },
      ],
    },
    {
      id: 'boram', code: null, name: '보람디스플레이', market: 'KOSPI', price: 6450, change: -1.38, gapFromHigh: -31.2, position: 0.17,
      type: 'customer', relation: `${name} 구동칩을 쓰는 고객사`, tag: '구동칩 구매', title: `보람디스플레이는 ${name} 구동칩을 쓰는 고객사예요`,
      hops: [{ edge: 'customer', node: '보람디스플레이' }], strength: 1, confirmed: false,
      evidence: [
        { kind: 'news', quote: `보람디스플레이는 ${name} 구동칩을 일부 제품에 쓰고 있다.`, source: '예시일보', date: '08.30', url: ARTICLE },
      ],
    },
    {
      id: 'ieum', code: null, name: '이음정밀', market: 'KOSDAQ', price: 27800, change: 1.27, gapFromHigh: -6.1, position: 0.88,
      type: 'invest', relation: `${name}${ga} 지분 18% 보유`, tag: '지분 18%', title: `이음정밀은 ${name}${ga} 지분 18%를 가진 회사예요`,
      hops: [{ edge: 'invest', node: '이음정밀' }], strength: 2, confirmed: true,
      evidence: [
        { kind: 'disclosure', quote: `타법인 주식 취득 — ${name}${ga} 이음정밀 지분 18% 보유`, source: '전자공시', date: '2025.11.03', url: DART },
        { kind: 'news', quote: `${name}${neun} 장비 부품을 직접 확보하려고 이음정밀에 투자했다.`, source: '예시경제', date: '2025.11.04', url: ARTICLE },
      ],
    },
    {
      id: 'dasol', code: null, name: '다솔머티리얼', market: 'KOSDAQ', price: 8830, change: 3.88, gapFromHigh: -2.4, position: 0.96,
      type: 'theme', relation: `${name}${gwa} 같은 테마`, tag: '국산 소재 대체', title: `다솔머티리얼은 ${name}${gwa} 같은 테마로 묶여요`,
      hops: [{ edge: 'theme', node: '다솔머티리얼' }], strength: 1, confirmed: false,
      evidence: [
        { kind: 'news', quote: `다솔머티리얼은 ${name}${gwa} 함께 국산 소재 대체 테마로 묶인다.`, source: '예시경제', date: '10.02', url: ARTICLE },
      ],
    },
  ]
}
