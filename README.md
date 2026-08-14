# finngraph-client

Finngraph web front-end application built with React 19, TypeScript, and shadcn/ui adhering to Coinbase Design System principles.

## Tech Stack

| Area | Choice |
| --- | --- |
| Framework | React 19 + TypeScript, Vite |
| Routing | react-router-dom v7 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Business charts | recharts — annual performance, supply & demand |
| Custom rendering | d3 / d3-hierarchy — treemap layout, candle chart, graph canvas |
| Lint | oxlint |

Charts are split by intent: anything that is a conventional bar/line chart goes through recharts,
while the treemap, candlesticks, and the graph canvas are drawn directly with d3 because their
layout is computed in pure functions that need to stay testable and DOM-independent
(`lib/graphLayout.ts`).

## Design System

The UI follows the **Coinbase design system** — quiet white canvas, editorial spacing, a single
brand voltage color, and a near-monochrome palette. Tokens and per-page specs live in
`design-specs/`.

- [`design-specs/DESIGN.md`](design-specs/DESIGN.md) — the design system reference
- [`design-specs/layout-and-tokens.md`](design-specs/layout-and-tokens.md) — layout grid, color / type tokens
- `theme-dashboard.md`, `theme-detail.md`, `stock-detail.md` — per-page specs

Tokens are materialized as CSS variables in `src/index.css` and consumed through Tailwind.

## Directory Structure

```
finngraph-client/
├── src/
│   ├── App.tsx                 # Route definitions
│   ├── main.tsx                # Entrypoint
│   ├── index.css               # Tailwind + design tokens
│   ├── pages/                  # One component per route (see table above)
│   ├── components/
│   │   ├── layout/             # NavBar, Footer, SiteLayout
│   │   ├── theme/              # Treemap, StockSection, RelatedStocksTable, NewsSection
│   │   ├── stock/              # AnnualCharts, FinancialTable, IssueTimeline, SupplyDemandCharts
│   │   ├── news/               # NewsDetailModal, NewsGraphSection, NewsRelationList, entity chips
│   │   ├── graph/              # GraphView / GraphCanvas, Toolbar, SearchBar, FilterPanel,
│   │   │                       #   HopSelector, Legend, Node / EdgeDetail, Tooltip
│   │   ├── chart/              # CandleChart
│   │   ├── table/              # SortableHeaderRow, StockIdentity — shared list table parts
│   │   └── ui/                 # shadcn/ui primitives
│   ├── data/                   # Mock data layer (see below)
│   ├── lib/                    # Pure utilities & hooks
│   ├── hooks/                  # use-mobile
│   └── assets/
├── data/                       # Raw source data (theme lists, extracted relations)
├── design-specs/               # Design system & per-page specs
├── docs/                       # Interim report, diagrams
├── vite.config.ts              # Vite config + `@` → `src` alias
└── components.json             # shadcn/ui config
```

### `src/data/` — mock data layer

`themes.ts` holds the base themes and stocks; everything numeric is generated **deterministically**
by hashing the theme or ticker, so the same code always renders the same chart and the UI stays
stable across reloads without a backend.

| File | Contents |
| --- | --- |
| `themes.ts` | Base theme & stock data (price, change, trading value) |
| `themePerformance.ts` | Period returns for the theme list |
| `themeDetailStocks.ts` | Constituent stocks on the theme detail page |
| `stockList.ts` / `stockMeta.ts` | Stock list rows and shared metadata (market cap, valuation) |
| `stockDetail.ts` | Stat tiles, supply & demand, issue timeline |
| `financials.ts` | Annual financial statements |
| `candles.ts` | Candle / volume generator (daily, weekly, monthly) |
| `news.ts` / `newsDetail.ts` | News table, per-news subgraph, similar news |
| `graph.ts` / `graphTypes.ts` | Knowledge graph domain — entity types, predicates, node / link mapping |
| `samsung-graph.json` | Triplets extracted from real news, used as the graph fixture |

`graph.ts`, `newsDetail.ts`, and `lib/useNewsGraph.ts` each carry a note marking them as the
swap point: when the API is ready, only their internals change to a `fetch`, and the shape returned
to the components stays the same.

### `src/lib/` — utilities & hooks

| File | Role |
| --- | --- |
| `format.ts` | Change rate, price, market cap, relative time formatting |
| `navigation.ts` | Back-navigation based on the route the detail page was entered from |
| `trend.ts` | Consecutive trend detection for financial metrics |
| `useTableSort.ts` | Sorting state for list tables |
| `useCanvasSize.ts` | Canvas resize observer |
| `useGraphData.ts` / `useNewsGraph.ts` | Data entrypoints for the corporate graph and news subgraph |
| `graphLayout.ts` | Pure graph layout math (no DOM) |
| `graphTheme.ts` | Color tokens for d3 / SVG rendering |
| `graphTooltip.ts` | Imperative tooltip DOM updates for the graph canvas |
| `utils.ts` | `cn` (clsx + tailwind-merge) |

## How to Run

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

No environment variables are needed yet — the app ships with its own data.

```bash
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
npm run lint       # oxlint
```
