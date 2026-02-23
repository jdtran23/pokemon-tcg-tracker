"""Buy/sell signal computation from trend metrics and price rules."""
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

from src.models import Card, PriceSnapshot
from src.trends import compute_trends


def _avg_from_snapshots(session, card_id: str, days: int) -> Optional[float]:
    """Compute rolling average price from snapshots over last N days."""
    today = date.today()
    cutoff = today - timedelta(days=days)
    snaps = (
        session.query(PriceSnapshot)
        .filter(
            PriceSnapshot.card_id == card_id,
            PriceSnapshot.snapshot_date >= cutoff,
        )
        .order_by(PriceSnapshot.snapshot_date.asc())
        .all()
    )
    prices = []
    for s in snaps:
        p = s.market or s.mid or s.low
        if p and p > 0:
            prices.append(float(p))
    if not prices:
        return None
    return sum(prices) / len(prices)


def _load_rules() -> dict:
    """Load signal rules from config."""
    path = Path(__file__).resolve().parent.parent / "config" / "signal_rules.json"
    if not path.exists():
        return {"rules": [], "default_signal": "hold", "default_signal_type": "hold"}
    with open(path) as f:
        return json.load(f)


def compute_signal(card_id: str, session) -> dict:
    """
    Compute buy/sell/hold signal for a card.
    Returns: {signal, signal_type, signal_reason}.
    Rules checked in order: buy_dip, sell_opportunity, rising, declining; first match wins.
    """
    rules_cfg = _load_rules()
    rules = rules_cfg.get("rules", [])
    default_signal = rules_cfg.get("default_signal", "hold")
    default_type = rules_cfg.get("default_signal_type", "hold")

    trends = compute_trends(card_id, session)
    price_today = None
    avg_30 = None

    today = date.today()
    snap_today = (
        session.query(PriceSnapshot)
        .filter(
            PriceSnapshot.card_id == card_id,
            PriceSnapshot.snapshot_date <= today,
        )
        .order_by(PriceSnapshot.snapshot_date.desc(), PriceSnapshot.source.desc())
        .first()
    )
    if snap_today:
        price_today = snap_today.market or snap_today.mid or snap_today.low
        avg_30 = snap_today.avg_30
    if avg_30 is None or avg_30 <= 0:
        avg_30 = _avg_from_snapshots(session, card_id, 30)
    if price_today is None or price_today <= 0:
        return {
            "signal": default_signal,
            "signal_type": default_type,
            "signal_reason": "No price data",
        }

    price_today = float(price_today)
    change_7d = trends.get("price_change_7d_pct")
    change_30d = trends.get("price_change_30d_pct")

    for rule in rules:
        rtype = rule.get("type", "")
        thresholds = rule.get("thresholds", {})

        if rtype == "buy_dip" and avg_30 and avg_30 > 0:
            ratio = thresholds.get("buy_dip_ratio", 0.9)
            if price_today < ratio * avg_30:
                return {
                    "signal": "buy",
                    "signal_type": "buy_dip",
                    "signal_reason": f"Price ${price_today:.2f} below 30d avg (${avg_30:.2f})",
                }

        if rtype == "sell_opportunity" and avg_30 and avg_30 > 0:
            ratio = thresholds.get("sell_premium_ratio", 1.2)
            if price_today > ratio * avg_30:
                return {
                    "signal": "sell",
                    "signal_type": "sell_opportunity",
                    "signal_reason": f"Price ${price_today:.2f} above 30d avg (${avg_30:.2f})",
                }

        if rtype == "rising" and change_7d is not None:
            min_pct = thresholds.get("rising_min_pct", 5)
            if change_7d > min_pct:
                return {
                    "signal": "buy",
                    "signal_type": "rising",
                    "signal_reason": f"7d change +{change_7d:.1f}%",
                }

        if rtype == "declining" and change_30d is not None:
            max_pct = thresholds.get("declining_max_pct", -10)
            if change_30d < max_pct:
                return {
                    "signal": "sell",
                    "signal_type": "declining",
                    "signal_reason": f"30d change {change_30d:.1f}%",
                }

    return {
        "signal": default_signal,
        "signal_type": default_type,
        "signal_reason": "No strong signal",
    }


def update_card_signals(session) -> int:
    """Compute and persist signals for all cards. Returns count updated."""
    cards = session.query(Card).all()
    count = 0
    for card in cards:
        sig = compute_signal(card.id, session)
        card.signal = sig["signal"]
        card.signal_type = sig["signal_type"]
        card.signal_reason = sig.get("signal_reason", "")
        count += 1
    session.commit()
    return count
