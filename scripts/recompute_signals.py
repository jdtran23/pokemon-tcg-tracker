#!/usr/bin/env python3
"""Recompute buy/sell signals for all cards. No price fetch. Run after changing rules or overrides."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.db import init_db, get_session
from src.signals import update_card_signals


def main():
    init_db()
    session = get_session()
    try:
        count = update_card_signals(session)
        print(f"Recomputed signals for {count} cards.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
