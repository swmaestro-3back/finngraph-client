# Finngraph Frontend

`Finngraph-Design` 디자인 시안을 React로 구현한 데모 앱.

## 기술 스택

- Vite + React 19 + TypeScript, react-router-dom
- Tailwind CSS v4 + shadcn/ui (radix-nova 스타일)
- recharts (연간 실적·수급 차트), d3-hierarchy (트리맵 레이아웃)
- 디자인 토큰: Coinbase Design System 기반 (`design-specs/layout-and-tokens.md`)

## 프로젝트 구조

```
src/
├─ components/
│  ├─ layout/     # NavBar, Footer, SiteLayout
│  ├─ theme/      # Treemap, CandleChart, NetworkGraph, RelatedStocksTable
│  ├─ stock/      # AnnualCharts(6종), FinancialTable, IssueTimeline, SupplyDemandCharts
│  └─ ui/         # shadcn/ui 컴포넌트
├─ data/          # 더미데이터 (테마 30개, 재무 14개년, 캔들/수급/이슈 생성기)
├─ lib/           # format 유틸, cn
└─ pages/         # 라우트별 페이지 4종
```

## 페이지

| 경로 | 페이지 | 주요 요소 |
|---|---|---|
| `/` | 테마 대시보드 | 트리맵 히트맵(10/20/30개), 선택 테마 종목 리스트, 관련 뉴스 |
| `/theme/:themeId` | 테마 상세 | 테마 지수 캔들차트(일/주/월봉), 버블 네트워크 그래프, 관련 종목 테이블(검색·더보기), 관련 뉴스 |
| `/stock/:stockCode` | 주식 상세 | 주가 캔들차트+거래량+이슈 타임라인(팝오버), 요약 스탯, 투자자별 수급, 연간 실적 6차트, 재무 지표 요약 테이블 |
| `/graph` | 기업 그래프 | 상품 관계 버블 그래프 |


## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build
npm run lint     # oxlint
```