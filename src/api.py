"""FastAPI server that reads from the SQLite DB."""
import json
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config.settings import TCGDEX_BASE_URL
from src.db import get_session, init_db
from src.models import Card, PriceSnapshot
from src.fetcher import run_fetch
from src.trends import compute_trends
from src.alerts import get_triggered_alerts
from src.signals import update_card_signals

app = FastAPI(
    title="Pokemon TCG Tracker API",
    description="Evidence-based buy/sell data for Pokemon TCG singles and sealed.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


WATCHLIST_PATH = Path(__file__).resolve().parent.parent / "config" / "watchlist.json"
WATCHLIST_MAX = 200
ALERTS_PATH = Path(__file__).resolve().parent.parent / "config" / "alerts.json"
SIGNAL_RULES_PATH = Path(__file__).resolve().parent.parent / "config" / "signal_rules.json"
SIGNAL_OVERRIDES_PATH = Path(__file__).resolve().parent.parent / "config" / "signal_overrides.json"


def _image_url_for_card(card: Card) -> Optional[str]:
    """Return image URL from DB, or derive TCGdex URL when null. TCGdex hosts free card art."""
    if card.image_url:
        return card.image_url
    # Fallback: TCGdex URL pattern https://assets.tcgdex.net/en/{series}/{set_id}/{number}
    # e.g. swsh4-25 -> swsh/swsh4/25, base1-4 -> base/base1/4
    if card.set_id and card.number:
        series = re.match(r"^([a-zA-Z]+)", card.set_id)
        if series:
            base = f"https://assets.tcgdex.net/en/{series.group(1)}/{card.set_id}/{card.number}"
            return base
    return None


def _load_watchlist_full() -> dict:
    if not WATCHLIST_PATH.exists():
        return {"card_ids": [], "card_names": []}
    with open(WATCHLIST_PATH) as f:
        return json.load(f)


def _save_watchlist(data: dict) -> None:
    WATCHLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(WATCHLIST_PATH, "w") as f:
        json.dump(data, f, indent=2)


@app.get("/")
def root():
    """Health check."""
    return {"status": "ok", "service": "pokemon-tcg-tracker"}


@app.get("/api/signal-rules")
def get_signal_rules():
    """Return current signal rules and thresholds (user-adjustable)."""
    if not SIGNAL_RULES_PATH.exists():
        return {"rules": [], "default_signal": "hold", "default_signal_type": "hold"}
    with open(SIGNAL_RULES_PATH) as f:
        return json.load(f)


class UpdateRuleThresholds(BaseModel):
    rule_type: str
    thresholds: dict


@app.patch("/api/signal-rules")
def update_signal_rule_thresholds(body: UpdateRuleThresholds):
    """Update thresholds for a signal rule. Triggers re-compute on next refresh."""
    if not SIGNAL_RULES_PATH.exists():
        raise HTTPException(status_code=404, detail="Signal rules config not found")
    with open(SIGNAL_RULES_PATH) as f:
        data = json.load(f)
    rules = data.get("rules", [])
    updated = False
    for r in rules:
        if r.get("type") == body.rule_type:
            r["thresholds"] = {**r.get("thresholds", {}), **body.thresholds}
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail=f"Rule type '{body.rule_type}' not found")
    with open(SIGNAL_RULES_PATH, "w") as f:
        json.dump(data, f, indent=2)
    updated_rule = next(r for r in rules if r.get("type") == body.rule_type)
    return {"status": "ok", "rule_type": body.rule_type, "thresholds": updated_rule["thresholds"]}


@app.get("/api/signal-overrides")
def get_signal_overrides():
    """Return per-card rule overrides."""
    if not SIGNAL_OVERRIDES_PATH.exists():
        return {"overrides": []}
    with open(SIGNAL_OVERRIDES_PATH) as f:
        return json.load(f)


class AddOverride(BaseModel):
    card_id: str
    rule_type: str
    thresholds: dict


