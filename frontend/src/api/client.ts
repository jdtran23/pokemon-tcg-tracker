// ---------------------------------------------------------------------------
// Pokemon TCG Tracker — API Client
// Typed fetch wrapper for the FastAPI backend.
// Uses relative URLs — Vite proxy forwards /api → backend.
// ---------------------------------------------------------------------------

import type {
  AlertsResponse,
  AlertsConfigResponse,
  Card,
  CardTrendsResponse,
  CardsResponse,
  PricesResponse,
  SearchResponse,
  SignalOverridesResponse,
  SignalRulesResponse,
  StatusResponse,
  WatchlistResponse,
} from "../types/api";

// -- Fetch Helper -----------------------------------------------------------

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), ...init });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${res.statusText} — ${body}`);
  }
  return res.json() as Promise<T>;
}

function get<T>(url: string): Promise<T> {
  return request<T>(url);
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del<T>(url: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return request<T>(`${url}${qs}`, { method: "DELETE" });
}

// -- Cards ------------------------------------------------------------------

export function getCards(): Promise<CardsResponse> {
  return get<CardsResponse>("/api/cards");
}

export function getCard(id: string): Promise<Card> {
  return get<Card>(`/api/cards/${encodeURIComponent(id)}`);
}

export function getCardTrends(id: string): Promise<CardTrendsResponse> {
  return get<CardTrendsResponse>(`/api/cards/${encodeURIComponent(id)}/trends`);
}

// -- Prices -----------------------------------------------------------------

export function getPrices(
  cardId: string,
  opts?: { variant?: string; source?: string; days?: number },
): Promise<PricesResponse> {
  const params = new URLSearchParams();
  if (opts?.variant) params.set("variant", opts.variant);
  if (opts?.source) params.set("source", opts.source);
  if (opts?.days !== undefined) params.set("days", String(opts.days));
  const qs = params.toString();
  return get<PricesResponse>(
    `/api/prices/${encodeURIComponent(cardId)}${qs ? `?${qs}` : ""}`,
  );
}

// -- Search -----------------------------------------------------------------

export function searchCards(
  query: string,
  limit?: number,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (limit !== undefined) params.set("limit", String(limit));
  return get<SearchResponse>(`/api/search?${params.toString()}`);
}

// -- Watchlist --------------------------------------------------------------

export function getWatchlist(): Promise<WatchlistResponse> {
  return get<WatchlistResponse>("/api/watchlist");
}

export function addToWatchlist(body: {
  card_id?: string;
  card_name?: string;
}): Promise<StatusResponse> {
  return post<StatusResponse>("/api/watchlist", body);
}

export function removeFromWatchlist(params: {
  card_id?: string;
  card_name?: string;
}): Promise<StatusResponse> {
  const qs: Record<string, string> = {};
  if (params.card_id) qs.card_id = params.card_id;
  if (params.card_name) qs.card_name = params.card_name;
  return del<StatusResponse>("/api/watchlist", qs);
}

// -- Alerts -----------------------------------------------------------------

export function getAlerts(): Promise<AlertsResponse> {
  return get<AlertsResponse>("/api/alerts");
}

export function getAlertsConfig(): Promise<AlertsConfigResponse> {
  return get<AlertsConfigResponse>("/api/alerts/config");
}

export function addAlert(body: {
  card_id: string;
  card_name?: string;
  condition: string;
  value: number;
}): Promise<StatusResponse> {
  return post<StatusResponse>("/api/alerts", body);
}

export function removeAlert(alertId: string): Promise<StatusResponse> {
  return del<StatusResponse>("/api/alerts", { alert_id: alertId });
}

// -- Signal Rules -----------------------------------------------------------

export function getSignalRules(): Promise<SignalRulesResponse> {
  return get<SignalRulesResponse>("/api/signal-rules");
}

export function updateSignalRule(body: {
  rule_type: string;
  thresholds: Record<string, number>;
}): Promise<StatusResponse> {
  return patch<StatusResponse>("/api/signal-rules", body);
}

// -- Signal Overrides -------------------------------------------------------

export function getSignalOverrides(): Promise<SignalOverridesResponse> {
  return get<SignalOverridesResponse>("/api/signal-overrides");
}

export function addSignalOverride(body: {
  card_id: string;
  rule_type: string;
  thresholds: Record<string, number>;
}): Promise<StatusResponse> {
  return post<StatusResponse>("/api/signal-overrides", body);
}

export function removeSignalOverride(params: {
  card_id?: string;
  rule_type?: string;
}): Promise<StatusResponse> {
  const qs: Record<string, string> = {};
  if (params.card_id) qs.card_id = params.card_id;
  if (params.rule_type) qs.rule_type = params.rule_type;
  return del<StatusResponse>("/api/signal-overrides", qs);
}

// -- Actions ----------------------------------------------------------------

export function refreshPrices(): Promise<StatusResponse> {
  return post<StatusResponse>("/api/refresh", {});
}

export function recomputeSignals(): Promise<StatusResponse> {
  return post<StatusResponse>("/api/signals/recompute", {});
}
