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


RULES_PATH = Path(__file__).resolve().parent.parent / "config" / "signal_rules.json"
OVERRIDES_PATH = Path(__file__).resolve().parent.parent / "config" / "signal_overrides.json"


def _load_rules() -> dict:
    """Load signal rules from config."""
    if not RULES_PATH.exists():
        return {"rules": [], "default_signal": "hold", "default_signal_type": "hold"}
    with open(RULES_PATH) as f:
        return json.load(f)


def _load_overrides() -> dict:
    """Load per-card rule overrides. Returns {card_id: {rule_type: {thresholds}}}."""
    if not OVERRIDES_PATH.exists():
        return {}
    with open(OVERRIDES_PATH) as f:
        data = json.load(f)
    result = {}
    for o in data.get("overrides", []):
        cid = o.get("card_id")
        rtype = o.get("rule_type")
        thresholds = o.get("thresholds", {})
        if cid and rtype:
            result.setdefault(cid, {})[rtype] = thresholds
    return result


def _get_thresholds(rule: dict, rtype: str, card_id: str) -> dict:
    """Merge rule thresholds with per-card overrides. Override wins."""
    base = rule.get("thresholds", {}).copy()
    overrides = _load_overrides()
    if card_id in overrides and rtype in overrides[card_id]:
        base.update(overrides[card_id][rtype])
    return base


# Priority for conflict resolution: lower = stronger. When multiple rules match, pick lowest.
RULE_PRIORITY = {
    "strong_buy": 1,
    "below_direct_low": 2,
    "buy_dip": 3,
    "dip_vs_avg7": 4,
    "rising": 5,
    "sell_opportunity": 6,
    "declining": 7,
    "weak_sell": 8,
    "hold_accumulate": 9,
}


def compute_signal(card_id: str, session) -> dict:
    """
    Compute buy/sell/hold signal for a card.
    Returns: {signal, signal_type, signal_reason, contributing_factors}.
    When multiple rules match, picks strongest by priority. Lists other factors in contributing_factors.
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
    avg_7 = None
    direct_low = None
    if snap_today:
        price_today = snap_today.market or snap_today.mid or snap_today.low
        avg_30 = snap_today.avg_30
        avg_7 = snap_today.avg_7
        direct_low = snap_today.direct_low
    if avg_30 is None or avg_30 <= 0:
        avg_30 = _avg_from_snapshots(session, card_id, 30)
    if avg_7 is None or avg_7 <= 0:
        avg_7 = _avg_from_snapshots(session, card_id, 7)
    if price_today is None or price_today <= 0:
        return {
            "signal": default_signal,
            "signal_type": default_type,
            "signal_reason": "No price data",
            "contributing_factors": [],
        }

    price_today = float(price_today)
    change_7d = trends.get("price_change_7d_pct")
    change_30d = trends.get("price_change_30d_pct")
    trend_label = trends.get("trend", "stable")

    matches = []

    for rule in rules:
        rtype = rule.get("type", "")
        thresholds = _get_thresholds(rule, rtype, card_id)

        if rtype == "strong_buy" and avg_30 and avg_30 > 0:
            dip_ratio = thresholds.get("dip_ratio", 0.95)
            if price_today < dip_ratio * avg_30 and change_7d is not None and change_7d > 0:
                matches.append(("buy", "strong_buy", f"Price ${price_today:.2f} below avg, 7d +{change_7d:.1f}%"))

        if rtype == "buy_dip" and avg_30 and avg_30 > 0:
            ratio = thresholds.get("buy_dip_ratio", 0.9)
            if price_today < ratio * avg_30:
                matches.append(("buy", "buy_dip", f"Price ${price_today:.2f} below 30d avg (${avg_30:.2f})"))

        if rtype == "sell_opportunity" and avg_30 and avg_30 > 0:
            ratio = thresholds.get("sell_premium_ratio", 1.2)
            if price_today > ratio * avg_30:
                matches.append(("sell", "sell_opportunity", f"Price ${price_today:.2f} above 30d avg (${avg_30:.2f})"))

        if rtype == "rising" and change_7d is not None:
            min_pct = thresholds.get("rising_min_pct", 5)
            if change_7d > min_pct:
                matches.append(("buy", "rising", f"7d change +{change_7d:.1f}%"))

        if rtype == "declining" and change_30d is not None:
            max_pct = thresholds.get("declining_max_pct", -10)
            if change_30d < max_pct:
                matches.append(("sell", "declining", f"30d change {change_30d:.1f}%"))

        if rtype == "weak_sell" and change_30d is not None:
            max_pct = thresholds.get("weak_sell_max_pct", -5)
            if change_30d < max_pct:
                matches.append(("sell", "weak_sell", f"30d change {change_30d:.1f}% (moderate decline)"))

        if rtype == "hold_accumulate" and avg_30 and avg_30 > 0 and trend_label == "stable":
            low = thresholds.get("near_low", 0.95)
            high = thresholds.get("near_high", 1.05)
            ratio = price_today / avg_30
            if low <= ratio <= high:
                matches.append(("hold", "hold_accumulate", f"Price ${price_today:.2f} near 30d avg (${avg_30:.2f})"))

        # dip_vs_avg7: price below 7d average (short-term dip)
        if rtype == "dip_vs_avg7" and avg_7 and avg_7 > 0:
            ratio = thresholds.get("dip_avg7_ratio", 0.95)
            if price_today < ratio * avg_7:
                matches.append(("buy", "dip_vs_avg7", f"Price ${price_today:.2f} below 7d avg (${avg_7:.2f})"))

        # below_direct_low: market at or below TCGPlayer direct low (good deal)
        if rtype == "below_direct_low" and direct_low and direct_low > 0:
            market = snap_today.market if snap_today else None
            if market is not None and market > 0 and market <= direct_low:
                matches.append(("buy", "below_direct_low", f"Market ${market:.2f} at/below direct low (${direct_low:.2f})"))

    if matches:
        # Resolve conflicts: prefer buy over hold, sell over hold; within same signal, pick by priority
        buy_matches = [m for m in matches if m[0] == "buy"]
        sell_matches = [m for m in matches if m[0] == "sell"]
        hold_matches = [m for m in matches if m[0] == "hold"]
        if buy_matches and sell_matches:
            # Conflicting: prefer sell (cautious) unless buy is much stronger
            best_sell = min(sell_matches, key=lambda m: RULE_PRIORITY.get(m[1], 99))
            best_buy = min(buy_matches, key=lambda m: RULE_PRIORITY.get(m[1], 99))
            if RULE_PRIORITY.get(best_buy[1], 99) < RULE_PRIORITY.get(best_sell[1], 99):
                winner = best_buy
            else:
                winner = best_sell
        elif buy_matches:
            winner = min(buy_matches, key=lambda m: RULE_PRIORITY.get(m[1], 99))
        elif sell_matches:
            winner = min(sell_matches, key=lambda m: RULE_PRIORITY.get(m[1], 99))
        else:
            winner = min(hold_matches, key=lambda m: RULE_PRIORITY.get(m[1], 99))
        others = [m[2] for m in matches if m != winner]
        return {
            "signal": winner[0],
            "signal_type": winner[1],
            "signal_reason": winner[2],
            "contributing_factors": others[:3],  # cap at 3 for brevity
        }

    return {
        "signal": default_signal,
        "signal_type": default_type,
        "signal_reason": "No strong signal",
        "contributing_factors": [],
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
        factors = sig.get("contributing_factors", [])
        card.signal_contributing = json.dumps(factors) if factors else None
        count += 1
    session.commit()
    return count
