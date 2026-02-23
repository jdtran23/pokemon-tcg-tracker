# Paste This Into Lovable to Add Buy/Sell Signal Badges

Open your PokéMarket project in Lovable, then paste the text below into the chat. Lovable will add signal badges to each watchlist card.

---

## Copy everything between the lines below:

---

Display buy/sell signal badges on each watchlist card.

**What to do:**
- Each card from GET `/api/cards` now includes: `signal` ("buy", "sell", or "hold"), `signal_type` (e.g. "buy_dip", "rising", "declining", "sell_opportunity"), and `signal_reason` (short explainer text).
- Add a badge or label on each card tile to show the signal at a glance.
- **Buy signals** (signal === "buy"): Show a green badge, e.g. "Buy dip", "Rising", or use signal_type for display. Use a positive/encouraging color (green).
- **Sell signals** (signal === "sell"): Show an orange/amber badge, e.g. "Sell opportunity", "Declining". Use a caution color.
- **Hold** (signal === "hold"): Show a neutral badge like "Hold" or "Stable" in gray, or omit the badge.
- Optionally show `signal_reason` as a tooltip on hover or as smaller text under the badge so users understand why.
- Put the badge near the price or at the top of the card so it's visible at a glance.

**Example layout for a card with buy signal:**
```
[Card image]  Card name
              Set name
              [Rising]  $X.XX    <- badge before price
              [Remove]
```

**Signal type to display label mapping:**
- buy_dip → "Buy dip"
- rising → "Rising"
- sell_opportunity → "Sell"
- declining → "Declining"
- hold → "Hold" or no badge

---

## That's it

Paste the text above into Lovable's chat. Your watchlist cards will show buy/sell markers to support trading decisions.
