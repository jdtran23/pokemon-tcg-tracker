"""User-configurable price and trend alerts. In-app check on load/refresh."""
import json
from pathlib import Path
from typing import Any, Optional

from src.trends import compute_trends


ALERTS_PATH = Path(__file__).resolve().parent.parent / "config" / "alerts.json"
ALERTS_EXAMPLE = Path(__file__).resolve().parent.parent / "config" / "alerts.example.json"


def _load_alerts() -> list[dict]:
    """Load alerts from config. Falls back to example if no file."""
    path = ALERTS_PATH if ALERTS_PATH.exists() else ALERTS_EXAMPLE
    if not path.exists():
        return []
    with open(path) as f:
        data = json.load(f)
    return [a for a in data.get("alerts", []) if a.get("enabled", True)]


def _save_alerts(alerts: list[dict]) -> None:
    """Save alerts to config."""
    ALERTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(ALERTS_PATH, "w") as f:
        json.dump({"alerts": alerts}, f, indent=2)


def _price_from_card(card_data: dict) -> Optional[float]:
    """Extract current price from card dict (from API response)."""
    lp = card_data.get("latest_price") or {}
    return lp.get("market") or lp.get("mid") or lp.get("low")


def check_alert(alert: dict, card_data: Optional[dict], trends: dict) -> bool:
    """
    Check if an alert is triggered. card_data and trends can come from API response.
    Returns True if alert fires.
    """
    condition = alert.get("condition", "")
    value = alert.get("value")
    if value is None:
        return False

    price = _price_from_card(card_data) if card_data else None
    change_7d = trends.get("price_change_7d_pct")
    change_30d = trends.get("price_change_30d_pct")

    if condition == "price_below" and price is not None:
        return price < float(value)
    if condition == "price_above" and price is not None:
        return price > float(value)
    if condition == "change_7d_above_pct" and change_7d is not None:
        return change_7d > float(value)
    if condition == "change_7d_below_pct" and change_7d is not None:
        return change_7d < float(value)
    if condition == "change_30d_above_pct" and change_30d is not None:
        return change_30d > float(value)
    if condition == "change_30d_below_pct" and change_30d is not None:
        return change_30d < float(value)
    return False


def get_triggered_alerts(session, cards_by_id: Optional[dict] = None) -> list[dict]:
    """
    Return list of alerts that are currently triggered.
    cards_by_id: optional {card_id: card_dict} from get_cards. If None, fetches from DB.
    """
    from src.models import Card

    alerts = _load_alerts()
    if not alerts:
        return []

    triggered = []
    for a in alerts:
        cid = a.get("card_id")
        if not cid:
            continue
        card_data = (cards_by_id or {}).get(cid)
        trends = compute_trends(cid, session)
        if check_alert(a, card_data, trends):
            triggered.append({
                "id": a.get("id", ""),
                "card_id": cid,
                "card_name": a.get("card_name", cid),
                "condition": a.get("condition", ""),
                "value": a.get("value"),
                "message": _alert_message(a, card_data, trends),
            })
    return triggered


def _alert_message(alert: dict, card_data: Optional[dict], trends: dict) -> str:
    """Generate human-readable message for triggered alert."""
    name = alert.get("card_name", alert.get("card_id", ""))
    cond = alert.get("condition", "")
    val = alert.get("value", "")
    price = _price_from_card(card_data) if card_data else None
    if cond == "price_below" and price is not None:
        return f"{name} is ${price:.2f} (below ${val})"
    if cond == "price_above" and price is not None:
        return f"{name} is ${price:.2f} (above ${val})"
    if cond == "change_7d_above_pct" and trends.get("price_change_7d_pct") is not None:
        pct = trends["price_change_7d_pct"]
        return f"{name} 7d change +{pct:.1f}% (above +{val}%)"
    if cond == "change_7d_below_pct" and trends.get("price_change_7d_pct") is not None:
        pct = trends["price_change_7d_pct"]
        return f"{name} 7d change {pct:.1f}% (below {val}%)"
    if cond == "change_30d_above_pct" and trends.get("price_change_30d_pct") is not None:
        pct = trends["price_change_30d_pct"]
        return f"{name} 30d change +{pct:.1f}% (above +{val}%)"
    if cond == "change_30d_below_pct" and trends.get("price_change_30d_pct") is not None:
        pct = trends["price_change_30d_pct"]
        return f"{name} 30d change {pct:.1f}% (below {val}%)"
    return f"{name} alert triggered"
