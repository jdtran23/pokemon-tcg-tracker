# PRD: PokéMarket Buy/Sell Execution Layer

**Status:** Draft
**Author:** Peter Tran
**Last Updated:** 2026-03-30
**Stage:** Personal Project — v2 Feature Expansion

---

## TL;DR

The PokéMarket tracker already tells you *when* to buy or sell. This PRD covers the other half: actually doing it. We're building the buy/sell execution layer, a stock-trading-style interface for managing your Pokemon TCG portfolio end to end, from pulling the trigger on a signal to tracking your realized gains.

---

## Problem

The current app does market analysis well. It surfaces buy signals, trend charts, and price alerts for singles on your watchlist. But when a signal fires, the workflow breaks down:

1. You manually open TCGPlayer, eBay, or Facebook Marketplace in a separate tab
2. You search for the card again
3. You eyeball listings, pick one, and checkout
4. You record the purchase... nowhere
5. When you later sell, you have no idea what you paid, what your margin is, or whether you actually timed it right

There's no portfolio. No P&L. No record of what you own and what you paid. The signal says "buy Charizard ex" but then you're on your own.

This is the exact gap stock trading apps solved in 2012. We're solving it for TCG in 2026.

---

## Who This Is For

**Primary user: The data-driven collector-investor.** Someone who buys singles and sealed products not just for enjoyment but as a small investment portfolio. They think in terms of cost basis, sell targets, and market timing. They're already using the tracker. This feature closes the loop.

**Not for:** Casual collectors who buy what they like. Competitive players building tournament decks. High-volume resellers with warehouse inventory.

### Personas

**"The Flipper"** — Buys singles on dips, sells into spikes. Runs a small operation out of their living room. Checks the tracker daily. Loses track of cost basis when managing 20+ positions simultaneously.

**"The Long-Term Holder"** — Buys sealed products (booster boxes, ETBs) and sits on them. Doesn't need real-time signals as much as a clean record of what they paid and what comparable listings are now. Needs help knowing when to exit.

---

## Goals

1. Close the loop from signal to executed trade
2. Track collection as a portfolio with cost basis, current value, and unrealized P&L
3. Surface sell opportunities when held cards hit price targets
4. Calculate realized gains/losses after a card is sold
5. Support both singles and sealed products

**Out of scope for v1:**
- Actual payment processing (we link out to TCGPlayer/eBay, not process purchases)
- Graded card variants (PSA, BGS) — roadmap item
- Multi-user or shared portfolios
- Tax optimization logic (document the raw numbers, not financial advice)

---

## Solution Overview

Three additions to the existing PokéMarket app:

1. **Buy flow** — Record a purchase when you act on a signal. Capture card, variant, condition, quantity, price paid, and source marketplace.
2. **Portfolio view** — Your held positions. Shows cost basis, current market price, unrealized P&L, and any active sell signals.
3. **Sell flow** — Record a sale. Links to the original buy. Calculates realized gain/loss.

The system doesn't execute trades. It's a trade journal that mirrors how serious investors use spreadsheets today, but with market data already loaded.

---

## Feature Specifications

### 1. Buy Flow

**Entry points:**
- "Log Purchase" button on any card in the watchlist view
- "Log Purchase" action on a buy signal alert
- Standalone "Add Position" button in the Portfolio tab

**Fields required:**
- Card name + set (auto-populated from watchlist)
- Variant (holofoil, reverse holo, first edition, etc.) — dropdown from TCGdex data
- Condition (Near Mint, Lightly Played, Moderately Played, Heavily Played, Damaged)
- Quantity purchased
- Price paid per unit (manual entry — this is your actual cost, not market price)
- Source marketplace (TCGPlayer, eBay, Local, Facebook, PWCC, Other)
- Date purchased (defaults to today)
- Optional: notes (e.g., "bought after Worlds hype spike subsided")

