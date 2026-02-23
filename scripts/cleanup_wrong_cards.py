#!/usr/bin/env python3
"""Remove card entries with wrong names (e.g. swsh7-170=Volcarona stored as Jolteon V).
Run after identifying mismatches. Use: python scripts/cleanup_wrong_cards.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.db import init_db, get_session
from src.models import Card, PriceSnapshot

# Card IDs that have wrong names in our DB (ID from TCGdex = different card)
WRONG_ENTRIES = [
    ("swsh7-170", "Volcarona V"),   # We had stored as Jolteon V
    ("swsh7-171", "Gyarados V"),    # We had stored as Vaporeon V
]

def main():
    init_db()
    s = get_session()
    try:
        for card_id, actual_name in WRONG_ENTRIES:
            card = s.query(Card).get(card_id)
            if card:
                stored_name = card.name
                n = s.query(PriceSnapshot).filter(PriceSnapshot.card_id == card_id).delete()
                s.delete(card)
                s.commit()
                print(f"Removed {card_id} (stored as {stored_name}, actually {actual_name}), {n} price rows")
            else:
                print(f"Skipped {card_id} (not in DB)")
    finally:
        s.close()

if __name__ == "__main__":
    main()
