# Paste This Into Lovable: Full UI Markers (Signals + Trends)

Add signal badges and trend markers to each watchlist card. Paste the text below into Lovable's chat.

---

## Copy everything between the lines below:

---

Add UI markers to each watchlist card: signal badges and trend indicators.

**Data from GET `/api/cards`** (each card has):
- `signal` – "buy", "sell", or "hold"
- `signal_type` – e.g. "strong_buy", "buy_dip", "rising", "sell_opportunity", "declining", "hold"
- `signal_reason` – short explainer (e.g. "Price 15% below 7d avg")
- `contributing_factors` – array of other matching factors (e.g. ["rising", "below_direct_low"])
- `trends` – object with `price_change_7d_pct`, `price_change_30d_pct`, `trend` ("rising" | "stable" | "declining")

**What to build:**

1. **Signal badge** (primary marker)
   - Show on each card near the price.
   - Map `signal_type` to display label:

   | signal_type        | Display label |
   |--------------------|---------------|
   | strong_buy         | Strong buy    |
   | below_direct_low   | Good deal     |
   | buy_dip            | Buy dip       |
   | dip_vs_avg7        | 7d dip        |
   | rising             | Rising        |
   | sell_opportunity   | Sell          |
   | declining          | Declining     |
   | weak_sell          | Consider sell |
   | hold_accumulate    | Hold          |
   | hold               | Hold (or omit)|

   - **Buy signals** (signal === "buy"): green badge
   - **Sell signals** (signal === "sell"): orange/amber badge
   - **Hold** (signal === "hold"): gray badge, or omit if space is tight

2. **Trend indicator** (secondary)
   - Show `trends.price_change_7d_pct` when available, e.g. "+12% 7d" or "-5% 7d"
   - Use green for positive, red for negative, gray for near zero or null
   - Optionally show `trends.trend` as a small icon (up arrow = rising, down = declining, flat = stable)

3. **Tooltip on hover** (optional but recommended)
   - Show `signal_reason` when user hovers over the signal badge
   - If `contributing_factors` has items, append: "Also: [labels]". Map factor IDs to labels using the same table above (e.g. "rising" → "Rising", "below_direct_low" → "Good deal")

**Example card layout:**
```
[Card image]  Card name
              Set name
              [Strong buy]  +8% 7d   $12.50   <- badge, trend, price
              [Remove]
```

**Visual rules:**
- Keep badges compact (pill/chip style)
- Signal badge is more prominent than the trend number
- Use subtle borders or background tints; avoid clashing with card images
- On mobile, ensure markers remain readable; consider stacking vertically if needed

---

## That's it

Paste into Lovable to add full UI markers (signals + trends) to your watchlist cards.
