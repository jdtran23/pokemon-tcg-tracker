"""Trend metrics and signal computation for buy/sell decision support."""
from datetime import date, timedelta
from typing import Optional

from src.models import PriceSnapshot


def _price_from_snapshot(snap: PriceSnapshot) -> Optional[float]:
    """Extract primary price from snapshot (market > mid > low)."""
    if snap.market and snap.market > 0:
        return float(snap.market)
    if snap.mid and snap.mid > 0:
        return float(snap.mid)
    if snap.low and snap.low > 0:
        return float(snap.low)
    return None


def _latest_snapshot_for_date(session, card_id: str, target_date: date):
    """Get the most recent snapshot for a card on or before target_date (prefer tcgplayer normal)."""
    snap = (
        session.query(PriceSnapshot)
        .filter(
            PriceSnapshot.card_id == card_id,
            PriceSnapshot.snapshot_date <= target_date,
        )
        .order_by(
            PriceSnapshot.snapshot_date.desc(),
            # Prefer tcgplayer, then normal variant
            PriceSnapshot.source.desc(),
        )
        .first()
    )
    return snap


def compute_trends(card_id: str, session) -> dict:
    """
    Compute trend metrics for a card from price history.
    Returns: price_change_7d_pct, price_change_30d_pct, trend (rising|stable|declining).
    """
    today = date.today()
    date_7d = today - timedelta(days=7)
    date_30d = today - timedelta(days=30)

    snap_today = _latest_snapshot_for_date(session, card_id, today)
    snap_7d = _latest_snapshot_for_date(session, card_id, date_7d)
    snap_30d = _latest_snapshot_for_date(session, card_id, date_30d)

    price_today = _price_from_snapshot(snap_today) if snap_today else None
    price_7d = _price_from_snapshot(snap_7d) if snap_7d else None
    price_30d = _price_from_snapshot(snap_30d) if snap_30d else None

    change_7d_pct = None
    change_30d_pct = None
    if price_today is not None:
        if price_7d and price_7d > 0:
            change_7d_pct = round((price_today - price_7d) / price_7d * 100, 2)
        if price_30d and price_30d > 0:
            change_30d_pct = round((price_today - price_30d) / price_30d * 100, 2)

    # Trend: rising (>+5% 7d), declining (<-10% 30d), else stable
    trend = "stable"
    if change_7d_pct is not None and change_7d_pct > 5:
        trend = "rising"
    elif change_30d_pct is not None and change_30d_pct < -10:
        trend = "declining"

    return {
        "price_change_7d_pct": change_7d_pct,
        "price_change_30d_pct": change_30d_pct,
        "trend": trend,
    }