@app.post("/api/signal-overrides")
def add_signal_override(body: AddOverride):
    """Add or update a per-card rule override. Merges with existing override for same card+rule."""
    data = {"overrides": []}
    if SIGNAL_OVERRIDES_PATH.exists():
        with open(SIGNAL_OVERRIDES_PATH) as f:
            data = json.load(f)
    overrides = data.get("overrides", [])
    # Remove existing override for same card+rule
    overrides = [o for o in overrides if not (o.get("card_id") == body.card_id and o.get("rule_type") == body.rule_type)]
    overrides.append({"card_id": body.card_id, "rule_type": body.rule_type, "thresholds": body.thresholds})
    data["overrides"] = overrides
    SIGNAL_OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(SIGNAL_OVERRIDES_PATH, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "ok", "card_id": body.card_id, "rule_type": body.rule_type}


@app.delete("/api/signal-overrides")
def remove_signal_override(card_id: str = None, rule_type: str = None):
    """Remove override(s). Provide card_id and/or rule_type to filter."""
    if not SIGNAL_OVERRIDES_PATH.exists():
        raise HTTPException(status_code=404, detail="No overrides configured")
    with open(SIGNAL_OVERRIDES_PATH) as f:
        data = json.load(f)
    overrides = data.get("overrides", [])
    if card_id and rule_type:
        overrides = [o for o in overrides if not (o.get("card_id") == card_id and o.get("rule_type") == rule_type)]
    elif card_id:
        overrides = [o for o in overrides if o.get("card_id") != card_id]
    elif rule_type:
        overrides = [o for o in overrides if o.get("rule_type") != rule_type]
    else:
        raise HTTPException(status_code=400, detail="Provide card_id and/or rule_type")
    data["overrides"] = overrides
    with open(SIGNAL_OVERRIDES_PATH, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "ok"}


@app.post("/api/signals/recompute")
def recompute_signals():
    """Recompute buy/sell signals for all cards. No price fetch. Use after changing rules or overrides."""
    init_db()
    session = get_session()
    try:
        count = update_card_signals(session)
        return {"status": "ok", "cards_updated": count}
    finally:
        session.close()


@app.post("/api/refresh")
def refresh_prices():
    """Fetch latest prices from TCGdex and save to DB. Call periodically (e.g. daily) to update data."""
    try:
        n = run_fetch(debug=False)
        return {"status": "ok", "cards_updated": n}
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/search")
def search_cards(q: str, limit: int = 15):
    """Search cards by name via TCGdex. Returns id, name, set_id, set_name, image_url for selection."""
    q = (q or "").strip()
    if len(q) < 2:
        return {"cards": []}
    try:
        r = requests.get(
            f"{TCGDEX_BASE_URL}/cards",
            params={"name": q, "pagination:page": 1, "pagination:itemsPerPage": min(limit, 30)},
            timeout=10,
        )
        if r.status_code != 200:
            return {"cards": []}
        raw = r.json()
        if not isinstance(raw, list):
            return {"cards": []}
        cards = []
        for c in raw:
            cid = c.get("id", "")
            if not cid:
                continue
            set_info = c.get("set") or {}
            set_id = set_info.get("id", "")
            if not set_id and "-" in cid:
                set_id = cid.rsplit("-", 1)[0]
            img = c.get("image")
            if not img and set_id:
                num = c.get("localId", "")
                if num:
                    series = re.match(r"^([a-zA-Z]+)", set_id)
                    if series:
                        img = f"https://assets.tcgdex.net/en/{series.group(1)}/{set_id}/{num}"
            cards.append(
                {
                    "id": cid,
                    "name": c.get("name", ""),
                    "set_id": set_id,
                    "set_name": set_info.get("name", ""),
                    "image_url": img,
                }
            )
        return {"cards": cards}
    except requests.RequestException:
        return {"cards": []}


@app.get("/api/watchlist")
def get_watchlist():
    """Return watchlist card IDs and card names."""
    data = _load_watchlist_full()
    return {"card_ids": data.get("card_ids", []), "card_names": data.get("card_names", [])}


class AddToWatchlist(BaseModel):
    card_id: Optional[str] = None
    card_name: Optional[str] = None


