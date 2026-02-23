# How to Test Trend Metrics (Plain English Guide)

This guide explains how to check that the trend metrics (7-day and 30-day price changes, rising/declining) are working. No technical experience needed.

---

## Before You Start: Is Your App Running?

**If you use the PokéMarket app on Lovable (online):**  
Your app talks to the backend on Railway. The trends are already in the data. If you've pasted the **LOVABLE-SIGNAL-BADGES-PROMPT** into Lovable, you should see badges like "Rising" or "Buy dip" on your cards. That means trends are working.

**If you run the app on your own computer:**  
Follow the steps below.

---

## Option 1: Check in Your Web Browser (Easiest)

**Step 1: Start the app**

1. Open **Terminal** (Mac) or **Command Prompt** (Windows).
   - Mac: press Cmd+Space, type "Terminal", press Enter
   - Windows: press Windows key, type "cmd", press Enter

2. Type this (or copy and paste it), then press Enter:

   ```
   cd Documents/PM-OS/pokemon-tcg-tracker
   ```

3. Type this next, then press Enter:

   ```
   .venv/bin/python scripts/run_api.py
   ```

   You should see a message like "Uvicorn running" or the app starting. **Leave this window open.** The app is now running.

**Step 2: Open a web page to see your cards**

1. Open a **new** browser tab (Chrome, Safari, Firefox, etc.).

2. In the address bar at the top, type:

   ```
   http://localhost:8000/api/cards
   ```

3. Press Enter.

You'll see a long page of text (JSON). This is your card data. Scroll through it. For each card you should see something like:

```json
"trends": {
  "price_change_7d_pct": 14.12,
  "price_change_30d_pct": 19.6,
  "trend": "rising"
}
```

- **price_change_7d_pct** = How much the price changed in the last 7 days (as a percent). A positive number means it went up.
- **price_change_30d_pct** = Same idea, but for 30 days.
- **trend** = "rising" (going up), "stable" (about the same), or "declining" (going down).

If you see those three things for your cards, the trend metrics are working.

---

## Option 2: Check One Card at a Time

If you want to check a specific card (for example, Charizard):

1. Make sure the app is running (see Step 1 above).

2. In your browser, go to:

   ```
   http://localhost:8000/api/cards/swsh4-25/trends
   ```

   (Replace `swsh4-25` with another card ID if you want. Charizard from Vivid Voltage is `swsh4-25`.)

You'll see a shorter page with just that card's trends.

---

## If You See "null" Instead of Numbers

The trends need price history. If you only just added cards and haven't run a refresh yet, you might see `null` instead of percentages.

**To get sample data for testing:**

1. Open Terminal (or Command Prompt).

2. Go to the project folder:

   ```
   cd Documents/PM-OS/pokemon-tcg-tracker
   ```

3. Run the seed script to add 30 days of fake price history:

   ```
   .venv/bin/python scripts/seed_data.py
   ```

4. Restart the app (close the window where it's running, then run `run_api.py` again).

5. Try opening `http://localhost:8000/api/cards` in your browser again. You should now see numbers in the trends.

---

## Quick Summary

| What you want to do          | Where to go (in your browser)               |
|-----------------------------|---------------------------------------------|
| See all cards with trends   | http://localhost:8000/api/cards             |
| See trends for one card     | http://localhost:8000/api/cards/swsh4-25/trends |

---

## Using Lovable (Online App)

If your PokéMarket app lives on Lovable and talks to Railway:

1. The trends are already in the data your app receives.
2. Paste **LOVABLE-SIGNAL-BADGES-PROMPT.md** into Lovable's chat to add badges like "Rising" and "Buy dip" to your cards.
3. When you look at your watchlist, those badges show you the trends at a glance. No need to check raw URLs.
