# Finngraph Client

`Finngraph-Design` 디자인 시안을 React로 구현한 데모 앱. 국내 주식의 **테마 트리맵 → 테마 상세 → 종목 상세**로 이어지는 탐색 흐름과, 기업 지식그래프 시각화를 담고 있다.

## 기술 스택

- **Vite + React 19 + TypeScript**, react-router-dom v7
- **Tailwind CSS v4 + shadcn/ui** (radix-ui 기반)
- **recharts** — 연간 실적·투자자별 수급 차트
- **d3 / d3-hierarchy** — 트리맵 레이아웃, 지식그래프 캔버스 렌더링
- 디자인 토큰·스펙: `design-specs/` (레이아웃, 테마 대시보드/상세, 종목 상세)

## 페이지 (라우트)

`src/App.tsx`의 `<Routes>`에 정의된 6개 페이지. 목록(DB)은 복수형, 상세는 단수형+파라미터 규칙을 따른다.

| 경로 | 페이지 컴포넌트 | 설명 |
|---|---|---|
| `/` | `ThemeDashboardPage` | 테마 트리맵(20/30/40개, 등락률 크기·등락률 색), 선택 테마 종목 리스트, 관련 뉴스 |
| `/themes` | `ThemeDbPage` | 테마 DB — 전일·1주·1개월·3개월 수익률, 거래대금, 종목수 정렬 테이블(페이지네이션) |
| `/theme/:themeId` | `ThemeDetailPage` | 테마 상세 — 지수 캔들차트(일/주/월봉), 관련 종목 테이블, 관련 뉴스 |
| `/stocks` | `StockDbPage` | 종목 DB — 현재가·등락률·시총·PER/PBR/ROE·배당률 정렬 테이블(페이지네이션) |
| `/stock/:stockCode` | `StockDetailPage` | 종목 상세 — 캔들차트+이슈 타임라인, 스탯 타일, 투자자별 수급, 연간 실적 6차트, 재무 요약 |
| `/graph` | `CorpGraphPage` | 기업 지식그래프 — 엔티티/관계 버블 그래프 시각화 |

모든 페이지는 `SiteLayout`(NavBar + Footer) 아래에 중첩 렌더링된다. 상세 페이지의 "뒤로가기"는 진입 경로를 링크 state로 넘겨받아 복원한다(`lib/navigation.ts`).

## 프로젝트 구조

```
src/
├─ pages/            # 라우트별 페이지 6종 (위 표 참고)
├─ components/
│  ├─ layout/        # NavBar, Footer, SiteLayout
│  ├─ theme/         # Treemap, CandleChart, RelatedStocksTable, NewsSection
│  ├─ stock/         # AnnualCharts(6종), FinancialTable, IssueTimeline, SupplyDemandCharts
│  ├─ table/         # SortableHeaderRow, StockIdentity — DB 테이블 공용 파츠
│  ├─ graph/         # 지식그래프 뷰 — GraphView/Canvas, Toolbar, SearchBar,
│  │                 #   FilterPanel, HopSelector, Legend, Node/EdgeDetail, Tooltip
│  └─ ui/            # shadcn/ui 프리미티브
├─ data/             # 결정적 더미데이터 생성기 (아래 참고)
├─ lib/              # 순수 유틸 · 커스텀 훅
├─ hooks/            # use-mobile
├─ assets/           # 이미지
├─ App.tsx           # 라우트 정의
├─ main.tsx          # 엔트리
└─ index.css         # Tailwind · 디자인 토큰
```

### `data/` — 더미데이터
`themes.ts`가 기반(테마/종목), 나머지는 코드·id 해시로 값을 결정적으로 생성한다.

| 파일 | 내용 |
|---|---|
| `themes.ts` | 테마·종목 기본 데이터 (가격/등락률/거래대금 더미) |
| `themePerformance.ts` | 테마 DB 기간별 수익률 |
| `themeDetailStocks.ts` | 테마 상세 관련 종목 |
| `stockList.ts` / `stockMeta.ts` | 종목 DB 리스트 · 공유 메타(시총·지표) |
| `stockDetail.ts` | 종목 상세 스탯·수급·이슈 타임라인 |
| `financials.ts` | 연간 재무 데이터 |
| `candles.ts` | 캔들/거래량 생성기 (일/주/월봉) |
| `news.ts` | 테마 관련 뉴스 |
| `graph.ts` / `graphTypes.ts` | 지식그래프 엔티티·관계 도메인 |
| `types.ts` | 공용 타입 |

### `lib/` — 유틸 · 훅
| 파일 | 역할 |
|---|---|
| `format.ts` | 등락률·가격·시총 포맷 |
| `navigation.ts` | 상세 페이지 진입 경로 기반 뒤로가기 |
| `trend.ts` | 재무 지표 연속 추세 구간 계산 |
| `useTableSort.ts` | DB 테이블 정렬 상태 훅 |
| `useCanvasSize.ts` | 캔버스 리사이즈 훅 |
| `useGraphData.ts` | 지식그래프 데이터 로딩·가공 훅 |
| `graphLayout.ts` | 그래프 캔버스 순수 레이아웃 계산 (DOM 비의존) |
| `graphTheme.ts` | d3(SVG) 렌더링 색 토큰 |
| `graphTooltip.ts` | 그래프 호버 툴팁 DOM 갱신 |
| `utils.ts` | `cn` (clsx + tailwind-merge) |

## 실행

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b + vite build
npm run preview   # 빌드 결과 미리보기
npm run lint      # oxlint
```
