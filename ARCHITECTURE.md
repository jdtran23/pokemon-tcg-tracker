# Architecture & Tech Stack Decisions

This document captures the rationale behind technology choices for the Pokemon TCG Tracker. Updated as the stack evolves.

## Overview

The app is a **local-first dashboard** — a Python backend (FastAPI + SQLite) providing a REST API consumed by a React frontend. Both run on the user's machine; no cloud services required.

```
pokemon-tcg-tracker/
├── src/              # Python backend (FastAPI, SQLAlchemy, signal engine)
├── scripts/          # CLI entry points (run_api, run_fetch, seed_data)
├── config/           # JSON config (watchlist, alerts, signal_rules)
├── data/             # SQLite database (gitignored)
├── tests/            # Backend tests (pytest)
├── frontend/         # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/          # Typed API client
│   │   ├── components/   # React components (shadcn/ui)
│   │   ├── hooks/        # TanStack Query hooks
│   │   ├── types/        # TypeScript types matching API responses
│   │   └── test/         # Test setup
│   ├── vite.config.ts
│   └── tsconfig.json
└── requirements.txt
```

## Frontend Stack

### React 19 + Vite (over Vue, Svelte, Next.js)

**Primary reason:** Ecosystem depth for data dashboards. The specific libraries needed — TanStack Table (sortable/filterable card collection), Recharts (price trend charts), shadcn/ui (polished components) — are React-first with the most mature implementations.

**Secondary reason:** AI code assistance. React has the most training data of any frontend framework. GitHub Copilot generates more accurate completions for React hooks, component patterns, and API integration code than for Vue or Svelte.

**Why not Vue?** Viable alternative with a gentler learning curve. PrimeVue provides batteries-included dashboard components. Chose React for the broader ecosystem and AI assistance advantage. Vue would be the pick if React's hooks model proved too frustrating.

**Why not Svelte?** Highest developer satisfaction in surveys, least boilerplate. But the charting/table ecosystem is thinner — Chart.js works but there's no Recharts equivalent, TanStack Table's Svelte adapter is less mature, and fewer community resources for troubleshooting.

**Why not Next.js?** Requires a Node.js server, adds SSR/ISR/edge complexity unnecessary for a local dashboard. React + Vite gives the same component ecosystem with simpler architecture.

**Why Vite over Webpack?** Vite uses native ES modules in development — instant server start, sub-100ms HMR. Webpack takes seconds per rebuild. Vite also provides built-in proxy configuration for forwarding `/api` calls to the FastAPI backend during development.

### TypeScript (strict mode)

The API returns ~15 different response shapes. TypeScript strict mode catches field name mismatches, nullable access, and type errors at compile time rather than runtime. The `frontend/src/types/api.ts` file mirrors every backend response shape exactly.

### Tailwind CSS 4 + shadcn/ui (over MUI, Ant Design, Chakra UI)

**shadcn/ui model:** Components are *copied into your project* as source files, not installed as npm dependencies. You own the code — full control over styling and behavior. Components are built on Radix UI primitives, providing accessibility (keyboard nav, screen readers, ARIA) for free.

| Library | Model | Bundle Impact | Customization |
|---------|-------|--------------|---------------|
| **shadcn/ui** | Source in your repo | Only what you use | Full control |
| MUI | npm dependency | ~80KB+ | Theme overrides |
| Ant Design | npm dependency | ~60KB+ | Less flexible |

**Tailwind CSS 4** uses a CSS-first configuration model (`@theme` in CSS). Pairs naturally with shadcn/ui and provides consistent design tokens (spacing, colors, typography) without a designer.

### TanStack Table v8 (over AG Grid, native tables)

Headless table library — handles sorting, filtering, and pagination logic while you control rendering with your own components. Pairs with shadcn/ui's `<Table>` for consistent styling.

AG Grid is enterprise-grade (~200KB) and overkill. Native HTML tables work until you need multi-column sort or pagination.

### Recharts (over Chart.js, D3, Nivo)

React-native charting — components like `<LineChart>`, `<Line>`, `<XAxis>` compose declaratively in JSX. Used for price history charts. Chart.js is imperative (config objects, not components). D3 is a visualization language with extreme learning curve. Recharts covers line/area/bar charts with minimal code.

### TanStack Query v5 (over manual fetch + useState, SWR)

Server state management library. Handles loading/error states, caching, request deduplication, background refetching, and cache invalidation after mutations. Without it, every component that fetches data needs manual `useState` + `useEffect` + error handling — multiplied across 15+ endpoints.

Cache invalidation is particularly important: after adding a card to the watchlist, TanStack Query automatically refetches the card list. Without it, you'd manually track which data to refresh after every mutation.

### React Router v6 (over v7, TanStack Router)

Five static routes (Dashboard, Card Detail, Watchlist, Alerts, Settings). React Router v6 handles this with ~20 lines of config. v7 merged with Remix and introduced loaders/actions — architectural patterns for full-stack apps that add complexity without benefit for a client-side dashboard. TanStack Router is type-safe but newer with a smaller community.

### Vitest (over Jest)

Uses the same Vite transform pipeline as the dev server — TypeScript, JSX, and Tailwind all work identically in tests. Jest requires separate Babel/TS configuration, is slower, and has ESM compatibility issues. Vitest is a drop-in Jest API replacement (`describe`, `it`, `expect`).

## Backend Stack

### FastAPI + SQLAlchemy + SQLite

- **FastAPI:** Async-capable Python web framework with automatic OpenAPI docs. Serves both the REST API and (in production mode) the built frontend static files.
- **SQLAlchemy:** ORM for two tables: `cards` (catalog + signals) and `price_snapshots` (daily price history).
- **SQLite:** Zero-config embedded database. Entire dataset fits in a single file. No server process needed.

### Signal Engine

9 priority-ordered rules that evaluate price data against configurable thresholds. When buy and sell signals conflict, highest priority wins. Rules are stored in `config/signal_rules.json` and can be adjusted via the API.

## Development Workflow

```
# Two-terminal development
Terminal 1: python scripts/run_api.py       → API on :8000
Terminal 2: cd frontend && npm run dev      → Vite on :5173 (proxies /api to :8000)

# Single-process production
cd frontend && npm run build                → static files in frontend/dist/
python scripts/run_api.py                   → serves both API and UI on :8000
```
