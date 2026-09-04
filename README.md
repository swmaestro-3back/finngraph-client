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
| Deployment | Docker multi-stage build → nginx (static + reverse proxy) |

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

## Routes

| Path | Page |
| --- | --- |
| `/` | `ThemeDashboardPage` — theme treemap dashboard |
| `/themes` | `ThemeListPage` — theme list with period returns |
| `/theme/:themeId` | `ThemeDetailPage` — constituents, news, performance (`/themes/:themeId` redirects here) |
| `/stocks` | `StockListPage` |
| `/stock/:stockCode` | `StockDetailPage` — candles, financials, supply & demand, issue lane |
| `/graph/:ticker?` | `CorpGraphPage` — knowledge graph, company-scoped |
| `/graph/theme/:name` | `CorpGraphPage` — knowledge graph, theme-scoped |

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
│   │   ├── stock/              # AnnualCharts, FinancialTable, IssueLane, IssueNewsPanel,
│   │   │                       #   SupplyDemandCharts
│   │   ├── news/               # NewsDetailModal, NewsGraphSection, NewsRelationList, entity chips
│   │   ├── graph/              # GraphView / GraphCanvas, Toolbar, SearchBar, FilterPanel,
│   │   │                       #   ScopeSelector, HopSelector, Legend, Node / EdgeDetail, Tooltip
│   │   ├── chart/              # CandleChart
│   │   ├── table/              # SortableHeaderRow, StockIdentity — shared list table parts
│   │   └── ui/                 # shadcn/ui primitives
│   ├── data/                   # Graph domain types + the news-graph fixture
│   ├── lib/                    # API layer, pure utilities & hooks
│   │   └── queries/            # One hook per endpoint (useThemes, useStockDetail, useKgGraph, …)
│   ├── hooks/                  # use-mobile
│   └── assets/
├── data/                       # Raw source data (theme lists, extracted relations)
├── design-specs/               # Design system & per-page specs
├── docs/                       # Interim report, diagrams
├── Dockerfile                  # node build stage → nginx runtime stage
├── docker-compose.yml          # Client service on the shared `finngraph-etl_default` network
├── nginx.conf                  # SPA fallback, asset caching, /api + /kg reverse proxy
├── vite.config.ts              # Vite config + `@` → `src` alias + dev proxy
└── components.json             # shadcn/ui config
```

### `src/lib/` — API layer

The app talks to two backends: the main Finngraph API (`/api`) and the knowledge-graph AI server
(`/kg/api`). Both are reached through relative paths, so the proxy — nginx in Docker, Vite's dev
server locally — decides where the requests actually land.

| File | Role |
| --- | --- |
| `api.ts` | `fetch` wrapper for the main API — unwraps the server envelope, normalizes every failure into a single `ApiError` |
| `apiTypes.ts` / `apiMappers.ts` | Server payload types and payload → UI-model mapping |
| `kgApi.ts` / `kgApiTypes.ts` / `kgMappers.ts` | Same three layers for the knowledge-graph server |
| `queries/` | One hook per endpoint; components consume hooks, never `fetch` directly |

Both clients read an optional override (`VITE_API_BASE_URL`, `VITE_KG_API_BASE_URL`) and otherwise
default to the relative prefixes above.

### `src/lib/` — utilities

| File | Role |
| --- | --- |
| `format.ts` | Change rate, price, market cap, relative time formatting |
| `navigation.ts` / `graphRoute.ts` | Back-navigation and graph route ↔ scope encoding |
| `trend.ts` / `momentum.ts` | Consecutive trend detection and momentum scoring |
| `useTableSort.ts` | Sorting state for list tables |
| `useCanvasSize.ts` | Canvas resize observer |
| `graphLayout.ts` | Pure graph layout math (no DOM) |
| `graphTraversal.ts` | Hop-limited subgraph expansion |
| `graphTheme.ts` | Color tokens for d3 / SVG rendering |
| `graphTooltip.ts` | Imperative tooltip DOM updates for the graph canvas |
| `chartAxis.ts` / `chartSync.tsx` | Axis math and cross-chart cursor sync |
| `utils.ts` | `cn` (clsx + tailwind-merge) |

## How to Run

The client runs as a container: a multi-stage Docker build compiles the Vite bundle and serves it
from nginx, which also reverse-proxies `/api` to the backend and `/kg` to the AI server.

**Prerequisites**

- Docker with Compose v2
- The shared network `finngraph-etl_default` must already exist — it is created by the ETL stack's
  compose project. The client joins it as an external network to reach `finngraph-backend:8080`
  and `finngraph-ai-server:8000` by container name.

```bash
docker network ls | grep finngraph-etl_default   # verify the network exists
docker compose up -d --build                     # http://localhost:5173
```

```bash
docker compose logs -f client   # follow nginx logs
docker compose down             # stop and remove the container
```

Rebuild after code changes — the image is a production build, not a dev server:

```bash
docker compose up -d --build
```

No environment variables are required. `VITE_API_BASE_URL` and `VITE_KG_API_BASE_URL` are only
needed to point the bundle at absolute backend URLs instead of the nginx proxy prefixes; because
Vite inlines them at build time, they must be set during `docker compose build`, not at runtime.
