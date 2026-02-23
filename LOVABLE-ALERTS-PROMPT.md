# Paste This Into Lovable to Add Alerts Display

Open your PokéMarket project in Lovable, then paste the text below into the chat. Lovable will add an alerts banner that shows when your configured price/trend alerts have fired.

---

## Copy everything between the lines below:

---

Display triggered alerts when the app loads or after refresh.

**What to do:**
- On app load (and after calling POST `/api/refresh`), call GET `/api/alerts` to fetch triggered alerts.
- The response has `alerts`: an array of triggered alerts. Each has `id`, `card_name`, `condition`, `value`, and `message` (e.g. "Charizard is $2.99 (below $5)").
- If there are triggered alerts, show a banner or panel at the top of the watchlist (above the cards) with the alert messages.
- Each alert message is user-friendly. Display them in a list. Use a distinct color (e.g. yellow/amber) so they stand out.
- If no alerts are triggered, hide the banner or show nothing.
- Consider adding a small "Alerts" badge or icon in the header that shows the count of triggered alerts (e.g. "2 alerts") when there are any.

**Example layout:**
```
[Alerts: 2]
- Charizard is $2.99 (below $5)
- Flareon V 7d change +88.2% (above +10%)

[Watchlist cards...]
```

**Note:** Alerts are configured via the API (POST /api/alerts) or the config file. This prompt only adds the in-app display of triggered alerts. Users configure alerts separately.

---

## That's it

Paste the text above into Lovable's chat. The app will show triggered alerts when you load or refresh.
