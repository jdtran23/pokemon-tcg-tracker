"""Tests for src/api.py — FastAPI endpoint tests."""
import json

from src.models import Card, PriceSnapshot
from src.db import get_session
from datetime import date, timedelta


class TestHealthCheck:
    def test_root_returns_ok(self, client):
        r = client.get("/")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestCardsEndpoints:
    def test_get_cards_empty(self, client):
        r = client.get("/api/cards")
        assert r.status_code == 200
        assert r.json()["cards"] == []

    def test_get_cards_with_data(self, client, sample_card_with_prices):
        r = client.get("/api/cards")
        assert r.status_code == 200
        cards = r.json()["cards"]
        assert len(cards) >= 1
        card = next(c for c in cards if c["id"] == "test-1")
        assert card["name"] == "Charizard ex"
        assert card["latest_price"] is not None

    def test_get_single_card(self, client, sample_card_with_prices):
        r = client.get("/api/cards/test-1")
        assert r.status_code == 200
        assert r.json()["id"] == "test-1"
        assert r.json()["name"] == "Charizard ex"

    def test_get_single_card_404(self, client):
        r = client.get("/api/cards/nonexistent")
        assert r.status_code == 404


class TestTrendsEndpoint:
    def test_get_trends(self, client, sample_card_with_prices):
        r = client.get("/api/cards/test-1/trends")
        assert r.status_code == 200
        data = r.json()
        assert data["card_id"] == "test-1"
        assert "trend" in data
        assert data["trend"] in ("rising", "stable", "declining")

    def test_get_trends_404(self, client):
        r = client.get("/api/cards/nonexistent/trends")
        assert r.status_code == 404


class TestPricesEndpoint:
    def test_get_prices(self, client, sample_card_with_prices):
        r = client.get("/api/prices/test-1")
        assert r.status_code == 200
        data = r.json()
        assert data["card_id"] == "test-1"
        assert len(data["prices"]) == 30

    def test_get_prices_with_days_filter(self, client, sample_card_with_prices):
        r = client.get("/api/prices/test-1?days=7")
        assert r.status_code == 200
        assert len(r.json()["prices"]) <= 8  # 7 days + today

    def test_get_prices_empty_card(self, client, sample_card):
        r = client.get("/api/prices/test-1")
        assert r.status_code == 200
        assert r.json()["prices"] == []


class TestWatchlistEndpoints:
    def test_get_watchlist_empty(self, client):
        r = client.get("/api/watchlist")
        assert r.status_code == 200
        assert r.json()["card_ids"] == []

    def test_add_card_by_id(self, client):
        r = client.post("/api/watchlist", json={"card_id": "swsh4-25"})
        assert r.status_code == 200
        assert r.json()["card_id"] == "swsh4-25"

        r = client.get("/api/watchlist")
        assert "swsh4-25" in r.json()["card_ids"]

    def test_add_card_by_name(self, client):
        r = client.post("/api/watchlist", json={"card_name": "Pikachu"})
        assert r.status_code == 200

        r = client.get("/api/watchlist")
        assert "Pikachu" in r.json()["card_names"]

    def test_add_card_validation_error(self, client):
        # Both provided
        r = client.post("/api/watchlist", json={"card_id": "x", "card_name": "y"})
        assert r.status_code == 400
        # Neither provided
        r = client.post("/api/watchlist", json={})
        assert r.status_code == 400

    def test_remove_card_from_watchlist(self, client):
        client.post("/api/watchlist", json={"card_id": "swsh4-25"})
        r = client.delete("/api/watchlist?card_id=swsh4-25")
        assert r.status_code == 200

        r = client.get("/api/watchlist")
        assert "swsh4-25" not in r.json()["card_ids"]

    def test_remove_nonexistent_card_404(self, client):
        r = client.delete("/api/watchlist?card_id=nope")
        assert r.status_code == 404


class TestSignalRulesEndpoints:
    def test_get_signal_rules(self, client):
        r = client.get("/api/signal-rules")
        assert r.status_code == 200
        data = r.json()
        assert "rules" in data
        assert len(data["rules"]) > 0

    def test_recompute_signals(self, client, sample_card_with_prices):
        r = client.post("/api/signals/recompute")
        assert r.status_code == 200
        assert r.json()["cards_updated"] >= 1


class TestAlertsEndpoints:
    def test_add_and_get_alert(self, client):
        r = client.post("/api/alerts", json={
            "card_id": "test-1",
            "card_name": "Charizard",
            "condition": "price_below",
            "value": 5.0,
        })
        assert r.status_code == 200
        alert_id = r.json()["id"]
        assert alert_id.startswith("alert-")

    def test_delete_alert(self, client):
        r = client.post("/api/alerts", json={
            "card_id": "test-1", "condition": "price_below", "value": 5.0,
        })
        alert_id = r.json()["id"]

        r = client.delete(f"/api/alerts?alert_id={alert_id}")
        assert r.status_code == 200

    def test_delete_nonexistent_alert(self, client):
        # Need alerts file to exist first
        client.post("/api/alerts", json={
            "card_id": "test-1", "condition": "price_below", "value": 5.0,
        })
        r = client.delete("/api/alerts?alert_id=alert-nonexistent")
        assert r.status_code == 404
