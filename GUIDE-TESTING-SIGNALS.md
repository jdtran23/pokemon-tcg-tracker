# How to Test Buy/Sell Signals (Plain English Guide)

This guide shows how to test the signal rules, thresholds, per-card overrides, and contributing factors. No technical experience needed.

---

## Before You Start: Run the App

1. Open **Terminal** (Mac) or **Command Prompt** (Windows).
2. Type: `cd Documents/PM-OS/pokemon-tcg-tracker`
3. Type: `.venv/bin/python scripts/run_api.py`
4. Leave that window open. The app is running.

---

## Test 1: See Signals on Your Cards

1. Open your browser (Chrome, Safari, etc.).
2. Go to: `http://localhost:8000/api/cards`
3. Press Enter.

Scroll through the page. For each card you should see:

- **signal** – "buy", "sell", or "hold"
- **signal_type** – e.g. "strong_buy", "buy_dip", "rising", "declining", "below_direct_low"
- **signal_reason** – short explanation
- **contributing_factors** – other rules that also matched (optional list)

If you see those, the signals are working.

---

## Test 2: See the Rules and Thresholds

1. In your browser, go to: `http://localhost:8000/api/signal-rules`
2. Press Enter.

You should see the list of rules and their thresholds (e.g. buy_dip_ratio: 0.9). That confirms the rules config is loading.

---

## Test 3: Change a Threshold (Optional)

You need a tool that can send a PATCH request. The browser address bar cannot do this. Options:

**Option A – Use the API docs (easiest)**

1. Go to: `http://localhost:8000/docs`
2. Find **PATCH /api/signal-rules**
3. Click **Try it out**
4. In the request body, paste:

   ```json
   {"rule_type": "buy_dip", "thresholds": {"buy_dip_ratio": 0.85}}
   ```

5. Click **Execute**
6. You should see `"status": "ok"`

Then run a refresh (see Test 5) so signals recompute with the new threshold.

**Option B – Use Postman or a similar tool**

Send a PATCH request to `http://localhost:8000/api/signal-rules` with the same JSON body.

---

## Test 4: Add a Per-Card Override (Optional)

1. Go to: `http://localhost:8000/docs`
2. Find **POST /api/signal-overrides**
3. Click **Try it out**
4. In the request body, paste (replace with a real card ID from your watchlist):

   ```json
   {"card_id": "swsh4-25", "rule_type": "buy_dip", "thresholds": {"buy_dip_ratio": 0.85}}
   ```

5. Click **Execute**

That card will use a 0.85 threshold for buy_dip instead of the default 0.9. Run a refresh to see the effect.

---

## Test 5: Recompute Signals (On-Demand)

You can recompute signals without fetching new prices. Use this after changing thresholds or overrides.

**Option A – API (app must be running):**

1. Go to: `http://localhost:8000/docs`
2. Find **POST /api/signals/recompute**
3. Click **Try it out** → **Execute**
4. You should see `"cards_updated": 7` (or however many cards you have)

**Option B – Terminal (no API needed):**

```
.venv/bin/python scripts/recompute_signals.py
```

**To refresh prices AND signals** (full update from TCGdex):

- API: **POST /api/refresh**
- Terminal: `.venv/bin/python scripts/run_fetch.py`

---

## Quick Reference: What to Check

| What you want to check | Where to go |
|------------------------|-------------|
| Cards with signals     | `http://localhost:8000/api/cards` |
| Signal rules           | `http://localhost:8000/api/signal-rules` |
| Per-card overrides     | `http://localhost:8000/api/signal-overrides` |
| Trigger a refresh       | `http://localhost:8000/docs` → POST /api/refresh |

---

## Test 6: In the PokéMarket App (Lovable)

If your app is on Lovable and connected to Railway:

1. Push your changes to GitHub (see GUIDE-PUSH-TO-GITHUB.md).
2. Wait for Railway to redeploy.
3. Paste **LOVABLE-SIGNAL-BADGES-PROMPT.md** into Lovable's chat if you haven't already.
4. Open your watchlist and look for badges like "Rising", "Buy dip", "Good deal", "Sell", etc.
