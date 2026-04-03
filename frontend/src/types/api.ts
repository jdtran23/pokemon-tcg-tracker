// ---------------------------------------------------------------------------
// Pokemon TCG Tracker — API Types
// Mirrors the FastAPI backend response shapes exactly.
// ---------------------------------------------------------------------------

// -- Enums / Unions ---------------------------------------------------------

export type TrendDirection = "rising" | "stable" | "declining";
export type SignalAction = "buy" | "sell" | "hold";

// -- Core Domain Interfaces -------------------------------------------------

export interface LatestPrice {
  variant: string;
  source: string;
  date: string;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
}

export interface CardTrends {
  price_change_7d_pct: number | null;
  price_change_30d_pct: number | null;
  trend: TrendDirection;
}

export interface Card {
  id: string;
  name: string;
  set_id: string;
  set_name: string;
  number: string;
  rarity: string;
  supertype: string;
  image_url: string;
  latest_price: LatestPrice | null;
  trends: CardTrends;
  signal: SignalAction;
  signal_type: string;
  signal_reason: string;
  contributing_factors: string[];
}

export interface PriceSnapshot {
  date: string;
  variant: string;
  source: string;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
  avg_7: number | null;
  avg_30: number | null;
}

export interface SearchResult {
  id: string;
  name: string;
  set_id: string;
  set_name: string;
  image_url: string | null;
}

export interface Alert {
  id: string;
  card_id: string;
  card_name: string;
  condition: string;
  value: number;
  enabled: boolean;
}

export interface AlertConfig extends Alert {
  triggered: boolean;
}

export interface AlertsConfigResponse {
  alerts: AlertConfig[];
}

export interface SignalRule {
  type: string;
  signal: string;
  condition: string;
  thresholds: Record<string, number>;
}

export interface SignalOverride {
  card_id: string;
  rule_type: string;
  thresholds: Record<string, number>;
}

// -- API Response Wrappers --------------------------------------------------

export interface CardsResponse {
  cards: Card[];
}

export interface PricesResponse {
  card_id: string;
  prices: PriceSnapshot[];
}

export interface SearchResponse {
  cards: SearchResult[];
}

export interface WatchlistResponse {
  card_ids: string[];
  card_names: string[];
}

export interface AlertsResponse {
  alerts: Alert[];
}

export interface SignalRulesResponse {
  rules: SignalRule[];
  default_signal: string;
  default_signal_type: string;
}

export interface SignalOverridesResponse {
  overrides: SignalOverride[];
}

export interface CardTrendsResponse {
  card_id: string;
  price_change_7d_pct: number | null;
  price_change_30d_pct: number | null;
  trend: TrendDirection;
}

export interface StatusResponse {
  status: string;
  [key: string]: unknown;
}
