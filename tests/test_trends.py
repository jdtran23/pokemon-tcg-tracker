"""Tests for src/trends.py — trend computation."""
from datetime import date, timedelta

from src.db import get_session
from src.models import Card, PriceSnapshot
from src.trends import compute_trends


class TestComputeTrends:
    """Test compute_trends() with various price histories."""

    def test_stable_trend_with_flat_prices(self, session, sample_card):
        """Flat prices over 30 days should yield stable trend."""
        today = date.today()
        for i in range(30):
            d = today - timedelta(days=29 - i)
            session.add(PriceSnapshot(
                card_id="test-1", snapshot_date=d, variant="normal",
                source="tcgplayer", market=10.0, mid=10.0, low=9.0, high=11.0,
            ))
        session.commit()

        result = compute_trends("test-1", session)
        assert result["trend"] == "stable"
        assert result["price_change_7d_pct"] is not None
        # Flat prices → ~0% change
        assert abs(result["price_change_7d_pct"]) < 1.0

    def test_rising_trend(self, session, sample_card):
        """Prices rising >5% in 7 days should be 'rising'."""
        today = date.today()
        # 7 days ago: $10, today: $11 → +10%
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today - timedelta(days=7), variant="normal",
            source="tcgplayer", market=10.0,
        ))
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today, variant="normal",
            source="tcgplayer", market=11.0,
        ))
        session.commit()

        result = compute_trends("test-1", session)
        assert result["trend"] == "rising"
        assert result["price_change_7d_pct"] > 5

    def test_declining_trend(self, session, sample_card):
        """Prices dropping >10% over 30 days should be 'declining'."""
        today = date.today()
        # 30 days ago: $10, today: $8 → -20%
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today - timedelta(days=30), variant="normal",
            source="tcgplayer", market=10.0,
        ))
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today, variant="normal",
            source="tcgplayer", market=8.0,
        ))
        session.commit()

        result = compute_trends("test-1", session)
        assert result["trend"] == "declining"
        assert result["price_change_30d_pct"] < -10

    def test_no_data_returns_none_with_stable(self, session, sample_card):
        """No price snapshots → None percentages, stable trend."""
        result = compute_trends("test-1", session)
        assert result["price_change_7d_pct"] is None
        assert result["price_change_30d_pct"] is None
        assert result["trend"] == "stable"

    def test_price_extraction_prefers_market(self, session, sample_card):
        """market > mid > low priority for price extraction."""
        today = date.today()
        for d_offset in [0, 7]:
            session.add(PriceSnapshot(
                card_id="test-1",
                snapshot_date=today - timedelta(days=d_offset),
                variant="normal", source="tcgplayer",
                market=15.0, mid=12.0, low=10.0,
            ))
        session.commit()

        result = compute_trends("test-1", session)
        # Both prices are $15 (market) → 0% change
        assert result["price_change_7d_pct"] == 0.0

    def test_falls_back_to_mid_when_no_market(self, session, sample_card):
        """When market is None, use mid price."""
        today = date.today()
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today, variant="normal",
            source="tcgplayer", market=None, mid=10.0, low=8.0,
        ))
        session.add(PriceSnapshot(
            card_id="test-1", snapshot_date=today - timedelta(days=7), variant="normal",
            source="tcgplayer", market=None, mid=9.0, low=7.0,
        ))
        session.commit()

        result = compute_trends("test-1", session)
        # mid: 10 vs 9 → +11.11%
        assert result["price_change_7d_pct"] is not None
        assert result["price_change_7d_pct"] > 10
