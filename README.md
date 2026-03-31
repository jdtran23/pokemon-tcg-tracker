# Pokemon TCG Market Tracker

Local app for analyzing Pokemon TCG singles and sealed product trends to make evidence-based buy/sell decisions. Runs entirely on your machine with free data sources.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.9 · FastAPI · SQLAlchemy · SQLite |
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui |
| **Data Fetching** | TanStack Query v5 |
| **Tables** | TanStack Table v8 |
| **Charts** | Recharts |
| **Testing** | pytest (backend) · Vitest + React Testing Library (frontend) |
| **Price Data** | TCGdex (free, primary) · pokemontcg.io (free key, fallback) |

For detailed rationale on tech stack choices, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Setup

### Backend (Python)

**Windows PowerShell:**
```powershell
cd pokemon-tcg-tracker
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux/macOS:**
```bash
cd pokemon-tcg-tracker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Optional:** Get a free API key from [dev.pokemontcg.io](https://dev.pokemontcg.io/) (20k/day vs 1k without). Create `.env` in the project root:
```
POKEMON_TCG_API_KEY=your_key_here
```

### Frontend (React)

```bash
cd frontend
npm install
```

**Development (two terminals):**
```bash
# Terminal 1: Start API server
python scripts/run_api.py

# Terminal 2: Start frontend dev server
cd frontend
npm run dev
```

- API: http://localhost:8000 (Swagger docs at `/docs`)
- Frontend: http://localhost:5173 (auto-proxies `/api` to backend)

**Production build (single process):**
```bash
cd frontend
npm run build
cd ..
python scripts/run_api.py
```
Opens at http://localhost:8000 — FastAPI serves both API and UI.

**Run tests:**
```bash
# Backend
pytest

# Frontend
cd frontend
npm run test
```

## Watchlist

**Add/remove from terminal (no Lovable needed):**

**Windows PowerShell:**
```powershell
# Add by name
python scripts/add_card.py "Charizard ex" "Pikachu"

# Add by ID (from tcgdex.dev)
python scripts/add_card.py --id swsh4-25

# Remove
python scripts/remove_card.py "Charizard ex"
python scripts/remove_card.py --id swsh4-25
```

**Linux/macOS:**
```bash
.venv/bin/python scripts/add_card.py "Charizard ex" "Pikachu"
.venv/bin/python scripts/add_card.py --id swsh4-25
.venv/bin/python scripts/remove_card.py "Charizard ex"
.venv/bin/python scripts/remove_card.py --id swsh4-25
```

Then run `scripts/run_fetch.py` to load prices for new cards.

**Or edit** `config/watchlist.json` directly:

- **card_ids**: Exact IDs from [pokemontcg.io](https://pokemontcg.io/) (e.g. `swsh4-25` = Vivid Voltage Charizard)
- **card_names**: Fallback search by name (e.g. `Flareon V`, `Jolteon VMAX`). Uses search API when IDs 404.

## Run

**Seed sample data (for development):**
```bash
python scripts/seed_data.py
```
Adds 7 sample cards (Charizard + Eeveelutions) with 30 days of fake price history.

**Fetch live prices:**
```bash
python scripts/run_fetch.py          # normal
python scripts/run_fetch.py --debug  # verbose
```

**API server:**
```bash
python scripts/run_api.py
```
Serves at http://localhost:8000. Swagger docs at http://localhost:8000/docs.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/cards` | All tracked cards with latest prices + signals |
| GET | `/api/cards/{id}` | Single card detail |
| GET | `/api/cards/{id}/trends` | Trend data (7d/30d change, label) |
| GET | `/api/prices/{card_id}` | Price history (optional: `?variant=`, `?source=`, `?days=`) |
| GET | `/api/search?q=X` | Search TCGdex by name |
| GET/POST/DELETE | `/api/watchlist` | Manage watchlist |
| GET/POST/DELETE | `/api/alerts` | Manage user alerts |
| GET/PATCH | `/api/signal-rules` | View/update signal thresholds |
| GET/POST/DELETE | `/api/signal-overrides` | Per-card signal overrides |
| POST | `/api/signals/recompute` | Recompute signals (no price fetch) |
| POST | `/api/refresh` | Fetch latest prices + save to DB |

## Scheduled Updates

## Data

- **Source:** [TCGdex](https://tcgdex.dev) (primary, free, no API key) and pokemontcg.io (fallback)
- **Storage:** SQLite at `data/tcg_tracker.db`
- **Tables:** `cards` (catalog), `price_snapshots` (history by variant/source)

## For non-technical users

See **GUIDE-FOR-NON-TECHNICAL-USERS.md** for simple instructions on adding and removing cards.

## Buy/Sell Signals

The app computes trend metrics and buy/sell signals after each refresh:

- **Trends:** `price_change_7d_pct`, `price_change_30d_pct`, `trend` (rising|stable|declining)
- **Signals:** `signal` (buy|sell|hold), `signal_type`, `signal_reason`, `contributing_factors`
- **Rule types:** strong_buy, below_direct_low, buy_dip, dip_vs_avg7, rising, sell_opportunity, declining, weak_sell, hold_accumulate
- **User-adjustable:** GET/PATCH `/api/signal-rules` for global thresholds; GET/POST/DELETE `/api/signal-overrides` for per-card overrides
- **Alerts:** User-configurable price/trend alerts; GET `/api/alerts` returns triggered ones

Rules: `config/signal_rules.json`. Per-card overrides: `config/signal_overrides.json`. Alerts: copy `config/alerts.example.json` to `config/alerts.json`.

## Roadmap

- [ ] PSA population scraper
- [ ] PriceCharting scraper (graded + sealed)
- [ ] TCGPlayer sealed scraper
- [x] Trend analytics (7d/30d/90d, rising/declining)
- [x] Buy/sell signal engine (9 rules, priority-ordered)
- [x] React frontend dashboard

## License

Personal use. Not financial advice.
