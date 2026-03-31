"""Shared fixtures for pokemon-tcg-tracker tests."""
import atexit
import json
import os
import tempfile
from datetime import date, timedelta
from pathlib import Path

import pytest

# Point DB to a temp file BEFORE importing anything from src
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["TCG_TRACKER_DB_OVERRIDE"] = _tmp_db.name

from src.db import Base, engine, init_db, get_session  # noqa: E402


def _cleanup_tmp_db():
    """Dispose engine so SQLite releases the file, then delete it."""
    engine.dispose()
    if os.path.exists(_tmp_db.name):
        os.unlink(_tmp_db.name)


atexit.register(_cleanup_tmp_db)
from src.models import Card, PriceSnapshot  # noqa: E402


@pytest.fixture(autouse=True)
def _setup_db(tmp_path, monkeypatch):
    """Create fresh tables for each test and clean up after."""
    # Recreate all tables
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    # Point JSON config files to tmp_path (both api and signals modules)
    monkeypatch.setattr("src.api.WATCHLIST_PATH", tmp_path / "watchlist.json")
    monkeypatch.setattr("src.api.ALERTS_PATH", tmp_path / "alerts.json")
    monkeypatch.setattr("src.api.SIGNAL_RULES_PATH", tmp_path / "signal_rules.json")
    monkeypatch.setattr("src.api.SIGNAL_OVERRIDES_PATH", tmp_path / "signal_overrides.json")
    monkeypatch.setattr("src.signals.RULES_PATH", tmp_path / "signal_rules.json")
    monkeypatch.setattr("src.signals.OVERRIDES_PATH", tmp_path / "signal_overrides.json")

    # Write default signal rules
    rules = {
        "rules": [
            {"type": "strong_buy", "signal": "buy", "condition": "", "thresholds": {"dip_ratio": 0.95, "momentum_min_pct": 0}},
            {"type": "buy_dip", "signal": "buy", "condition": "", "thresholds": {"buy_dip_ratio": 0.9}},
            {"type": "sell_opportunity", "signal": "sell", "condition": "", "thresholds": {"sell_premium_ratio": 1.2}},
            {"type": "rising", "signal": "buy", "condition": "", "thresholds": {"rising_min_pct": 5}},
            {"type": "declining", "signal": "sell", "condition": "", "thresholds": {"declining_max_pct": -10}},
            {"type": "weak_sell", "signal": "sell", "condition": "", "thresholds": {"weak_sell_max_pct": -5}},
            {"type": "hold_accumulate", "signal": "hold", "condition": "", "thresholds": {"near_low": 0.95, "near_high": 1.05}},
            {"type": "dip_vs_avg7", "signal": "buy", "condition": "", "thresholds": {"dip_avg7_ratio": 0.95}},
            {"type": "below_direct_low", "signal": "buy", "condition": "", "thresholds": {}},
        ],
        "default_signal": "hold",
        "default_signal_type": "hold",
    }
    (tmp_path / "signal_rules.json").write_text(json.dumps(rules))
    (tmp_path / "watchlist.json").write_text(json.dumps({"card_ids": [], "card_names": []}))

    yield

    Base.metadata.drop_all(engine)


@pytest.fixture
def session():
    """Provide a DB session for tests."""
    s = get_session()
    yield s
    s.close()


@pytest.fixture
def sample_card(session):
    """Insert a sample card and return it."""
    card = Card(
        id="test-1",
        name="Charizard ex",
        set_id="test",
        set_name="Test Set",
        number="1",
        rarity="Rare",
        supertype="Pokémon",
    )
    session.add(card)
    session.commit()
    return card


@pytest.fixture
def sample_card_with_prices(session, sample_card):
    """Insert a sample card with 30 days of price history."""
    today = date.today()
    for i in range(30):
        d = today - timedelta(days=29 - i)
        # Gradually rising prices: base 10.00 rising ~0.10/day
        base_price = 10.0 + i * 0.1
        snap = PriceSnapshot(
            card_id="test-1",
            snapshot_date=d,
            variant="normal",
            source="tcgplayer",
            low=round(base_price * 0.9, 2),
            mid=round(base_price, 2),
            high=round(base_price * 1.1, 2),
            market=round(base_price * 0.95, 2),
            direct_low=round(base_price * 1.2, 2),
        )
        session.add(snap)
    session.commit()
    return sample_card


@pytest.fixture
def client():
    """FastAPI TestClient."""
    from fastapi.testclient import TestClient
    from src.api import app
    return TestClient(app)