@app.post("/api/watchlist")
def add_to_watchlist(body: AddToWatchlist):
    """Add a card to the watchlist by ID or name. Limit 200 total items."""
    if body.card_id and body.card_name:
        raise HTTPException(status_code=400, detail="Provide card_id OR card_name, not both")
    if not body.card_id and not body.card_name:
        raise HTTPException(status_code=400, detail="Provide card_id or card_name")
    data = _load_watchlist_full()
    ids = data.get("card_ids", [])
    names = data.get("card_names", [])
    if body.card_id:
        if body.card_id in ids:
            return {"status": "ok", "message": "Already in watchlist", "card_id": body.card_id}
        if len(ids) + len(names) >= WATCHLIST_MAX:
            raise HTTPException(status_code=400, detail=f"Watchlist full ({WATCHLIST_MAX} max)")
        ids.append(body.card_id)
        data["card_ids"] = ids
    else:
        if body.card_name in names:
            return {"status": "ok", "message": "Already in watchlist", "card_name": body.card_name}
        if len(ids) + len(names) >= WATCHLIST_MAX:
            raise HTTPException(status_code=400, detail=f"Watchlist full ({WATCHLIST_MAX} max)")
        names.append(body.card_name)
        data["card_names"] = names
    _save_watchlist(data)
    return {"status": "ok", "card_id": body.card_id, "card_name": body.card_name}


@app.delete("/api/watchlist")
def remove_from_watchlist(card_id: Optional[str] = None, card_name: Optional[str] = None):
    """Remove a card from the watchlist by ID or name."""
    if card_id and card_name:
        raise HTTPException(status_code=400, detail="Provide card_id OR card_name, not both")
    if not card_id and not card_name:
        raise HTTPException(status_code=400, detail="Provide card_id or card_name")
    data = _load_watchlist_full()
    ids = data.get("card_ids", [])
    names = data.get("card_names", [])
    if card_id:
        if card_id not in ids:
            raise HTTPException(status_code=404, detail="Card ID not in watchlist")
        data["card_ids"] = [x for x in ids if x != card_id]
    else:
        if card_name in names:
            data["card_names"] = [x for x in names if x != card_name]
        else:
            # Fallback: card may have been added by ID; look up by name in DB
            init_db()
            session = get_session()
            try:
                card = session.query(Card).filter(Card.name == card_name).first()
                if card and card.id in ids:
                    data["card_ids"] = [x for x in ids if x != card.id]
                else:
                    raise HTTPException(status_code=404, detail="Card name not in watchlist")
            finally:
                session.close()
    _save_watchlist(data)
    return {"status": "ok"}


@app.get("/api/cards")
def get_cards():
    """List all cards in the catalog with latest prices."""
    init_db()
    session = get_session()
    try:
        cards = session.query(Card).all()
        result = []
        for c in cards:
            latest = (
                session.query(PriceSnapshot)
                .filter(PriceSnapshot.card_id == c.id)
                .order_by(PriceSnapshot.snapshot_date.desc())
                .first()
            )
            prices = None
            if latest:
                prices = {
                    "variant": latest.variant,
                    "source": latest.source,
                    "date": latest.snapshot_date.isoformat() if latest.snapshot_date else None,
                    "market": latest.market,
                    "low": latest.low,
                    "mid": latest.mid,
                    "high": latest.high,
                }
            trends = compute_trends(c.id, session)
            result.append(
                {
                    "id": c.id,
                    "name": c.name,
                    "set_id": c.set_id,
                    "set_name": c.set_name,
                    "number": c.number,
                    "rarity": c.rarity,
                    "supertype": c.supertype,
                    "image_url": _image_url_for_card(c),
                    "latest_price": prices,
                    "trends": trends,
                    "signal": c.signal or "hold",
                    "signal_type": c.signal_type or "hold",
                    "signal_reason": c.signal_reason or "",
                    "contributing_factors": json.loads(c.signal_contributing) if c.signal_contributing else [],
                }
            )
        return {"cards": result}
    finally:
        session.close()


@app.get("/api/cards/{card_id}")
def get_card(card_id: str):
    """Get a single card with latest price."""
    init_db()
    session = get_session()
    try:
        card = session.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")

        latest = (
            session.query(PriceSnapshot)
            .filter(PriceSnapshot.card_id == card_id)
            .order_by(PriceSnapshot.snapshot_date.desc())
            .first()
        )
        prices = None
        if latest:
            prices = {
                "variant": latest.variant,
                "source": latest.source,
                "date": latest.snapshot_date.isoformat() if latest.snapshot_date else None,
                "market": latest.market,
                "low": latest.low,
                "mid": latest.mid,
                "high": latest.high,
            }

        trends = compute_trends(card.id, session)
        return {
            "id": card.id,
            "name": card.name,
            "set_id": card.set_id,
            "set_name": card.set_name,
            "number": card.number,
            "rarity": card.rarity,
            "supertype": card.supertype,
            "image_url": _image_url_for_card(card),
            "latest_price": prices,
            "trends": trends,
            "signal": card.signal or "hold",
            "signal_type": card.signal_type or "hold",
            "signal_reason": card.signal_reason or "",
            "contributing_factors": json.loads(card.signal_contributing) if card.signal_contributing else [],
        }
    finally:
        session.close()


