#!/usr/bin/env python3
"""Add a card to the watchlist from the terminal. No Lovable or API needed."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WATCHLIST_PATH = ROOT / "config" / "watchlist.json"
WATCHLIST_MAX = 200


def add_by_name(name: str) -> bool:
    """Add card by name. Returns True if added."""
    data = {"card_ids": [], "card_names": []}
    if WATCHLIST_PATH.exists():
        with open(WATCHLIST_PATH) as f:
            data = json.load(f)
    ids = data.get("card_ids", [])
    names = data.get("card_names", [])
    if name in names:
        print(f"'{name}' is already in the watchlist.")
        return False
    if len(ids) + len(names) >= WATCHLIST_MAX:
        print(f"Watchlist is full ({WATCHLIST_MAX} max). Remove a card first.")
        return False
    names.append(name)
    data["card_names"] = names
    WATCHLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(WATCHLIST_PATH, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Added '{name}' to watchlist ({len(ids) + len(names)} total).")
    return True


def add_by_id(card_id: str) -> bool:
    """Add card by ID (e.g. swsh4-25). Returns True if added."""
    data = {"card_ids": [], "card_names": []}
    if WATCHLIST_PATH.exists():
        with open(WATCHLIST_PATH) as f:
            data = json.load(f)
    ids = data.get("card_ids", [])
    names = data.get("card_names", [])
    if card_id in ids:
        print(f"'{card_id}' is already in the watchlist.")
        return False
    if len(ids) + len(names) >= WATCHLIST_MAX:
        print(f"Watchlist is full ({WATCHLIST_MAX} max). Remove a card first.")
        return False
    ids.append(card_id)
    data["card_ids"] = ids
    WATCHLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(WATCHLIST_PATH, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Added '{card_id}' to watchlist ({len(ids) + len(names)} total).")
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scripts/add_card.py \"Charizard ex\"")
        print("  python scripts/add_card.py \"Pikachu\" \"Mewtwo\"")
        print("  python scripts/add_card.py --id swsh4-25")
        print("")
        print("Add by name: use the exact card name (e.g. 'Charizard ex', 'Flareon V').")
        print("Add by ID: use --id followed by the card ID from tcgdex.dev")
        sys.exit(1)

    if sys.argv[1] == "--id":
        if len(sys.argv) < 3:
            print("Provide a card ID after --id (e.g. swsh4-25)")
            sys.exit(1)
        for card_id in sys.argv[2:]:
            add_by_id(card_id)
    else:
        for name in sys.argv[1:]:
            add_by_name(name)

    print("")
    print("To fetch prices for the new card(s), run:")
    print("  .venv/bin/python scripts/run_fetch.py")


if __name__ == "__main__":
    main()
