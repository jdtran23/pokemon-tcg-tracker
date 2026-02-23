#!/usr/bin/env python3
"""Remove a card from the watchlist from the terminal. No Lovable or API needed."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WATCHLIST_PATH = ROOT / "config" / "watchlist.json"


def remove_by_name(name: str) -> bool:
    """Remove card by name. Returns True if removed."""
    if not WATCHLIST_PATH.exists():
        print("No watchlist found.")
        return False
    with open(WATCHLIST_PATH) as f:
        data = json.load(f)
    names = data.get("card_names", [])
    if name not in names:
        print(f"'{name}' is not in the watchlist.")
        return False
    data["card_names"] = [n for n in names if n != name]
    with open(WATCHLIST_PATH, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Removed '{name}' from watchlist.")
    return True


def remove_by_id(card_id: str) -> bool:
    """Remove card by ID. Returns True if removed."""
    if not WATCHLIST_PATH.exists():
        print("No watchlist found.")
        return False
    with open(WATCHLIST_PATH) as f:
        data = json.load(f)
    ids = data.get("card_ids", [])
    if card_id not in ids:
        print(f"'{card_id}' is not in the watchlist.")
        return False
    data["card_ids"] = [i for i in ids if i != card_id]
    with open(WATCHLIST_PATH, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Removed '{card_id}' from watchlist.")
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scripts/remove_card.py \"Charizard ex\"")
        print("  python scripts/remove_card.py --id swsh4-25")
        sys.exit(1)

    if sys.argv[1] == "--id":
        if len(sys.argv) < 3:
            print("Provide a card ID after --id (e.g. swsh4-25)")
            sys.exit(1)
        remove_by_id(sys.argv[2])
    else:
        remove_by_name(sys.argv[1])


if __name__ == "__main__":
    main()