@app.get("/api/cards/{card_id}/trends")
def get_card_trends(card_id: str):
    """Get trend metrics for a card: price_change_7d_pct, price_change_30d_pct, trend."""
    init_db()
    session = get_session()
    try:
        card = session.query(Card).filter(Card.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        return {"card_id": card_id, **compute_trends(card_id, session)}
    finally:
        session.close()


@app.get("/api/alerts")
def get_alerts():
    """Return user alerts that are currently triggered (in-app check on load/refresh)."""
    init_db()
    session = get_session()
    try:
        # Build cards_by_id from catalog for alert checks
        cards = session.query(Card).all()
        cards_by_id = {}
        for c in cards:
            latest = (
                session.query(PriceSnapshot)
                .filter(PriceSnapshot.card_id == c.id)
                .order_by(PriceSnapshot.snapshot_date.desc())
                .first()
            )
            cards_by_id[c.id] = {
                "latest_price": {
                    "market": latest.market,
                    "mid": latest.mid,
                    "low": latest.low,
                } if latest else None,
            }
        triggered = get_triggered_alerts(session, cards_by_id)
        return {"alerts": triggered}
    finally:
        session.close()


class AddAlert(BaseModel):
    card_id: str
    card_name: str = ""
    condition: str  # price_below, price_above, change_7d_above_pct, etc.
    value: float


@app.post("/api/alerts")
def add_alert(body: AddAlert):
    """Add a user alert. Requires card_id, condition, value."""
    import uuid
    path = ALERTS_PATH
    data = {"alerts": []}
    if path.exists():
        with open(path) as f:
            data = json.load(f)
    alerts = data.get("alerts", [])
    new_id = f"alert-{uuid.uuid4().hex[:8]}"
    alerts.append({
        "id": new_id,
        "card_id": body.card_id,
        "card_name": body.card_name or body.card_id,
        "condition": body.condition,
        "value": body.value,
        "enabled": True,
    })
    data["alerts"] = alerts
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "ok", "id": new_id}


@app.delete("/api/alerts")
def remove_alert(alert_id: str):
    """Remove an alert by id."""
    path = ALERTS_PATH
    if not path.exists():
        raise HTTPException(status_code=404, detail="No alerts configured")
    with open(path) as f:
        data = json.load(f)
    alerts = [a for a in data.get("alerts", []) if a.get("id") != alert_id]
    if len(alerts) == len(data.get("alerts", [])):
        raise HTTPException(status_code=404, detail="Alert not found")
    data["alerts"] = alerts
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "ok"}


@app.get("/api/prices/{card_id}")
def get_prices(
    card_id: str,
    variant: Optional[str] = None,
    source: Optional[str] = None,
    days: Optional[int] = None,
):
    """Get price history for a card. Optional filters: variant, source, days (max history)."""
    init_db()
    session = get_session()
    try:
        q = session.query(PriceSnapshot).filter(PriceSnapshot.card_id == card_id)
        if variant:
            q = q.filter(PriceSnapshot.variant == variant)
        if source:
            q = q.filter(PriceSnapshot.source == source)
        if days:
            cutoff = date.today() - timedelta(days=days)
            q = q.filter(PriceSnapshot.snapshot_date >= cutoff)
        snapshots = q.order_by(PriceSnapshot.snapshot_date.asc()).all()

        result = [
            {
                "date": s.snapshot_date.isoformat() if s.snapshot_date else None,
                "variant": s.variant,
                "source": s.source,
                "market": s.market,
                "low": s.low,
                "mid": s.mid,
                "high": s.high,
                "avg_7": s.avg_7,
                "avg_30": s.avg_30,
            }
            for s in snapshots
        ]
        return {"card_id": card_id, "prices": result}
    finally:
        session.close()