**Behavior:**
- On submit, creates a position entry in `data/portfolio.db`
- Adds the card to watchlist if not already there (so price tracking starts immediately)
- Shows a confirmation with current market price vs. what you paid (instant P&L preview)

**Link to marketplace:** "Find listings" button opens TCGPlayer or eBay search in a new tab, pre-populated with the card name and variant. We don't process the transaction — we just reduce friction.

---

### 2. Portfolio View

New tab in the main app alongside the existing watchlist.

**Table columns:**
| Column | Source |
|--------|--------|
| Card + Set | portfolio.db |
| Variant | portfolio.db |
| Condition | portfolio.db |
| Qty | portfolio.db |
| Cost Basis (per unit) | portfolio.db |
| Avg Market Price (7d) | price_snapshots |
| Current Signal | signal engine |
| Unrealized P&L ($) | calculated |
| Unrealized P&L (%) | calculated |
| Days Held | calculated from buy date |

**Portfolio summary bar (top of view):**
- Total invested (sum of cost basis × qty)
- Current portfolio value (sum of market price × qty)
- Total unrealized P&L ($)
- Total unrealized P&L (%)
- Number of open positions

**Filtering:**
- By signal (show only "sell" positions, "buy" positions, etc.)
- By product type (singles vs. sealed)
- By set
- By P&L direction (winners vs. losers)

**Sorting:** Any column. Default: unrealized P&L % descending (biggest winners first).

---

### 3. Sell Flow

**Entry point:** "Log Sale" button on any position in the Portfolio view.

**Fields:**
- Quantity sold (can be partial — e.g., sell 2 of 5 copies)
- Sale price per unit (actual price received, after marketplace fees)
- Marketplace fees % (optional — defaults to platform average: TCGPlayer 12.75%, eBay ~13%)
- Date sold (defaults to today)
- Destination marketplace
- Optional: notes

**Behavior:**
- Calculates realized gain/loss: `(sale price - marketplace fees) - cost basis`
- Reduces open position qty; closes position if qty reaches 0
- Moves closed positions to a "Sold" history view
- Surfaces the outcome: "You made $47.20 (38%) on this position held for 94 days"

---

### 4. Trade History View

**Sold positions table:**
| Column | Notes |
|--------|-------|
| Card + Set | — |
| Buy Date | — |
| Sell Date | — |
| Days Held | — |
| Cost Basis | — |
| Sale Price (net of fees) | — |
| Realized P&L ($) | — |
| Realized P&L (%) | — |

**Summary stats:**
- Total realized gains (all time)
- Total realized losses (all time)
- Net P&L
- Win rate (% of positions closed at a gain)
- Average holding period (days)
- Best trade, worst trade

---

### 5. Sell Target Alerts

When logging a purchase, optionally set a sell target:
- Target price (e.g., "alert me when this hits $85")
- Target gain % (e.g., "alert me at 40% gain")
- Time-based (e.g., "remind me to review this position in 60 days")

These supplement the existing signal engine alerts. When a held card hits its target or gets a sell signal from the engine, the alert shows in the existing alerts panel with a "Log Sale" CTA.

---

## Data Model Changes

### New table: `positions`

