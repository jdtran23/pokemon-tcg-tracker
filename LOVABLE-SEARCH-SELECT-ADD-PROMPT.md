# Paste This Into Lovable to Add Search + Select to Add

Open your PokéMarket project in Lovable, then paste the text below into the chat. Lovable will replace the simple "Add" flow with a search-and-select flow.

---

## Copy everything between the lines below:

---

Replace the current "Add Card" flow with a search-and-select flow so users can pick the exact card to add.

**1. Search input (replace the current add input):**
- A search input with placeholder: "Search cards (e.g. Charizard, Pikachu ex)"
- As the user types (with debounce of ~300ms), call GET `/api/search?q=[what they typed]&limit=15`
- Use the same API base URL the app already uses

**2. Search results dropdown/panel:**
- When the API returns results, show them below or under the search input (dropdown, panel, or list)
- Each result shows: card image (if image_url), card name, set name (if available), and an "Add" button or clickable row
- Display up to 10–15 results
- If no results, show "No cards found. Try a different search."
- Show a loading state while searching

**3. Add from search results:**
- When the user clicks a result (or clicks "Add" on a result), call POST `/api/watchlist` with body: `{ "card_id": "[the selected card's id]" }`
- IMPORTANT: Use the card's **id** from the search result (e.g. "swsh4-25", "base1-4"), NOT the name
- After successful add: show "Card added. Refreshing prices..." then call POST `/api/refresh`, then reload cards from GET `/api/cards`
- Clear the search input and close/hide the results after adding

**4. UX details:**
- Debounce the search: wait ~300ms after the user stops typing before calling the API (avoid a request on every keystroke)
- When the search input is focused and has text, show results. When user clicks outside or adds a card, hide results.
- Each search result should be clearly clickable (full row or card tile). Show the card image thumbnail so users can pick the right printing

**5. Keep the Remove button** on each watchlist card (unchanged).

---

## That's it

Paste the text above into Lovable's chat. The Add flow will become: type to search, see results with images, click to add the exact card you want.
