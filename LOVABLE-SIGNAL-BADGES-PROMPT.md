# Paste This Into Lovable: Signal Badges Only

Add buy/sell signal badges to each watchlist card. For **full UI markers** (signals + trend percentages + tooltips), use **LOVABLE-UI-MARKERS-PROMPT.md** instead.

---

## Copy everything between the lines below:

---

Display buy/sell signal badges on each watchlist card.

**What to do:**
- Each card from GET `/api/cards` includes: `signal` ("buy", "sell", or "hold"), `signal_type`, `signal_reason`, and `contributing_factors` (array of other matching factors).
- Add a badge or label on each card tile to show the signal at a glance.
- **Buy signals** (signal === "buy"): Show a green badge, e.g. "Buy dip", "Rising", or use signal_type for display. Use a positive/encouraging color (green).
- **Sell signals** (signal === "sell"): Show an orange/amber badge, e.g. "Sell opportunity", "Declining". Use a caution color.
- **Hold** (signal === "hold"): Show a neutral badge like "Hold" or "Stable" in gray, or omit the badge.
- Show `signal_reason` as a tooltip on hover. If `contributing_factors` has items, append them (e.g. "Also: rising, below_direct_low").
- Put the badge near the price or at the top of the card so it's visible at a glance.

**Example layout for a card with buy signal:**
```
[Card image]  Card name
              Set name
              [Rising]  $X.XX    <- badge before price
              [Remove]
```

**Signal type to display label mapping:**
- strong_buy → "Strong buy"
- below_direct_low → "Good deal"
- buy_dip → "Buy dip"
- dip_vs_avg7 → "7d dip"
- rising → "Rising"
- sell_opportunity → "Sell"
- declining → "Declining"
- weak_sell → "Consider sell"
- hold_accumulate → "Hold"
- hold → "Hold" or no badge

---

## That's it

Paste the text above into Lovable's chat. Your watchlist cards will show buy/sell markers to support trading decisions.