```sql
CREATE TABLE positions (
  id INTEGER PRIMARY KEY,
  card_id TEXT NOT NULL,
  card_name TEXT NOT NULL,
  set_id TEXT,
  variant TEXT,
  condition TEXT,
  qty_purchased INTEGER NOT NULL,
  qty_remaining INTEGER NOT NULL,
  cost_basis_per_unit REAL NOT NULL,
  marketplace TEXT,
  buy_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### New table: `sales`

```sql
CREATE TABLE sales (
  id INTEGER PRIMARY KEY,
  position_id INTEGER REFERENCES positions(id),
  card_id TEXT NOT NULL,
  qty_sold INTEGER NOT NULL,
  sale_price_per_unit REAL NOT NULL,
  marketplace_fee_pct REAL,
  sale_date TEXT NOT NULL,
  marketplace TEXT,
  realized_gain_loss REAL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### New table: `sell_targets`

```sql
CREATE TABLE sell_targets (
  id INTEGER PRIMARY KEY,
  position_id INTEGER REFERENCES positions(id),
  card_id TEXT NOT NULL,
  target_price REAL,
  target_gain_pct REAL,
  review_date TEXT,
  triggered INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## New API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio` | All open positions with calculated P&L |
| POST | `/api/portfolio/buy` | Log a purchase |
| POST | `/api/portfolio/sell` | Log a sale |
| GET | `/api/portfolio/history` | All closed positions |
| GET | `/api/portfolio/summary` | Aggregate stats |
| GET | `/api/portfolio/targets` | Active sell targets |
| POST | `/api/portfolio/targets` | Create sell target |
| DELETE | `/api/portfolio/targets` | Delete sell target |

---

## Sealed Products

Sealed products (booster boxes, Elite Trainer Boxes, blister packs, tins) follow the same buy/sell flow with a few differences:

- **Card ID field** replaced with product name + set (e.g., "Scarlet & Violet Base Set Booster Box")
- **Condition** defaults to "Sealed" — no variant needed
- **Price source:** TCGPlayer sealed prices where available; manual entry fallback
- **No signal engine integration in v1** — sealed prices update less frequently and signals are less reliable for time-based holds

Sealed positions appear in Portfolio with a "Sealed" badge and are excluded from signal-based alerts by default.

---

## Success Metrics

Since this is a personal app, success is experiential, not conversion-driven. Still worth defining:

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Positions logged | 20+ active positions |
| Sell flow used | At least 5 completed sales |
| Cost basis accuracy | Manual verification matches memory |
| P&L visibility | Can answer "what's my best performing card?" in <10 seconds |

---

## Risks and Open Questions

**Risk: Price source mismatch.** The app pulls from TCGdex, which may show different prices than TCGPlayer where you actually buy. Market price in the portfolio view may not match what you'd get if you listed today. Mitigation: clearly label the price source and show the source URL. Let users manually override the "current price" field for a position.

**Risk: Condition grading is subjective.** A "Near Mint" card from one seller varies from another. The condition field is for your own reference; it doesn't affect pricing in v1. We can layer in condition-adjusted price estimates later (TCGPlayer already segments by condition).

**Open question: How do we handle cards bought in lots?** If you buy a collection of 20 cards for $150, how do you allocate cost basis per card? v1 scope: log each card separately with a manual cost basis. A lot-splitting helper is a v2 feature.

**Open question: Should the portfolio tab replace or supplement the watchlist?** Watchlist = cards you're watching but don't own. Portfolio = cards you own. These can overlap (own 3, watching for more). Keep them as separate tabs; positions automatically mirror to watchlist for price tracking.

---

## Dependencies

- Existing price tracking pipeline (TCGdex + pokemontcg.io) — already built
- Signal engine — already built
- Alert system — already built, needs new trigger types for sell targets
- Lovable frontend — will need new UI components via Lovable prompt

---

## Build Sequence

1. Database schema (positions, sales, sell_targets tables)
2. API endpoints (buy, sell, portfolio, history, summary)
3. Portfolio view UI (Lovable prompt)
4. Buy flow UI (Lovable prompt)
5. Sell flow UI (Lovable prompt)
6. Sell target integration with existing alert engine
7. Trade history + summary stats
8. Sealed product support

---

## Appendix: Marketplace Fee Reference

| Platform | Typical Seller Fee |
|----------|--------------------|
| TCGPlayer | 12.75% (Pro sellers lower) |
| eBay | ~13.25% (final value + listing) |
| Facebook Marketplace | 5% (shipping sales) |
| PWCC | 10-15% (varies by price tier) |
| Local/cash | 0% |

Use these as defaults in the sell flow fee field.

---

*This document covers the execution layer only. For market analysis, signal rules, and price tracking, see the existing README and signal engine documentation.*
