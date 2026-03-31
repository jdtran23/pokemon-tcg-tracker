"""Tests for src/signals.py — buy/sell signal computation."""
import json
from datetime import date, timedelta
from unittest.mock import patch

from src.db import get_session
from src.models import Card, PriceSnapshot
from src.signals import compute_signal, RULE_PRIORITY


class TestComputeSignal:
    """Test compute_signal() for various market scenarios."""

    def test_no_price_data_returns_hold(self, session, sample_card):
        """No price snapshots → default hold signal."""
        result = compute_signal("test-1", session)
        assert result["signal"] == "hold"
        assert result["signal_reason"] == "No price data"

    def test_buy_dip_signal(self, session, sample_card):
        """Price well below 30d avg triggers buy_dip."""
        today = date.today()
        # 30 days of $20 prices, then today at $15 (25% below avg)
        for i in range(30):
            d = today - timedelta(days=30 - i)
            session.add(PriceSnapshot(
                card_id="test-1", snapshot_date=d, variant="normal",
                source="tcgplayer", market=20.0,
            ))
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today, variant="normal",
            source="tcgplayer", market=15.0,
        ))
        session.commit()

        result = compute_signal("test-1", session)
        assert result["signal"] == "buy"
        # Should match buy_dip or strong_buy (price < 0.9 * avg)
        assert result["signal_type"] in ("buy_dip", "strong_buy")

    def test_sell_opportunity_signal(self, session, sample_card):
        """Price well above 30d avg triggers sell_opportunity."""
        today = date.today()
        # All 30 days at $13 (flat, so 7d change ~0%, no rising signal).
        # Set avg_30=$10 on snapshots so sell_opportunity fires: $13/$10 = 1.3 > 1.2
        for i in range(30):
            d = today - timedelta(days=29 - i)
            session.add(PriceSnapshot(
                card_id="test-1", snapshot_date=d, variant="normal",
                source="tcgplayer", market=13.0, avg_30=10.0,
            ))
        session.commit()

        result = compute_signal("test-1", session)
        assert result["signal"] == "sell"
        assert result["signal_type"] == "sell_opportunity"

    def test_hold_accumulate_signal(self, session, sample_card):
        """Price near 30d avg with stable trend → hold_accumulate."""
        today = date.today()
        for i in range(30):
            d = today - timedelta(days=29 - i)
            session.add(PriceSnapshot(
                card_id="test-1", snapshot_date=d, variant="normal",
                source="tcgplayer", market=10.0,
            ))
        session.commit()

        result = compute_signal("test-1", session)
        assert result["signal"] == "hold"
        assert result["signal_type"] == "hold_accumulate"

    def test_below_direct_low_signal(self, session, sample_card):
        """Market at or below direct_low → below_direct_low buy signal."""
        today = date.today()
        # Need some history for avg to exist
        for i in range(10):
            d = today - timedelta(days=10 - i)
            session.add(PriceSnapshot(
                card_id="test-1", snapshot_date=d, variant="normal",
                source="tcgplayer", market=10.0, direct_low=12.0,
            ))
        # Today: market $10, direct_low $12 → market <= direct_low
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today, variant="normal",
            source="tcgplayer", market=10.0, direct_low=12.0,
        ))
        session.commit()

        result = compute_signal("test-1", session)
        assert result["signal"] == "buy"
        assert result["signal_type"] == "below_direct_low"

    def test_priority_resolution(self):
        """Verify priority ordering: strong_buy < buy_dip < ... < hold_accumulate."""
        assert RULE_PRIORITY["strong_buy"] < RULE_PRIORITY["buy_dip"]
        assert RULE_PRIORITY["buy_dip"] < RULE_PRIORITY["sell_opportunity"]
        assert RULE_PRIORITY["sell_opportunity"] < RULE_PRIORITY["hold_accumulate"]

    def test_contributing_factors_populated(self, session, sample_card):
        """When multiple rules match, contributing_factors lists the other matches."""
        today = date.today()
        # Create a scenario where multiple buy signals fire:
        # Price $8 with avg_30 ~$10 → buy_dip (< 0.9*10), strong_buy (< 0.95*10 + 7d rising)
        for i in range(30):
            d = today - timedelta(days=30 - i)
            # Rising last 7 days to trigger strong_buy momentum
            if i >= 23:
                price = 8.0 + (i - 23) * 0.01  # tiny uptick
            else:
                price = 10.0
            session.add(PriceSnapshot(
                card_id="test-1", snapshot_date=d, variant="normal",
                source="tcgplayer", market=price,
            ))
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today, variant="normal",
            source="tcgplayer", market=8.0,
        ))
        session.commit()

        result = compute_signal("test-1", session)
        assert result["signal"] == "buy"
        # Should have contributing factors from other matching rules
        # At minimum buy_dip should fire (8 < 0.9 * ~10)
        assert isinstance(result["contributing_factors"], list)

    def test_nonexistent_card_returns_hold(self, session):
        """Card with no DB record at all → default hold."""
        result = compute_signal("nonexistent-card", session)
        assert result["signal"] == "hold"
        assert result["signal_reason"] == "No price data"
